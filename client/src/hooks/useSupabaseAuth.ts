import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, getStoredUser, setStoredUser, type UserProfile } from '../lib/supabaseClient';
import { apiSignup, apiLogin, apiDeleteAccount, apiLogout } from '../lib/api';

export function useSupabaseAuth() {
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const u: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatarUrl: session.user.user_metadata?.avatar_url,
            isDemo: false
          };
          setUser(u);
          setStoredUser(u);
          localStorage.setItem('supabase_auth_token', session.access_token);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const u: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatarUrl: session.user.user_metadata?.avatar_url,
            isDemo: false
          };
          setUser(u);
          setStoredUser(u);
          localStorage.setItem('supabase_auth_token', session.access_token);
        } else {
          loginAsGuest();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    // 1. First try Backend API (handles Supabase server-side validation & local resilient mode)
    try {
      const res = await apiLogin(email, pass);
      if (res.success && res.user) {
        setUser(res.user);
        setStoredUser(res.user);
        if (res.token) {
          localStorage.setItem('supabase_auth_token', res.token);
        }
        setIsLoading(false);
        return true;
      }
    } catch (apiErr: any) {
      // If direct Supabase client in browser is configured, fallback to client-side auth
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
          if (err) throw err;
          if (data.session && data.user) {
            const u: UserProfile = {
              id: data.user.id,
              email: data.user.email || email,
              fullName: data.user.user_metadata?.full_name || email.split('@')[0],
              avatarUrl: data.user.user_metadata?.avatar_url,
              isDemo: false
            };
            setUser(u);
            setStoredUser(u);
            localStorage.setItem('supabase_auth_token', data.session.access_token);
            setIsLoading(false);
            return true;
          }
        } catch (clientErr: any) {
          setError(clientErr.message || apiErr.message);
          setIsLoading(false);
          return false;
        }
      }

      setError(apiErr.message || 'Login failed. Please check your credentials.');
      setIsLoading(false);
      return false;
    }

    setIsLoading(false);
    return false;
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    // 1. First attempt through Backend API (handles Supabase admin auto-confirmation & profile creation)
    try {
      const res = await apiSignup(email, pass, fullName);
      if (res.success && res.user) {
        setUser(res.user);
        setStoredUser(res.user);
        if (res.token) {
          localStorage.setItem('supabase_auth_token', res.token);
        }
        setIsLoading(false);
        return true;
      }
    } catch (apiErr: any) {
      // If direct client Supabase is available, attempt client-side signup
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error: err } = await supabase.auth.signUp({
            email,
            password: pass,
            options: { data: { full_name: fullName } }
          });
          if (err) throw err;
          if (data.user) {
            const u: UserProfile = {
              id: data.user.id,
              email,
              fullName,
              isDemo: false
            };
            setUser(u);
            setStoredUser(u);
            if (data.session) {
              localStorage.setItem('supabase_auth_token', data.session.access_token);
            }
            setIsLoading(false);
            return true;
          }
        } catch (clientErr: any) {
          setError(clientErr.message || apiErr.message);
          setIsLoading(false);
          return false;
        }
      }

      setError(apiErr.message || 'Registration failed.');
      setIsLoading(false);
      return false;
    }

    setIsLoading(false);
    return false;
  };

  const deleteAccount = async (password?: string, confirmText?: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiDeleteAccount(password, confirmText);

      // Sign out from Supabase if active in browser
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.auth.signOut();
        } catch {}
      }

      // Clear all stored local credentials and session history
      localStorage.removeItem('supabase_auth_token');
      localStorage.removeItem('agentic_user');

      // Reset to guest mode
      loginAsGuest();
      setIsLoading(false);

      return {
        success: true,
        message: res.message || 'Your account and all associated data have been permanently deleted.'
      };
    } catch (err: any) {
      console.error('[useSupabaseAuth] Delete account error:', err);
      setError(err.message || 'Failed to delete account.');
      setIsLoading(false);
      return {
        success: false,
        error: err.message || 'Failed to delete account.'
      };
    }
  };

  const loginAsGuest = (): void => {
    const guestUser: UserProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'alex.director@ironthinks.ai',
      fullName: 'Alex Director (Lead Architect)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isDemo: true
    };
    setUser(guestUser);
    setStoredUser(guestUser);
    setError(null);
  };

  const logout = async (): Promise<void> => {
    try {
      await apiLogout();
    } catch {}

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    localStorage.removeItem('supabase_auth_token');
    loginAsGuest();
  };

  return {
    user,
    isLoading,
    error,
    loginWithEmail,
    registerWithEmail,
    deleteAccount,
    loginAsGuest,
    logout,
    isSupabaseConfigured
  };
}

