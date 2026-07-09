import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { CloudflareService } from './cloudflare';
import { buildRelayLine, buildSesSpfRecord, getSesRelayConfig } from '../lib/sesRelay';

const execFileAsync = promisify(execFile);

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

interface AwsRequest {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
}

function logRelay(level: 'info' | 'warn' | 'error', event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level, event, service: 'sesRelay', ...data }));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Throttling|TooManyRequests|Rate|Timeout|ETIMEDOUT|ECONNRESET|fetch failed|5\d\d/.test(message);
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === 3 || !isTransientError(error)) break;
      const delayMs = 250 * 2 ** (attempt - 1);
      logRelay('warn', 'retrying_transient_error', { label, attempt, delayMs, error: error instanceof Error ? error.message : String(error) });
      await sleep(delayMs);
    }
  }
  throw lastError;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac('sha256', key).update(value, 'utf8').digest();
}

function getAwsCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set for SES relay provisioning');
  }

  return { accessKeyId, secretAccessKey, sessionToken };
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function signSesRequest({ method, path, body }: AwsRequest) {
  const { region } = getSesRelayConfig();
  const { accessKeyId, secretAccessKey, sessionToken } = getAwsCredentials();
  const service = 'ses';
  const host = `email.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const payload = body ? JSON.stringify(body) : '';
  const payloadHash = sha256(payload);
  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  if (payload) headers['content-type'] = 'application/json';
  if (sessionToken) headers['x-amz-security-token'] = sessionToken;

  const signedHeaderKeys = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderKeys.map((key) => `${key}:${headers[key]}\n`).join('');
  const signedHeaders = signedHeaderKeys.join(';');
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n');
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

  return {
    url: `https://${host}${path}`,
    body: payload || undefined,
    headers: {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

async function sesFetch<T>(request: AwsRequest): Promise<T> {
  const signed = signSesRequest(request);
  const response = await fetch(signed.url, {
    method: request.method,
    headers: signed.headers,
    body: signed.body,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = data?.message || data?.Message || text || `SES request failed with ${response.status}`;
    throw new Error(`${response.status} ${message}`);
  }

  return data as T;
}

async function createEmailIdentity(domain: string) {
  return withRetry('ses_create_email_identity', async () => sesFetch<any>({
    method: 'POST',
    path: '/v2/email/identities',
    body: { EmailIdentity: domain },
  }));
}

async function getEmailIdentity(domain: string) {
  return withRetry('ses_get_email_identity', async () => sesFetch<any>({
    method: 'GET',
    path: `/v2/email/identities/${encodeURIComponent(domain)}`,
  }));
}

function buildDkimRecords(domain: string, tokens: string[]): ManualDnsRecord[] {
  return tokens.map((token) => ({
    type: 'CNAME',
    name: `${token}._domainkey.${domain}`,
    value: `${token}.dkim.amazonses.com`,
    purpose: 'Amazon SES DKIM verification',
  }));
}

function buildSpfRecord(domain: string): ManualDnsRecord {
  const raw = process.env.MAILCOW_HOST ?? 'mail.example.com';
  const mailcowHost = raw.replace(/^https?:\/\//, '');
  return {
    type: 'TXT',
    name: domain,
    value: buildSesSpfRecord(mailcowHost),
    purpose: 'Authorize Mailcow and Amazon SES as outbound senders',
  };
}

function getDkimTokens(identity: any): string[] {
  return identity?.DkimAttributes?.Tokens ?? identity?.DkimAttributes?.tokens ?? [];
}

function getVerificationStatus(identity: any): string {
  return identity?.VerificationStatus ?? identity?.verificationStatus ?? 'PENDING';
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
  const zone = await withRetry('cloudflare_find_zone', () => CloudflareService.findZoneByName(client.domain));
  return zone?.id ?? null;
}

async function applyCloudflareDns(zoneId: string, records: ManualDnsRecord[]) {
  for (const record of records) {
    await withRetry('cloudflare_add_relay_record', () => CloudflareService.upsertDnsRecord(zoneId, {
      type: record.type,
      name: record.name,
      content: record.value,
      ttl: 3600,
    }));
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function upsertPostfixRelayLine(domain: string, relayLine: string) {
  if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error(`Invalid domain for relay map: ${domain}`);
  const { postfixContainerName, relayMapPath } = getSesRelayConfig();
  const quotedPath = shellQuote(relayMapPath);
  const quotedTmp = shellQuote(`${relayMapPath}.tmp`);
  const quotedPattern = shellQuote(`^@${domain}[[:space:]]`);
  const quotedLine = shellQuote(relayLine);
  const script = [
    `touch ${quotedPath}`,
    `grep -v ${quotedPattern} ${quotedPath} > ${quotedTmp}`,
    `printf '%s\\n' ${quotedLine} >> ${quotedTmp}`,
    `mv ${quotedTmp} ${quotedPath}`,
    `postmap ${quotedPath}`,
    'postfix reload',
  ].join(' && ');

  await execFileAsync('docker', ['exec', postfixContainerName, 'sh', '-lc', script]);
}

async function waitForVerification(domain: string, attempts = 20): Promise<any> {
  let identity = await getEmailIdentity(domain);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const status = getVerificationStatus(identity);
    if (status === 'SUCCESS') return identity;
    if (status === 'FAILED') throw new Error(`SES identity verification failed for ${domain}`);
    await sleep(15000);
    identity = await getEmailIdentity(domain);
  }
  return identity;
}

export async function checkRelayVerification(clientId: string): Promise<RelayProvisioningResult> {
  const client = await fetchClient(clientId);
  const identity = await getEmailIdentity(client.domain);
  const tokens = getDkimTokens(identity);
  const status = getVerificationStatus(identity);
  const relayLine = buildRelayLine(client.domain);
  const isVerified = status === 'SUCCESS';

  await updateClientRelay(client.id, {
    dkim_tokens: tokens,
    relay_verification_status: isVerified ? 'verified' : 'pending',
    relay_verified_at: isVerified ? new Date().toISOString() : null,
    relay_line: relayLine,
    relay_error_message: null,
  });

  return {
    domain: client.domain,
    status: isVerified ? 'verified' : 'pending',
    dnsManagedByUs: !!client.cloudflare_zone_id,
    manualDnsRecords: [...buildDkimRecords(client.domain, tokens), buildSpfRecord(client.domain)],
    relayLine,
    dkimTokens: tokens,
    verificationStatus: status,
  };
}

export async function provisionTenantDomain(clientId: string): Promise<RelayProvisioningResult> {
  const client = await fetchClient(clientId);
  const relayLine = buildRelayLine(client.domain);

  if (client.relay_verification_status === 'verified') {
    logRelay('info', 'relay_already_verified_noop', { clientId, domain: client.domain });
    return checkRelayVerification(clientId);
  }

  try {
    logRelay('info', 'relay_provisioning_started', { clientId, domain: client.domain });
    await createEmailIdentity(client.domain).catch((error) => {
      if (!String(error instanceof Error ? error.message : error).includes('AlreadyExists')) throw error;
    });

    const identity = await getEmailIdentity(client.domain);
    const tokens = getDkimTokens(identity);
    const records = [...buildDkimRecords(client.domain, tokens), buildSpfRecord(client.domain)];
    const zoneId = await resolveCloudflareZoneId(client);
    const dnsManagedByUs = !!zoneId;

    if (zoneId) {
      await applyCloudflareDns(zoneId, records);
    }

    await updateClientRelay(client.id, {
      dkim_tokens: tokens,
      relay_verification_status: 'pending',
      relay_line: relayLine,
      dns_managed_by_us: dnsManagedByUs,
      relay_error_message: null,
    });

    const verifiedIdentity = await waitForVerification(client.domain);
    const verificationStatus = getVerificationStatus(verifiedIdentity);
    const isVerified = verificationStatus === 'SUCCESS';

    if (isVerified) {
      await upsertPostfixRelayLine(client.domain, relayLine);
    }

    await updateClientRelay(client.id, {
      relay_verification_status: isVerified ? 'verified' : 'pending',
      relay_verified_at: isVerified ? new Date().toISOString() : null,
      relay_line: relayLine,
      dns_managed_by_us: dnsManagedByUs,
      relay_error_message: null,
    });

    logRelay('info', 'relay_provisioning_finished', { clientId, domain: client.domain, verificationStatus, dnsManagedByUs });
    return {
      domain: client.domain,
      status: isVerified ? 'verified' : 'pending',
      dnsManagedByUs,
      manualDnsRecords: dnsManagedByUs ? [] : records,
      relayLine,
      dkimTokens: tokens,
      verificationStatus,
    };
  } catch (error) {
    await markFailed(client.id, error);
    logRelay('error', 'relay_provisioning_failed', { clientId, domain: client.domain, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export const SesRelayService = { provisionTenantDomain, checkRelayVerification };
