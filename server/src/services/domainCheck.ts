import dns from 'dns/promises';

export class WhoisUnavailableError extends Error {
  code = 'WHOIS_UNAVAILABLE';

  constructor(message = 'WhoisJSON API unavailable') {
    super(message);
    this.name = 'WhoisUnavailableError';
  }
}

interface CacheEntry {
  available: boolean;
  cachedAt: number;
}

const CACHE_TTL = 60_000;
const cache = new Map<string, CacheEntry>();

// Domains whose TLD registry isn't supported by whoisjson.com — use DNS fallback
const DNS_FALLBACK_TLDS = ['.co.zw', '.zw'];

async function checkViaDns(domain: string): Promise<boolean> {
  try {
    await dns.resolve(domain, 'A');
    return false; // has A records → taken
  } catch {
    try {
      await dns.resolve(domain, 'NS');
      return false; // has NS records → taken
    } catch {
      return true; // no DNS records → likely available
    }
  }
}

async function checkAvailability(
  name: string,
  tld: string
): Promise<{ domain: string; available: boolean }> {
  const domain = `${name}${tld}`;
  const now = Date.now();

  const cached = cache.get(domain);
  if (cached && now - cached.cachedAt < CACHE_TTL) {
    return { domain, available: cached.available };
  }

  let available: boolean;

  if (DNS_FALLBACK_TLDS.some((t) => domain.endsWith(t))) {
    // Use DNS lookup for .co.zw — whoisjson.com doesn't support this TLD
    try {
      available = await checkViaDns(domain);
    } catch {
      throw new WhoisUnavailableError('DNS lookup failed');
    }
  } else {
    const apiKey = process.env.WHOISJSON_API_KEY ?? '';
    try {
      const response = await fetch(
        `https://whoisjson.com/api/v1/whois?domain=${encodeURIComponent(domain)}`,
        {
          headers: { Authorization: `TOKEN=${apiKey}` },
        }
      );

      if (response.status === 404) {
        // 404 means domain not found in registry → available
        cache.set(domain, { available: true, cachedAt: now });
        return { domain, available: true };
      }

      if (!response.ok) {
        throw new WhoisUnavailableError(`WhoisJSON returned ${response.status}`);
      }

      const data = (await response.json()) as { registered?: boolean };
      available = data?.registered === false;
    } catch (err) {
      if (err instanceof WhoisUnavailableError) throw err;
      throw new WhoisUnavailableError('Network error contacting WhoisJSON');
    }
  }

  cache.set(domain, { available, cachedAt: now });
  return { domain, available };
}

export const domainCheckService = { checkAvailability };
