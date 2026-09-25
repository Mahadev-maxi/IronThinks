import { Router, Response } from 'express';
import { SignupSchema, LoginSchema, DeleteAccountSchema } from '../../shared/schemas.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import {
  dbCreateAccount,
  dbAuthenticateUser,
  dbDeleteAccount,
  dbGetUserProfile,
  isLiveSupabase
} from '../db/supabase.js';

export const authRouter = Router();

/**
 * POST /api/auth/signup
 * Create a new secured user account in Supabase (or in-memory resilient store)
 */
authRouter.post('/signup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = SignupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.format()
      });
    }

    const { email, password, fullName } = parseResult.data;
    const { user, token } = await dbCreateAccount({
      email,
      password,
      fullName
    });

    return res.status(201).json({
      success: true,
      message: isLiveSupabase
        ? 'Account successfully created and secured with Supabase Cloud.'
        : 'Account created and secured in Local Resilient Store.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isDemo: false
      },
      token
    });
  } catch (error: any) {
    console.error('[AuthRouter] Signup error:', error.message);
    const status = error.message?.includes('already exists') ? 409 : 500;
    return res.status(status).json({
      error: error.message || 'Failed to create account.'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate existing user with Supabase (or in-memory store)
 */
authRouter.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = LoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.format()
      });
    }

    const { email, password } = parseResult.data;
    const { user, token } = await dbAuthenticateUser({
      email,
      password
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        isDemo: user.id === '00000000-0000-0000-0000-000000000001'
      },
      token
    });
  } catch (error: any) {
    console.error('[AuthRouter] Login error:', error.message);
    return res.status(401).json({
      error: error.message || 'Invalid email or password.'
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieve currently authenticated user profile
 */
authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const profile = await dbGetUserProfile(req.user.id);
    return res.status(200).json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        fullName: profile?.full_name || req.user.fullName,
        avatarUrl: profile?.avatar_url || req.user.avatarUrl,
        isDemo: req.user.id === '00000000-0000-0000-0000-000000000001'
      },
      backend: isLiveSupabase ? 'Supabase Cloud (PostgreSQL)' : 'In-Memory Resilient Sandbox'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Revoke session / client logout acknowledgement
 */
authRouter.post('/logout', (req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
});

/**
 * DELETE /api/auth/delete-account
 * Permanently delete authenticated user and all associated records from Supabase
 */
authRouter.delete('/delete-account', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required to delete account.' });
    }

    // Optional confirmation check
    const parseResult = DeleteAccountSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.format()
      });
    }

    const userId = req.user.id;
    console.log(`[AuthRouter] User ${userId} (${req.user.email}) requested account deletion.`);

    const result = await dbDeleteAccount(userId);

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error('[AuthRouter] Account deletion error:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to delete account from Supabase.'
    });
  }
});
