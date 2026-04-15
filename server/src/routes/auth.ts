import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../lib/supabaseAdmin';

// GET /api/auth/me — returns the authenticated user's profile
router.get('/me', auth, (req: Request, res: Response, _next: NextFunction): void => {
  const { profile } = req as AuthenticatedRequest;
  res.json(profile);
});

// GET /api/auth/users/:userId — admin only
router.get('/users/:userId', auth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      last_sign_in: user.last_sign_in_at,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password/:userId — admin only
router.post('/reset-password/:userId', auth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { userId } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long' });
    return;
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});


export default router;
