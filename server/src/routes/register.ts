/**
 * Registration routes
 *
 * POST /api/register        — create Supabase auth user + client record
 * GET  /api/register/check-email — duplicate email check
 *
 * Requirements: 5.1–5.6, 6.1–6.6, 17.1–17.4
 */
import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import type { Plan } from '../types/index';

const router = Router();

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface RegisterRequest {
  path: 'A' | 'B';
  domain: string;
  plan: 'starter' | 'business' | 'pro';
  company_name: string;
  full_name: string;
  email: string;
  password: string;
  phone: string;
  physical_address: string;
  previous_email_provider?: string; // Path B only
  letterhead_ready?: boolean;       // Path A only
  signed_letter_ready?: boolean;
  id_ready?: boolean;
  tc_confirmed?: boolean;
}

const MAILBOX_LIMITS: Record<Plan, number> = {
  starter: 1,
  business: 5,
  pro: 10,
};

const VALID_PLANS: Plan[] = ['starter', 'business', 'pro'];

const PLAN_PRICES: Record<Plan, { monthly: number; annual: number }> = {
  starter: { monthly: 5, annual: 48 },
  business: { monthly: 12, annual: 115 },
  pro: { monthly: 25, annual: 240 },
};

const DOMAIN_FEE = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateRegisterRequest(body: Partial<RegisterRequest>): string | null {
  const required: Array<keyof RegisterRequest> = [
    'path', 'domain', 'plan', 'company_name', 'full_name',
    'email', 'password', 'phone', 'physical_address',
  ];

  for (const field of required) {
    if (!body[field]) {
      return `Missing required field: ${field}`;
    }
  }

  if (body.path !== 'A' && body.path !== 'B') {
    return 'path must be "A" or "B"';
  }

  if (!VALID_PLANS.includes(body.plan as Plan)) {
    return 'plan must be one of: starter, business, pro';
  }

  if (typeof body.password === 'string' && body.password.length < 8) {
    return 'password must be at least 8 characters';
  }

  return null;
}

// ---------------------------------------------------------------------------
// GET /api/register/check-email?email=
// ---------------------------------------------------------------------------

router.get('/check-email', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email } = req.query;

  if (typeof email !== 'string' || !email.trim()) {
    res.status(422).json({ error: 'Missing or invalid email parameter', code: 'VALIDATION_ERROR' });
    return;
  }

  try {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = (authData?.users ?? []).some(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
    );

    res.json({ exists: emailExists });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/register
// ---------------------------------------------------------------------------

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const body = req.body as Partial<RegisterRequest & { billing_cycle: 'monthly' | 'annual' }>;

  // Validate required fields
  const validationError = validateRegisterRequest(body);
  if (validationError) {
    res.status(422).json({ error: validationError, code: 'VALIDATION_ERROR' });
    return;
  }

  const {
    path,
    domain,
    plan,
    billing_cycle = 'monthly',
    company_name,
    full_name,
    email,
    password,
    phone,
    physical_address,
    previous_email_provider,
  } = body as RegisterRequest & { billing_cycle: 'monthly' | 'annual' };

  try {
    // Check for duplicate email in auth users
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const emailAlreadyExists = (authData?.users ?? []).some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailAlreadyExists) {
      res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
      return;
    }

    // Create Supabase auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });

    if (authError || !authUser.user) {
      if (authError?.message?.toLowerCase().includes('already registered') ||
          authError?.message?.toLowerCase().includes('already exists')) {
        res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
        return;
      }
      next(authError ?? new Error('Failed to create auth user'));
      return;
    }

    const userId = authUser.user.id;

    // Upsert profile record (trigger may have created it already)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        role: 'client',
        full_name,
        phone,
      });

    if (profileError) {
      // Clean up auth user on failure
      await supabaseAdmin.auth.admin.deleteUser(userId);
      next(profileError);
      return;
    }

    // Create client record
    const clientInsert: Record<string, unknown> = {
      profile_id: userId,
      company_name,
      domain,
      plan,
      status: 'pending_payment',
      mailbox_limit: MAILBOX_LIMITS[plan as Plan],
      domain_owned: path === 'A',
      physical_address,
    };

    if (path === 'B' && previous_email_provider) {
      clientInsert.previous_email_provider = previous_email_provider;
    }

    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert(clientInsert)
      .select('id')
      .single();

    if (clientError || !clientData) {
      // Clean up auth user on failure
      await supabaseAdmin.auth.admin.deleteUser(userId);
      next(clientError ?? new Error('Failed to create client record'));
      return;
    }

    // AUTOMATIC INVOICE CREATION
    const basePrice = billing_cycle === 'annual' ? PLAN_PRICES[plan].annual : PLAN_PRICES[plan].monthly;
    const finalAmount = path === 'A' ? basePrice + DOMAIN_FEE : basePrice;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const { error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        client_id: clientData.id,
        amount: finalAmount,
        status: 'unpaid',
        description: `Initial setup: ${plan} plan (${billing_cycle})${path === 'A' ? ' + Domain registration' : ''}`,
        due_date: dueDate.toISOString(),
      });

    if (invoiceError) {
      console.error('Invoice creation failed:', invoiceError);
      // We don't rollback registration for invoice failure, but admin should be alerted.
    }

    res.status(201).json({ clientId: clientData.id, userId });
  } catch (err) {
    next(err);
  }
});

export default router;
