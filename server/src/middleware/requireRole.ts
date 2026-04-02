import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export function requireRole(role: 'admin' | 'client') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const profile = (req as AuthenticatedRequest).profile;

    if (!profile || profile.role !== role) {
      res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
      return;
    }

    next();
  };
}
