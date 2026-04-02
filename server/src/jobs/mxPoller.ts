/**
 * MXPoller — background cron job that polls Google DNS for MX record propagation.
 *
 * Runs every 15 minutes for all clients with status `pending_mx`.
 * On MX match: sets mx_verified = true, mx_verified_at = now(), status = active,
 * then calls sendActivationNotifications.
 * On DNS error: logs and continues without status change.
 *
 * Requirements: 14.1–14.6
 */
import cron from 'node-cron';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { ProvisioningEngine } from '../services/provisioning';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MxRecord {
  priority: number;
  exchange: string;
}

interface PendingMxClient {
  id: string;
  domain: string;
  company_name: string;
  plan: string;
  status: string;
  domain_owned: boolean;
  mx_verified: boolean;
  mx_verified_at: string | null;
  previous_email_provider: string | null;
  paynow_reference: string | null;
  physical_address: string | null;
  profiles: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Queries Google DNS API for MX records of a domain.
 * Requirements: 14.2
 */
export async function queryGoogleDns(domain: string): Promise<MxRecord[]> {
  const url = `https://dns.google/resolve?name=${domain}&type=MX`;
  const res = await fetch(url);
  const data = await res.json() as { Answer?: Array<{ data: string }> };
  return (data.Answer ?? []).map((r) => {
    const [priority, exchange] = r.data.split(' ');
    return { priority: Number(priority), exchange };
  });
}

/**
 * Fetches all clients with status `pending_mx`.
 * Requirements: 14.1
 */
async function getPendingMxClients(): Promise<PendingMxClient[]> {
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select(
      'id, domain, company_name, plan, status, domain_owned, mx_verified, mx_verified_at, previous_email_provider, paynow_reference, physical_address, profiles(full_name, phone)'
    )
    .eq('status', 'pending_mx');

  if (error) {
    console.error('[MXPoller] Failed to fetch pending_mx clients:', error.message);
    return [];
  }

  return (data ?? []) as PendingMxClient[];
}

/**
 * Updates client mx_verified, mx_verified_at, and status to active.
 * Requirements: 14.3, 14.4
 */
async function updateClientMxVerified(clientId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('clients')
    .update({
      mx_verified: true,
      mx_verified_at: new Date().toISOString(),
      status: 'active',
    })
    .eq('id', clientId);

  if (error) {
    throw new Error(`Failed to update mx_verified for client ${clientId}: ${error.message}`);
  }
}

/**
 * Checks MX records for a single client and updates if verified.
 * Requirements: 14.2–14.6
 */
export async function checkAndUpdateMx(client: PendingMxClient): Promise<void> {
  try {
    const mxRecords = await queryGoogleDns(client.domain);
    const mailcowHost = process.env.MAILCOW_HOST ?? '';
    const verified = mxRecords.some((r) => mailcowHost !== '' && r.exchange.includes(mailcowHost));

    if (verified) {
      // Requirements: 14.3, 14.4
      await updateClientMxVerified(client.id);

      // Requirements: 14.5 — send welcome email + WhatsApp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ProvisioningEngine.sendActivationNotifications(client as any);
    }
  } catch (err) {
    // Requirements: 14.6 — log error, no status change, retry next interval
    console.error(`[MXPoller] clientId=${client.id} domain=${client.domain} error:`, err);
  }
}

/**
 * Starts the MX poller cron job (every 15 minutes).
 * Exported for testability and wiring into index.ts.
 * Requirements: 14.1
 */
export function startMxPoller(): void {
  cron.schedule('*/15 * * * *', async () => {
    const pendingClients = await getPendingMxClients();
    for (const client of pendingClients) {
      await checkAndUpdateMx(client);
    }
  });
  console.log('[MXPoller] Scheduled — runs every 15 minutes');
}
