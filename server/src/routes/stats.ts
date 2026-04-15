import { Router, Request, Response, NextFunction } from 'express';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { mailcowService } from '../services/mailcow';

const router = Router();

// GET /api/stats/overview — admin only
router.get('/overview', auth, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await mailcowService.getOverviewStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/mailbox/:email — admin only
router.get('/mailbox/:email', auth, requireRole('admin'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { email } = req.params;

  try {
    const stats = await mailcowService.getMailboxStats(email);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/mailcow-domains — admin only
router.get('/mailcow-domains', auth, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const domains = await mailcowService.getDomains();
    res.json(domains);
  } catch (err) {
    next(err);
  }
});

export default router;
