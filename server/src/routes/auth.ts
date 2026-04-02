import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/auth/me — returns the authenticated user's profile
// Uses service role key via auth middleware, bypasses RLS
router.get('/me', auth, (req: Request, res: Response, _next: NextFunction): void => {
  const { profile } = req as AuthenticatedRequest;
  res.json(profile);
});

export default router;
