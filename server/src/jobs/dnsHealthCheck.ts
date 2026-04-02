import cron from 'node-cron';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { mailcowService } from '../services/mailcow';
// Unused import removed

const getMailcowHost = () => {
  const raw = process.env.MAILCOW_HOST ?? 'mail.example.com';
  return raw.replace(/^https?:\/\//, '');
};

const REQUIRED_RECORDS = async (domain: string, mailcowHost: string) => {
  let hasDkim = false;
  try {
    const dkim = await mailcowService.getDkim(domain);
    hasDkim = !!dkim;
  } catch (err) {
    console.warn(`Could not check DKIM internally for ${domain}`, err);
  }

  return [
    {
      name: 'MX',
      check: async () => {
        try {
          const res = await fetch(`https://dns.google/resolve?name=${domain}&type=MX`);
          const data = await res.json();
          const records = data.Answer?.map((r: any) => r.data) || [];
          return records.some((r: string) => r.includes(mailcowHost));
        } catch { return false; }
      }
    },
    {
      name: 'SPF',
      check: async () => {
        try {
          const res = await fetch(`https://dns.google/resolve?name=${domain}&type=TXT`);
          const data = await res.json();
          const records = data.Answer?.map((r: any) => r.data) || [];
          return records.some((r: string) => r.includes('v=spf1') && r.includes(mailcowHost));
        } catch { return false; }
      }
    },
    {
      name: 'DKIM',
      check: async () => {
        if (!hasDkim) return true; // If Mailcow doesn't even have it, don't fail DNS for it yet
        try {
          const res = await fetch(`https://dns.google/resolve?name=dkim._domainkey.${domain}&type=TXT`);
          const data = await res.json();
          return (data.Answer?.length || 0) > 0;
        } catch { return false; }
      }
    },
    {
      name: 'DMARC',
      check: async () => {
        try {
          const res = await fetch(`https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`);
          const data = await res.json();
          const records = data.Answer?.map((r: any) => r.data) || [];
          return records.some((r: string) => r.includes('v=DMARC1'));
        } catch { return false; }
      }
    }
  ];
};

export const runSingleHealthCheck = async (client: any) => {
  const host = getMailcowHost();
  const checks = await REQUIRED_RECORDS(client.domain, host);
  const results: Record<string, boolean> = {};
  let allPassing = true;

  for (const check of checks) {
    const passing = await check.check();
    results[check.name] = passing;
    if (!passing) allPassing = false;
  }

  // Save results to Supabase
  await supabaseAdmin
    .from('clients')
    .update({
      dns_status: allPassing ? 'healthy' : 'issues',
      dns_check_results: results,
      dns_last_checked: new Date().toISOString()
    })
    .eq('id', client.id);

  return { allPassing, results };
};

export function startDnsHealthCheckJob() {
  console.log('[Jobs] Starting DNS health check cron...');
  // Runs every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('[Jobs] Running scheduled DNS health check for all active clients');
    const { data: clients, error } = await supabaseAdmin
      .from('clients')
      .select('id, domain, email, full_name, plan')
      .in('status', ['active', 'pending_mx']);

    if (error || !clients) {
      console.error('[Jobs] Failed to fetch active clients:', error);
      return;
    }

    for (const client of clients) {
      await runSingleHealthCheck(client);
    }
  });
}
