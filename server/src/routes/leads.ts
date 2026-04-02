import { Router, Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const router = Router();

// POST /api/leads — no auth required (public landing page form)
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { contact_name, contact_email, contact_phone, ...rest } = req.body as {
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    [key: string]: unknown;
  };

  if (!contact_name || !contact_email || !contact_phone) {
    res.status(422).json({
      error: 'contact_name, contact_email, and contact_phone are required',
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        contact_name,
        contact_email,
        contact_phone,
        ...rest,
        status: 'new',
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

export default router;
