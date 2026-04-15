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
  const visited = new Set<string>();
  const toVisit = [website];
  const maxPages = 3;
  
  // Clean URL helper
  const cleanUrl = (url: string, base: string) => {
    try {
      const u = new URL(url, base);
      return u.origin === new URL(base).origin ? u.href : null;
    } catch { return null; }
  };

  try {
    for (let i = 0; i < toVisit.length && visited.size < maxPages; i++) {
      const url = toVisit[i];
      if (visited.has(url)) continue;
      visited.add(url);

      const res = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Mozilla/5.0 ZeeMailCrawler/1.0' } });
      if (!res.ok) continue;
      const html = await res.text();
      
      // 1. Find emails
      const matches = html.match(/[a-zA-Z0-9._%+-]+@(?!(?:png|jpg|jpeg|gif|webp|svg|pdf|zip)$)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
      if (matches) {
        const email = matches.find((e) => !e.toLowerCase().includes('.png') && !e.toLowerCase().includes('.jpg'));
        if (email) return email.toLowerCase();
      }

      // 2. If it's the first page, look for 'Contact' or 'About' links to follow
      if (visited.size === 1) {
        const linkMatches = html.matchAll(/href="([^"]+)"/g);
        for (const match of linkMatches) {
          const href = match[1].toLowerCase();
          if (href.includes('contact') || href.includes('about') || href.includes('reach-us')) {
            const absolute = cleanUrl(match[1], website);
            if (absolute && !visited.has(absolute)) toVisit.push(absolute);
          }
        }
      }
    }
  } catch (err) {
    console.error('Deep scrape failed:', err);
  }
  return null;
}
