/**
 * ProvisioningEngine — orchestrates the full provisioning sequence for both
 * Path A (new domain) and Path B (existing domain) clients.
 *
 * Path A: Cloudflare zone → MX record → SPF record → Mailcow domain →
 *         create mailboxes → set status `active` → send welcome email → send WhatsApp
 *
 * Path B: Mailcow domain → create mailboxes → set status `pending_mx` →
 *         send DNS instructions → send WhatsApp
 *
 * Requirements: 11.1–11.9, 12.1–12.6, 13.1–13.5
 */
import crypto from 'crypto';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { CloudflareService } from './cloudflare';
import { mailcowService } from './mailcow';
import { ResendService, type ResendClient, type MailboxCredential } from './resend';
import type { Plan } from '../types/index';

// ---------------------------------------------------------------------------
// Plan mailbox definitions (Requirements 13.1–13.3)
// ---------------------------------------------------------------------------

const PLAN_MAILBOXES: Record<Plan, Array<{ localPart: string; quotaMb: number }>> = {
  starter: [{ localPart: 'info', quotaMb: 500 }],
  business: [
    { localPart: 'info', quotaMb: 1024 },
    { localPart: 'admin', quotaMb: 1024 },
    { localPart: 'sales', quotaMb: 1024 },
    { localPart: 'support', quotaMb: 1024 },
    { localPart: 'accounts', quotaMb: 1024 },
  ],
  pro: [
    { localPart: 'info', quotaMb: 2048 },
    { localPart: 'admin', quotaMb: 2048 },
    { localPart: 'sales', quotaMb: 2048 },
    { localPart: 'support', quotaMb: 2048 },
    { localPart: 'accounts', quotaMb: 2048 },
    { localPart: 'hr', quotaMb: 2048 },
    { localPart: 'ceo', quotaMb: 2048 },
    { localPart: 'finance', quotaMb: 2048 },
    { localPart: 'marketing', quotaMb: 2048 },
    { localPart: 'ops', quotaMb: 2048 },
  ],
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ClientRecord {
  id: string;
  domain: string;
  plan: Plan;
  domain_owned: boolean;
  company_name: string;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  mx_verified: boolean;
  mx_verified_at: string | null;
  previous_email_provider: string | null;
  paynow_reference: string | null;
  physical_address: string | null;
  name_servers?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates a cryptographically random password of at least 16 characters.
 * Uses base64url encoding to keep it URL-safe and human-readable.
 * Requirements: 13.4
 */
export function generatePassword(): string {
  // 12 random bytes → 16 base64 chars (ceil(12 * 4/3) = 16)
  return crypto.randomBytes(16).toString('base64url');
}

async function fetchClient(clientId: string): Promise<ClientRecord> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select(
      'id, domain, plan, domain_owned, company_name, full_name, email, phone, status, mx_verified, mx_verified_at, previous_email_provider, paynow_reference, physical_address, name_servers'
    )
    .eq('id', clientId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch client ${clientId}: ${error?.message ?? 'not found'}`);
  }

  return data as ClientRecord;
}

async function setClientStatus(clientId: string, status: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('clients')
    .update({ status })
    .eq('id', clientId);

  if (error) {
    throw new Error(`Failed to set status '${status}' for client ${clientId}: ${error.message}`);
  }
}

async function setProvisioningError(clientId: string, step: string, err: unknown): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[ProvisioningEngine] clientId=${clientId} step=${step} error=${message}`);
  try {
    await supabaseAdmin
      .from('clients')
      .update({ status: 'provisioning_error' })
      .eq('id', clientId);
  } catch (updateErr) {
    console.error(
      `[ProvisioningEngine] clientId=${clientId} failed to set provisioning_error: ${updateErr}`
    );
  }
}

/**
 * Creates all mailboxes for the given plan in Mailcow and stores them in Supabase.
 * Returns the list of credentials for use in notifications.
 */
async function createMailboxes(
  client: ClientRecord
): Promise<MailboxCredential[]> {
  const definitions = PLAN_MAILBOXES[client.plan];
  const credentials: MailboxCredential[] = [];

  for (const def of definitions) {
    const password = generatePassword();
    const address = `${def.localPart}@${client.domain}`;

    // Create in Mailcow
    await mailcowService.addMailbox({
      local_part: def.localPart,
      domain: client.domain,
      password,
      password2: password,
      quota: def.quotaMb,
      active: 1,
      force_pw_update: 0,
    });

    // Store in Supabase mailboxes table (Requirements 13.5)
    const { error } = await supabaseAdmin.from('mailboxes').insert({
      client_id: client.id,
      email: address,
      quota_mb: def.quotaMb,
      status: 'active',
    });

    if (error) {
      throw new Error(`Failed to store mailbox ${address}: ${error.message}`);
    }

    credentials.push({
      localPart: def.localPart,
      quotaMb: def.quotaMb,
      password,
      address,
    });
  }

  return credentials;
}

function toResendClient(client: ClientRecord): ResendClient {
  return {
    id: client.id,
    domain: client.domain,
    plan: client.plan,
    company_name: client.company_name,
    full_name: client.full_name,
    email: client.email,
    phone: client.phone,
    status: client.status,
    domain_owned: client.domain_owned,
    mx_verified: client.mx_verified,
    mx_verified_at: client.mx_verified_at,
    previous_email_provider: client.previous_email_provider,
    paynow_reference: client.paynow_reference,
    physical_address: client.physical_address,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sends welcome email to client (and admin) once status is active.
 * Extracted so the MXPoller can reuse it (Requirements 14.5).
 */
async function sendActivationNotifications(
  client: ClientRecord,
  mailboxCredentials?: MailboxCredential[]
): Promise<void> {
  // Fetch credentials from DB if not provided (MXPoller path)
  let credentials = mailboxCredentials;
  if (!credentials) {
    const { data } = await supabaseAdmin
      .from('mailboxes')
      .select('email, quota_mb')
      .eq('client_id', client.id);

    credentials = (data ?? []).map((row: { email: string; quota_mb: number }) => {
      const localPart = row.email.split('@')[0];
      return {
        localPart,
        quotaMb: row.quota_mb,
        password: '(see original welcome email)',
        address: row.email,
      };
    });
  }

  // Send welcome email (Requirements 11.7, 14.5)
  await ResendService.sendWelcomeEmail(toResendClient(client), credentials);

  // Admin and Client WhatsApp notifications have been temporarily disabled.
}

/**
 * Path A provisioning sequence (Requirements 11.1–11.9):
 * Cloudflare zone → MX record → SPF record → Mailcow domain →
 * create mailboxes → set status `active` → send welcome email → send WhatsApp
 */
async function runPathA(clientId: string): Promise<void> {
  let client: ClientRecord;

  try {
    client = await fetchClient(clientId);
  } catch (err) {
    await setProvisioningError(clientId, 'fetch_client', err);
    throw err;
  }

  // Step 1: Create Cloudflare zone (Requirements 11.1)
  let zoneId: string;
  let nameServers: string[] = [];
  try {
    const zone = await CloudflareService.createZone(client.domain);
    zoneId = zone.id;
    nameServers = zone.nameServers;

    // Save nameservers to the database for admin viewing later
    await supabaseAdmin
      .from('clients')
      .update({ name_servers: nameServers, cloudflare_zone_id: zoneId })
      .eq('id', clientId);

  } catch (err) {
    await setProvisioningError(clientId, 'cloudflare_create_zone', err);
    throw err;
  }

  // Step 2: Add domain to Mailcow (Requirements 11.4)
  try {
    await mailcowService.addDomain(client.domain);
  } catch (err) {
    await setProvisioningError(clientId, 'mailcow_add_domain', err);
    throw err;
  }

  // Step 3: Wait briefly and fetch DKIM
  let dkimResult = null;
  try {
    await new Promise(res => setTimeout(res, 2000));
    dkimResult = await mailcowService.getDkim(client.domain);
  } catch (err) {
    console.warn('Failed to fetch DKIM gracefully:', err);
  }

  // Step 4: Add DNS records (MX, SPF, DKIM, DMARC, Autodiscover)
  try {
    const mailcowHostRaw = process.env.MAILCOW_HOST ?? 'mail.example.com';
    const mailcowHost = mailcowHostRaw.replace(/^https?:\/\//, '');

    await CloudflareService.addMxRecord(zoneId, client.domain);
    await CloudflareService.addSpfRecord(zoneId, client.domain);

    if (dkimResult) {
      await CloudflareService.addDnsRecord(zoneId, {
        type: 'TXT',
        name: 'dkim._domainkey',
        content: dkimResult.dkim_txt,
      });
    }

    await CloudflareService.addDnsRecord(zoneId, {
      type: 'TXT',
      name: '_dmarc',
      content: `v=DMARC1; p=none; rua=mailto:postmaster@${client.domain}`,
    });

    await CloudflareService.addDnsRecord(zoneId, {
      type: 'CNAME',
      name: 'autodiscover',
      content: mailcowHost,
    });

    await CloudflareService.addDnsRecord(zoneId, {
      type: 'CNAME',
      name: 'autoconfig',
      content: mailcowHost,
    });
  } catch (err) {
    await setProvisioningError(clientId, 'cloudflare_add_records', err);
    throw err;
  }

  // Step 5: Create mailboxes (Requirements 11.5, 13.1–13.5)
  let credentials: MailboxCredential[];
  try {
    credentials = await createMailboxes(client);
  } catch (err) {
    await setProvisioningError(clientId, 'create_mailboxes', err);
    throw err;
  }

  // Step 6: Set status to active (Requirements 11.6)
  try {
    await setClientStatus(clientId, 'active');
  } catch (err) {
    await setProvisioningError(clientId, 'set_status_active', err);
    throw err;
  }

  // Step 7: Send welcome email (Requirements 11.7)
  try {
    // Refresh client to get updated status
    client = await fetchClient(clientId);

    await sendActivationNotifications(client, credentials);
  } catch (err) {
    await setProvisioningError(clientId, 'send_notifications', err);
    throw err;
  }
}

/**
 * Path B provisioning sequence (Requirements 12.1–12.6):
 * Mailcow domain → create mailboxes → set status `pending_mx` →
 * send DNS instructions → send WhatsApp
 */
async function runPathB(clientId: string): Promise<void> {
  let client: ClientRecord;

  try {
    client = await fetchClient(clientId);
  } catch (err) {
    await setProvisioningError(clientId, 'fetch_client', err);
    throw err;
  }

  // Step 1: Add domain to Mailcow (Requirements 12.1)
  try {
    await mailcowService.addDomain(client.domain);
  } catch (err) {
    await setProvisioningError(clientId, 'mailcow_add_domain', err);
    throw err;
  }

  // Step 2: Create mailboxes (Requirements 12.2, 13.1–13.5)
  try {
    await createMailboxes(client);
  } catch (err) {
    await setProvisioningError(clientId, 'create_mailboxes', err);
    throw err;
  }

  // Step 3: Set status to pending_mx (Requirements 12.3)
  try {
    await setClientStatus(clientId, 'pending_mx');
  } catch (err) {
    await setProvisioningError(clientId, 'set_status_pending_mx', err);
    throw err;
  }

  // Step 4: Send DNS instructions email (Requirements 12.4)
  try {
    client = await fetchClient(clientId);
    await ResendService.sendDnsInstructions(toResendClient(client));
  } catch (err) {
    await setProvisioningError(clientId, 'send_dns_instructions', err);
    throw err;
  }

  // WhatsApp notifications have been temporarily disabled.
}

export const ProvisioningEngine = {
  runPathA,
  runPathB,
  sendActivationNotifications,
  generatePassword,
  PLAN_MAILBOXES,
};
