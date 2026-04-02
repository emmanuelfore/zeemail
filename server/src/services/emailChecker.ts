const UNPROFESSIONAL_PROVIDERS = [
  'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com',
  'hotmail.co.uk', 'outlook.com', 'live.com', 'icloud.com',
  'me.com', 'msn.com', 'ymail.com', 'protonmail.com',
  'mail.com', 'aol.com',
];

const ZW_FREE_PROVIDERS = [
  'webmail.co.zw', 'zol.co.zw', 'telone.co.zw', 'mweb.co.zw',
];

export function checkEmailProfessionalism(email: string) {
  if (!email) return { type: 'unknown', provider: null, isWarmLead: false };
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return { type: 'unknown', provider: null, isWarmLead: false };

  if (UNPROFESSIONAL_PROVIDERS.includes(domain)) {
    return { type: 'unprofessional', provider: domain.split('.')[0], isWarmLead: true };
  }
  if (ZW_FREE_PROVIDERS.includes(domain)) {
    return { type: 'unprofessional', provider: domain, isWarmLead: true };
  }
  return { type: 'professional', provider: 'custom', isWarmLead: false };
}

export async function scrapeEmailFromWebsite(website: string): Promise<string | null> {
  try {
    const res = await fetch(website, { signal: AbortSignal.timeout(5000) });
    const html = await res.text();
    const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (!matches) return null;
    return matches.find((e) => !e.includes('.png') && !e.includes('.jpg')) ?? null;
  } catch {
    return null;
  }
}
