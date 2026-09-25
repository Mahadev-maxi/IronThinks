import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, getStoredUser, setStoredUser, type UserProfile } from '../lib/supabaseClient';

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

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (err) throw err;
        if (data.session) {
          const u: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName: data.user.user_metadata?.full_name || email.split('@')[0],
            isDemo: false
          };
          setUser(u);
          setStoredUser(u);
          localStorage.setItem('supabase_auth_token', data.session.access_token);
          setIsLoading(false);
          return true;
        }
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
        return false;
      }
    }

    // Demo login fallback
    const demoUser: UserProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      email,
      fullName: email.split('@')[0] || 'Alex Director',
      isDemo: true
    };
    setUser(demoUser);
    setStoredUser(demoUser);
    setIsLoading(false);
    return true;
  };

  const registerWithEmail = async (email: string, pass: string, fullName: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

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
      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
        return false;
      }
    }

    // Demo registration fallback
    const demoUser: UserProfile = {
      id: crypto.randomUUID(),
      email,
      fullName,
      isDemo: true
    };
    setUser(demoUser);
    setStoredUser(demoUser);
    setIsLoading(false);
    return true;
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
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
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
    loginAsGuest,
    logout,
    isSupabaseConfigured
  };
}
