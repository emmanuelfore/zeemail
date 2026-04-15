import { Request, Response, NextFunction } from 'express';
import { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export interface AuthenticatedRequest extends Request {
  user: User;
  profile: { id: string; role: 'admin' | 'client' };
}

export async function auth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    const isNetworkError = 
      error?.message?.toLowerCase().includes('fetch failed') || 
      error?.message?.toLowerCase().includes('timeout') ||
      (error as any)?.code === 'UND_ERR_CONNECT_TIMEOUT';

    if (isNetworkError) {
      res.status(500).json({ error: 'Internal connection error', code: 'SERVER_ERROR' });
      return;
    }

    const isExpired =
      error?.message?.toLowerCase().includes('expired') ||
      error?.message?.toLowerCase().includes('token is expired');

    if (isExpired) {
      res.status(401).json({ error: 'Token has expired', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    return;
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    return;
  }

  (req as AuthenticatedRequest).user = data.user;
  (req as AuthenticatedRequest).profile = profile as { id: string; role: 'admin' | 'client' };

  next();
}
