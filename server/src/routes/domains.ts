import { Router, Request, Response, NextFunction } from 'express';
import { domainCheckRateLimiter } from '../middleware/rateLimiter';
import { domainCheckService, WhoisUnavailableError } from '../services/domainCheck';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { mailcowService } from '../services/mailcow';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { Plan } from '../types';

const router = Router();

const MAILBOX_LIMITS: Record<Plan, number> = {
  starter: 1,
  business: 5,
  pro: 10,
};

router.post('/add', auth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { domain, company_name, plan } = req.body as { domain?: string; company_name?: string; plan?: Plan };

  if (!domain || !company_name || !plan || !MAILBOX_LIMITS[plan]) {
    res.status(422).json({ error: 'domain, company_name, and plan are required', code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    await mailcowService.addDomain(domain);

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        company_name,
        domain,
        plan,
        status: 'pending',
        mailbox_limit: MAILBOX_LIMITS[plan],
      })
      .select('id')
      .single();

    if (error) {
      next(error);
      return;
    }

    res.status(201).json({ id: data.id });
  } catch (err) {
    next(err);
  }
});

router.delete('/:domain', auth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { domain } = req.params;

  try {
    await mailcowService.deleteDomain(domain);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

const NAME_REGEX = /^[a-zA-Z0-9-]{3,63}$/;
const VALID_TLDS = ['.co.zw', '.com'];

function generateSuggestions(name: string): string[] {
  const prefixes = ['my', 'get', 'the'];
  const suffixes = ['hq', 'zw', 'online', '1', '2', '24'];
  const suggestions: string[] = [];

  for (const prefix of prefixes) {
    suggestions.push(`${prefix}${name}.co.zw`);
  }
  for (const suffix of suffixes) {
    suggestions.push(`${name}${suffix}.co.zw`);
  }

  return [...new Set(suggestions)];
}

router.get('/suggest', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.query;

  if (typeof name !== 'string' || name.trim().length === 0) {
    res.status(422).json({ error: 'Missing or invalid name parameter', code: 'VALIDATION_ERROR' });
    return;
  }

  const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  const suggestions = generateSuggestions(cleanName);
  res.json({ suggestions });
});

router.get('/check', domainCheckRateLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { name, tld } = req.query;

  if (typeof name !== 'string' || typeof tld !== 'string') {
    res.status(422).json({ error: 'Invalid or missing name/tld parameters', code: 'VALIDATION_ERROR' });
    return;
  }

  // If tld is empty, this is an existing domain verification ('name' contains the full domain)
  if (tld === '') {
    // Basic domain format validation (allows dots)
    const FULL_DOMAIN_REGEX = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!FULL_DOMAIN_REGEX.test(name)) {
      res.status(422).json({ error: 'Invalid domain format', code: 'VALIDATION_ERROR' });
      return;
    }
  } else {
    // New registration search
    if (!NAME_REGEX.test(name) || !VALID_TLDS.includes(tld)) {
      res.status(422).json({ error: 'Invalid or missing name/tld parameters', code: 'VALIDATION_ERROR' });
      return;
    }
  }

  try {
    const result = await domainCheckService.checkAvailability(name, tld);
    res.json(result);
  } catch (err) {
    if (err instanceof WhoisUnavailableError) {
      res.status(503).json({ error: err.message, code: 'WHOIS_UNAVAILABLE' });
      return;
    }
    next(err);
  }
});

interface MxRecord {
  priority: number;
  exchange: string;
}

function detectProvider(mxRecords: MxRecord[]): string | null {
  if (mxRecords.length === 0) return null;
  const exchange = mxRecords[0].exchange.toLowerCase();
  if (exchange.includes('google')) return 'Google Workspace';
  if (exchange.includes('outlook') || exchange.includes('microsoft')) return 'Microsoft 365';
  if (exchange.includes('yahoo')) return 'Yahoo Mail';
  if (exchange.includes('zoho')) return 'Zoho Mail';
  return mxRecords[0].exchange || null;
}

router.get('/mx', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { domain } = req.query;

  if (typeof domain !== 'string' || domain.trim().length === 0) {
    res.status(422).json({ error: 'Missing or invalid domain parameter', code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(domain.trim())}&type=MX`;
    const response = await fetch(url);
    if (!response.ok) {
      res.status(502).json({ error: 'DNS lookup failed', code: 'DNS_ERROR' });
      return;
    }
    const data = await response.json() as { Answer?: Array<{ data: string }> };
    const mxRecords: MxRecord[] = (data.Answer ?? []).map((r) => {
      const parts = r.data.trim().split(/\s+/);
      return { priority: Number(parts[0]), exchange: parts[1] ?? '' };
    });

    const provider = detectProvider(mxRecords);
    res.json({ provider, mxRecords });
  } catch (err) {
    next(err);
  }
});

export { generateSuggestions, detectProvider };
export default router;
