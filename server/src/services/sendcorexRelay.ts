import { supabaseAdmin } from '../lib/supabaseAdmin';
import { CloudflareService } from './cloudflare';
import { mailcowService } from './mailcow';
import { buildSendcorexRelayLine, buildSendcorexSpfRecord, getSendcorexRelayConfig, addDomainToSendcorex, getDomainFromSendcorex, SendcorexDomainResponse } from '../lib/sendcorexRelay';

type RelayStatus = 'pending' | 'verified' | 'failed';

export interface ManualDnsRecord {
  type: 'CNAME' | 'TXT';
  name: string;
  value: string;
  purpose: string;
}

export interface RelayProvisioningResult {
  domain: string;
  status: RelayStatus;
  dnsManagedByUs: boolean;
  manualDnsRecords: ManualDnsRecord[];
  relayLine: string;
  dkimTokens: string[];
  verificationStatus?: string;
}

interface ClientRelayRecord {
  id: string;
  domain: string;
  cloudflare_zone_id: string | null;
  relay_verification_status: RelayStatus | null;
}

function logRelay(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level, event, service: 'sendcorexRelay', ...data }));
}

async function fetchClient(clientId: string): Promise<ClientRelayRecord> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select('id, domain, cloudflare_zone_id, relay_verification_status')
    .eq('id', clientId)
    .single();

  if (error || !data) {
    throw new Error(`Client not found: ${error?.message ?? clientId}`);
  }

  return data as ClientRelayRecord;
}

async function updateClientRelay(clientId: string, values: Record<string, unknown>) {
  const { error } = await supabaseAdmin
    .from('clients')
    .update(values)
    .eq('id', clientId);

  if (error) throw new Error(`Failed to update relay status: ${error.message}`);
}

async function markFailed(clientId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await updateClientRelay(clientId, {
    relay_verification_status: 'failed',
    relay_error_message: message,
  }).catch((updateError) => {
    logRelay('error', 'failed_to_persist_relay_failure', { clientId, error: updateError instanceof Error ? updateError.message : String(updateError) });
  });
}

async function resolveCloudflareZoneId(client: ClientRelayRecord): Promise<string | null> {
  if (client.cloudflare_zone_id) return client.cloudflare_zone_id;
  const zone = await CloudflareService.findZoneByName(client.domain);
  return zone?.id ?? null;
}

async function applyCloudflareDns(zoneId: string, records: ManualDnsRecord[]) {
  for (const record of records) {
    await CloudflareService.upsertDnsRecord(zoneId, {
      type: record.type,
      name: record.name,
      content: record.value,
      ttl: 3600,
    });
  }
}

function buildSpfRecord(domain: string): ManualDnsRecord {
  const raw = process.env.MAILCOW_HOST ?? 'mail.example.com';
  const mailcowHost = raw.replace(/^https?:\/\//, '');
  return {
    type: 'TXT',
    name: domain,
    value: buildSendcorexSpfRecord(mailcowHost),
    purpose: 'Authorize Mailcow and Sendcorex as outbound senders',
  };
}

function mapSendcorexDns(apiRecords: NonNullable<SendcorexDomainResponse['domain']>['dnsRecords']): ManualDnsRecord[] {
  const manualRecords: ManualDnsRecord[] = [];
  if (apiRecords.spf) {
    manualRecords.push({ type: 'TXT', name: apiRecords.spf.host, value: `"${apiRecords.spf.value}"`, purpose: 'Authorize Sendcorex outbound' });
  }
  if (apiRecords.dkim) {
    manualRecords.push({ type: 'TXT', name: apiRecords.dkim.host, value: `"${apiRecords.dkim.value}"`, purpose: 'Sendcorex DKIM signature' });
  }
  if (apiRecords.returnPath) {
    manualRecords.push({ type: 'CNAME', name: apiRecords.returnPath.host, value: apiRecords.returnPath.value, purpose: 'Sendcorex bounce routing' });
  }
  if (apiRecords.dmarc) {
    manualRecords.push({ type: 'TXT', name: apiRecords.dmarc.host, value: `"${apiRecords.dmarc.value}"`, purpose: 'DMARC Policy' });
  }
  // Ignore MX to preserve Mailcow inbound routing
  return manualRecords;
}



export async function checkRelayVerification(clientId: string): Promise<RelayProvisioningResult> {
  const client = await fetchClient(clientId);
  const relayLine = buildSendcorexRelayLine(client.domain);
  
  let isVerified = false;
  let manualDnsRecords: ManualDnsRecord[] = [buildSpfRecord(client.domain)];
  
  try {
    const scDomain = await getDomainFromSendcorex(client.domain);
    if (scDomain.success && scDomain.domain) {
      isVerified = scDomain.domain.validated;
      manualDnsRecords = mapSendcorexDns(scDomain.domain.dnsRecords);
    }
  } catch (err) {
    logRelay('warn', 'sendcorex_api_fetch_failed', { clientId, domain: client.domain, error: err instanceof Error ? err.message : String(err) });
  }

  await updateClientRelay(client.id, {
    relay_verification_status: isVerified ? 'verified' : 'pending',
    relay_line: relayLine,
    relay_error_message: null,
  });

  return {
    domain: client.domain,
    status: isVerified ? 'verified' : 'pending',
    dnsManagedByUs: !!client.cloudflare_zone_id,
    manualDnsRecords,
    relayLine,
    dkimTokens: [],
    verificationStatus: isVerified ? 'SUCCESS' : 'PENDING',
  };
}

export async function provisionTenantDomain(clientId: string): Promise<RelayProvisioningResult> {
  const client = await fetchClient(clientId);
  const relayLine = buildSendcorexRelayLine(client.domain);

  if (client.relay_verification_status === 'verified') {
    logRelay('info', 'relay_already_verified_noop', { clientId, domain: client.domain });
    return checkRelayVerification(clientId);
  }

  try {
    logRelay('info', 'relay_provisioning_started', { clientId, domain: client.domain });
    
    // Add domain to Sendcorex
    let manualDnsRecords: ManualDnsRecord[] = [buildSpfRecord(client.domain)];
    try {
      let scDomain = await getDomainFromSendcorex(client.domain);
      if (!scDomain.success || scDomain.error === "DOMAIN_NOT_FOUND") {
        scDomain = await addDomainToSendcorex(client.domain);
      }
      if (scDomain.success && scDomain.domain) {
        manualDnsRecords = mapSendcorexDns(scDomain.domain.dnsRecords);
      }
    } catch (err) {
      logRelay('error', 'sendcorex_api_add_failed', { clientId, error: err instanceof Error ? err.message : String(err) });
      throw new Error('Failed to register domain on Sendcorex API');
    }

    const zoneId = await resolveCloudflareZoneId(client);
    const dnsManagedByUs = !!zoneId;

    if (zoneId) {
      await applyCloudflareDns(zoneId, manualDnsRecords);
    }

    const config = getSendcorexRelayConfig();
    const relayhostName = `${config.smtpHost}:${config.smtpPort}`;

    let relayhosts = await mailcowService.getRelayhosts();
    let relay = relayhosts.find(r => r.hostname === relayhostName);

    if (!relay) {
      await mailcowService.addRelayhost({
        hostname: relayhostName,
        username: config.smtpUsername || config.apiKey,
        password: config.smtpPassword || config.apiKey,
        active: 1
      });
      relayhosts = await mailcowService.getRelayhosts();
      relay = relayhosts.find(r => r.hostname === relayhostName);
    }

    if (!relay) {
      throw new Error(`Failed to create or find relayhost ${relayhostName} in Mailcow`);
    }

    await mailcowService.setDomainRelayhost(client.domain, relay.id);

    await updateClientRelay(client.id, {
      relay_verification_status: 'verified',
      relay_line: relayLine,
      dns_managed_by_us: dnsManagedByUs,
      relay_error_message: null,
      relay_verified_at: new Date().toISOString(),
    });

    logRelay('info', 'relay_provisioning_finished', { clientId, domain: client.domain, dnsManagedByUs });
    return {
      domain: client.domain,
      status: 'verified',
      dnsManagedByUs,
      manualDnsRecords: dnsManagedByUs ? [] : manualDnsRecords,
      relayLine,
      dkimTokens: [],
      verificationStatus: 'SUCCESS',
    };
  } catch (error) {
    await markFailed(client.id, error);
    logRelay('error', 'relay_provisioning_failed', { clientId, domain: client.domain, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export const SendcorexRelayService = { provisionTenantDomain, checkRelayVerification };
