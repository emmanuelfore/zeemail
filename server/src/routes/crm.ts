import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { checkEmailProfessionalism, scrapeEmailFromWebsite } from '../services/emailChecker';
import { searchBusinesses, getPlaceDetails } from '../services/googleMapsData';
import { domainCheckService } from '../services/domainCheck';

const router = Router();
router.use(auth);
router.use(requireRole('admin'));

// ── Contacts ──────────────────────────────────────────────────────────────────

router.get('/contacts', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('crm_contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/contacts', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    // Auto-check email professionalism
    if (body.email && typeof body.email === 'string') {
      const check = checkEmailProfessionalism(body.email);
      body.email_type = check.type;
      body.email_provider = check.provider;
    }
    const { data, error } = await supabaseAdmin.from('crm_contacts').insert(body).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

router.put('/contacts/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    if (body.email && typeof body.email === 'string') {
      const check = checkEmailProfessionalism(body.email);
      body.email_type = check.type;
      body.email_provider = check.provider;
    }
    const { data, error } = await supabaseAdmin
      .from('crm_contacts').update(body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.delete('/contacts/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { error } = await supabaseAdmin.from('crm_contacts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── Google Maps search ────────────────────────────────────────────────────────

router.get('/search/maps', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query, city, pagetoken } = req.query as Record<string, string>;
    if (!query || !city) { res.status(422).json({ error: 'query and city are required', code: 'VALIDATION_ERROR' }); return; }
    const result = await searchBusinesses(query, city, pagetoken);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/search/maps/details', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { place_id, business_name } = req.query as Record<string, string>;
    if (!place_id) { res.status(422).json({ error: 'place_id required', code: 'VALIDATION_ERROR' }); return; }
    
    const details: any = await getPlaceDetails(place_id);
    
    // Check if the domain related to the business name is available
    if (business_name) {
      const slug = business_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (slug.length > 3) {
        const check = await domainCheckService.checkAvailability(slug, '.co.zw');
        details.domain_available = check.available;
      }
    }
    
    res.json(details);
  } catch (err) { next(err); }
});

// ── Email check ───────────────────────────────────────────────────────────────

router.post('/check-email', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, website } = req.body as { email?: string; website?: string };
    let resolvedEmail = email;
    if (!resolvedEmail && website) {
      resolvedEmail = (await scrapeEmailFromWebsite(website)) ?? undefined;
    }
    if (!resolvedEmail) { res.json({ type: 'unknown', provider: null, isWarmLead: false, email: null }); return; }
    const result = checkEmailProfessionalism(resolvedEmail);
    res.json({ ...result, email: resolvedEmail });
  } catch (err) { next(err); }
});

// ── Pipeline ──────────────────────────────────────────────────────────────────

router.get('/pipeline', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('crm_contacts')
      .select('id, business_name, city, email_provider, email_type, phone, pipeline_stage, last_contacted_at, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.from('crm_contacts').select('pipeline_stage, email_type, created_at');
    if (error) throw error;
    const contacts = data ?? [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    res.json({
      total: contacts.length,
      warmLeads: contacts.filter((c) => c.email_type === 'unprofessional').length,
      addedThisWeek: contacts.filter((c) => new Date(c.created_at) >= weekAgo).length,
      wonThisMonth: contacts.filter((c) => c.pipeline_stage === 'won' && new Date(c.created_at) >= monthStart).length,
      byStage: {
        new: contacts.filter((c) => c.pipeline_stage === 'new').length,
        contacted: contacts.filter((c) => c.pipeline_stage === 'contacted').length,
        negotiating: contacts.filter((c) => c.pipeline_stage === 'negotiating').length,
        won: contacts.filter((c) => c.pipeline_stage === 'won').length,
        lost: contacts.filter((c) => c.pipeline_stage === 'lost').length,
      },
    });
  } catch (err) { next(err); }
});

// ── Interactions ──────────────────────────────────────────────────────────────

router.get('/contacts/:id/interactions', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('crm_interactions').select('*').eq('contact_id', req.params.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/contacts/:id/interactions', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, notes } = req.body as { type: string; notes?: string };
    const { data, error } = await supabaseAdmin
      .from('crm_interactions').insert({ contact_id: req.params.id, type, notes }).select().single();
    if (error) throw error;
    // Update last_contacted_at
    await supabaseAdmin.from('crm_contacts').update({ last_contacted_at: new Date().toISOString() }).eq('id', req.params.id);
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// ── WhatsApp blasts ───────────────────────────────────────────────────────────

router.get('/blasts', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.from('whatsapp_blasts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/blasts', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.from('whatsapp_blasts').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
});

router.put('/blasts/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, error } = await supabaseAdmin.from('whatsapp_blasts').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
