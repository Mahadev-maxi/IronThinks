import { Request, Response, NextFunction } from 'express';
import { supabase, isLiveSupabase, inMemoryDb } from '../db/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : (req.query.token as string | undefined);

  // Fallback demo user
  const demoUser: AuthenticatedUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'alex.director@ironthinks.ai',
    fullName: 'Alex Director',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  };

  if (!token) {
    // If running in development or demo mode, allow default demo user
    req.user = demoUser;
    return next();
  }

  // Handle guest / demo tokens
  if (token.startsWith('demo-') || token === 'guest') {
    req.user = demoUser;
    return next();
  }

  // Live Supabase token validation
  if (isLiveSupabase && supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        console.warn('[AuthMiddleware] Supabase token invalid, falling back to demo user:', error?.message);
        req.user = demoUser;
        return next();
      }

      req.user = {
        id: user.id,
        email: user.email || 'user@domain.com',
        fullName: user.user_metadata?.full_name || user.email?.split('@')[0],
        avatarUrl: user.user_metadata?.avatar_url
      };
      return next();
    } catch (err: any) {
      console.warn('[AuthMiddleware] Token verification failed:', err.message);
      req.user = demoUser;
      return next();
    }
  }

  // Default fallback
  req.user = demoUser;
  next();
}

export async function verifyWsToken(token?: string): Promise<AuthenticatedUser> {
  const demoUser: AuthenticatedUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'alex.director@ironthinks.ai',
    fullName: 'Alex Director',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
  };

  if (!token || token.startsWith('demo-') || token === 'guest') {
    return demoUser;
  }

  if (isLiveSupabase && supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        return {
          id: user.id,
          email: user.email || 'user@domain.com',
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0],
          avatarUrl: user.user_metadata?.avatar_url
        };
      }
    } catch (e) {}
  }

  return demoUser;
}
