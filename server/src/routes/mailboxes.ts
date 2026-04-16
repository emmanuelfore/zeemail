import { Router, Request, Response, NextFunction } from 'express';
import { auth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { mailcowService, AddMailboxParams } from '../services/mailcow';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const router = Router();

// POST /api/mailboxes/add-domain — admin only
router.post('/add-domain', auth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { domain } = req.body as { domain?: string };
  if (!domain) {
    res.status(422).json({ error: 'domain is required', code: 'VALIDATION_ERROR' });
    return;
  }
  try {
    const result = await mailcowService.addDomain(domain);
    console.log('[mailboxes/add-domain] Mailcow response:', JSON.stringify(result));
    res.json({ success: true, result });
  } catch (err) {
    console.error('[mailboxes/add-domain] error:', err);
    next(err);
  }
});

// POST /api/mailboxes/add — admin or the client themselves
router.post('/add', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { local_part, domain, password, quota, client_id } = req.body as {
    local_part?: string;
    domain?: string;
    password?: string;
    quota?: number;
    client_id?: string;
  };
  const authReq = req as AuthenticatedRequest;

  if (!local_part || !domain || !password || !client_id) {
    const missing = ['local_part', 'domain', 'password', 'client_id'].filter(f => !req.body[f]);
    res.status(422).json({ error: `Missing required fields: ${missing.join(', ')}`, code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    // 1. Verify authorization
    const { data: client, error: clientFetchError } = await supabaseAdmin
      .from('clients')
      .select('profile_id, status, mailbox_limit, domain')
      .eq('id', client_id)
      .single();

    if (clientFetchError || !client) {
      res.status(404).json({ error: 'Client not found', code: 'NOT_FOUND' });
      return;
    }

    if (authReq.profile.role !== 'admin' && client.profile_id !== authReq.profile.id) {
      res.status(403).json({ 
        error: 'You do not have permission to add mailboxes to this client account.', 
        code: 'INSUFFICIENT_ROLE' 
      });
      return;
    }

    // 2. Verify status (clients may self-serve while active, pending payment, or during provisioning)
    if (client.status === 'suspended' && authReq.profile.role !== 'admin') {
      res.status(403).json({ error: 'Your account is suspended.', code: 'ACCOUNT_SUSPENDED' });
      return;
    }

    // 3. Verify mailbox limit
    const { count, error: countError } = await supabaseAdmin
      .from('mailboxes')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client_id);

    if (countError) throw countError;

    if (count !== null && count >= client.mailbox_limit && authReq.profile.role !== 'admin') {
      res.status(422).json({ error: `Mailbox limit reached (${client.mailbox_limit}). Please upgrade your plan.`, code: 'LIMIT_REACHED' });
      return;
    }

    // Ensure domain matches client domain (unless admin)
    if (authReq.profile.role !== 'admin' && domain !== client.domain) {
      res.status(422).json({ error: 'Domain must match your account domain', code: 'VALIDATION_ERROR' });
      return;
    }

    const params: AddMailboxParams = {
      local_part,
      domain,
      password,
      password2: password,
      quota: quota ?? 500,
      active: 1,
    };

    // Ensure domain exists in Mailcow before adding mailbox
    await mailcowService.addDomain(domain);

    const mailcowResult = await mailcowService.addMailbox(params);
    console.log('[mailboxes/add] Mailcow response:', JSON.stringify(mailcowResult));

    const results = Array.isArray(mailcowResult) ? mailcowResult : [mailcowResult];
    const failure = results.find((r) => r.type === 'danger' || r.type === 'error');
    if (failure) {
      const msg = Array.isArray(failure.msg) ? failure.msg.join(', ') : (failure.msg ?? 'Mailcow rejected the request');
      res.status(422).json({ error: `Mailcow error: ${msg}`, code: 'MAILCOW_ERROR' });
      return;
    }

    const { data: mailboxData, error: mailboxError } = await supabaseAdmin
      .from('mailboxes')
      .insert({
        client_id,
        email: `${local_part}@${domain}`,
        quota_mb: quota ?? 500,
        status: 'active',
      })
      .select('id')
      .single();

    if (mailboxError) {
      next(mailboxError);
      return;
    }

    res.status(201).json({ id: mailboxData.id });
  } catch (err) {
    console.error('[mailboxes/add] error:', err);
    next(err);
  }
});

// GET /api/mailboxes/:domain — auth required
router.get('/:domain', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const domain = req.params['domain'] as string;

  try {
    const mailboxes = await mailcowService.getMailboxes(domain);
    res.json(mailboxes);
  } catch (err) {
    next(err);
  }
});

// PUT /api/mailboxes/:email — admin only
router.put('/:email', auth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const email = req.params['email'] as string;
  const attrs = req.body;

  try {
    const result = await mailcowService.updateMailbox(email, attrs);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/mailboxes/:email — admin or owner
router.delete('/:email', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const email = req.params['email'] as string;
  const authReq = req as AuthenticatedRequest;

  // Permission check
  if (authReq.profile.role !== 'admin') {
    const { data: mailbox } = await supabaseAdmin
      .from('mailboxes')
      .select('email, clients!inner(profile_id)')
      .eq('email', email)
      .single();

    const clientProfileId = (mailbox as any)?.clients?.profile_id;
    if (!mailbox || clientProfileId !== authReq.profile.id) {
      res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
      return;
    }
  }

  try {
    await mailcowService.deleteMailbox(email);
    await supabaseAdmin.from('mailboxes').delete().eq('email', email);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/mailboxes/:email/password — auth required (portal users can reset their own)
router.post('/:email/password', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const email = req.params['email'] as string;
  const { password } = req.body as { password?: string };
  const authReq = req as AuthenticatedRequest;

  if (!password) {
    res.status(422).json({ error: 'password is required', code: 'VALIDATION_ERROR' });
    return;
  }

  // Permission check
  if (authReq.profile.role !== 'admin') {
    const { data: mailbox } = await supabaseAdmin
      .from('mailboxes')
      .select('email, clients!inner(profile_id)')
      .eq('email', email)
      .single();

    const clientProfileId = (mailbox as any)?.clients?.profile_id;
    if (!mailbox || clientProfileId !== authReq.profile.id) {
      res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
      return;
    }
  }

  try {
    const result = await mailcowService.resetPassword(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/mailboxes/:email/quota — auth required
router.post('/:email/quota', auth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const email = req.params['email'] as string;
  const { quota } = req.body as { quota?: number };
  const authReq = req as AuthenticatedRequest;

  if (typeof quota !== 'number' || quota <= 0) {
    res.status(422).json({ error: 'quota must be a positive number', code: 'VALIDATION_ERROR' });
    return;
  }

  // Authorization and Limits
  if (authReq.profile.role !== 'admin') {
    const { data: mailbox } = await supabaseAdmin
      .from('mailboxes')
      .select('email, clients!inner(profile_id, plan)')
      .eq('email', email)
      .single();

    const client = (mailbox as any)?.clients;
    if (!mailbox || client?.profile_id !== authReq.profile.id) {
      res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
      return;
    }

    // Dynamic Quota Limits 
    const planLimits: Record<string, number> = {
      'starter': 2048,   // 2GB
      'business': 5120,  // 5GB
      'pro': 10240       // 10GB
    };
    
    const maxAllowed = planLimits[client.plan as string] || 2048;

    if (quota > maxAllowed) {
      res.status(422).json({ 
        error: `Mailbox quota cannot exceed ${maxAllowed / 1024}GB for your ${client.plan} plan. Please contact support to upgrade.`, 
        code: 'LIMIT_EXCEEDED' 
      });
      return;
    }
  }

  try {
    // 1. Update Mailcow
    const result = await mailcowService.updateMailbox(email, { quota: quota });
    
    // 2. Update DB
    await supabaseAdmin.from('mailboxes').update({ quota_mb: quota }).eq('email', email);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
