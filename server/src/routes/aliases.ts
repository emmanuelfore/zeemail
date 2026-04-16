import { Router, Request, Response, NextFunction } from 'express';
import { auth, AuthenticatedRequest } from '../middleware/auth';
import { mailcowService, AddAliasParams } from '../services/mailcow';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const router = Router();

// GET /api/aliases/:domain — Get all aliases for a domain
router.get('/:domain', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const domain = req.params.domain;
  const authReq = req as AuthenticatedRequest;

  try {
    // 1. Verify authorization
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select('id, profile_id')
      .eq('domain', domain)
      .single();

    if (error || !client) {
      res.status(404).json({ error: 'Domain not found', code: 'NOT_FOUND' });
      return;
    }

    if (authReq.profile.role !== 'admin' && client.profile_id !== authReq.profile.id) {
      res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
      return;
    }

    const aliases = await mailcowService.getAliases(domain);
    res.json(aliases);
  } catch (err) {
    next(err);
  }
});

// POST /api/aliases/add — Add a new alias (forwarding or group)
router.post('/add', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { address, goto } = req.body as { address: string; goto: string };
  const authReq = req as AuthenticatedRequest;

  if (!address || !goto) {
    res.status(422).json({ error: 'address and goto are required', code: 'VALIDATION_ERROR' });
    return;
  }

  const domain = address.split('@')[1];
  if (!domain) {
    res.status(422).json({ error: 'Invalid address format', code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    // 1. Verify authorization
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select('id, profile_id')
      .eq('domain', domain)
      .single();

    if (error || !client) {
      res.status(404).json({ error: 'Domain not found', code: 'NOT_FOUND' });
      return;
    }

    if (authReq.profile.role !== 'admin' && client.profile_id !== authReq.profile.id) {
      res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
      return;
    }

    const result = await mailcowService.addAlias({ address, goto });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/aliases/:id — Update an alias (goto list or status)
router.put('/:id', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params; // In Mailcow, ID is usually the address for aliases in edit calls, but we should confirm
  const attrs = req.body;
  const authReq = req as AuthenticatedRequest;

  // We need to know which domain this alias belongs to for authorization
  // For now, assume address is in the body or we fetch the alias first
  const { address } = req.body; 
  if (!address) {
     res.status(422).json({ error: 'address is required to authorize the change', code: 'VALIDATION_ERROR' });
     return;
  }

  const domain = address.split('@')[1];

  try {
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select('profile_id')
      .eq('domain', domain)
      .single();

    if (error || !client || (authReq.profile.role !== 'admin' && client.profile_id !== authReq.profile.id)) {
      res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
      return;
    }

    const result = await mailcowService.updateAlias(id, attrs);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/aliases/:id — Remove an alias
router.delete('/:id', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.params; // Mailcow ID
  const { address } = req.query; // Pass address to authorize
  const authReq = req as AuthenticatedRequest;

  if (!address || typeof address !== 'string') {
     res.status(422).json({ error: 'address query param is required for authorization', code: 'VALIDATION_ERROR' });
     return;
  }

  const domain = address.split('@')[1];

  try {
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select('profile_id')
      .eq('domain', domain)
      .single();

    if (error || !client || (authReq.profile.role !== 'admin' && client.profile_id !== authReq.profile.id)) {
      res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
      return;
    }

    const result = await mailcowService.deleteAlias(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
