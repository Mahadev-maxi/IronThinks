import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-supabase-project') &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('your-supabase-anon')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  isDemo?: boolean;
}

const DEMO_USER: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'alex.director@ironthinks.ai',
  fullName: 'Alex Director',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  isDemo: true
};

export function getStoredUser(): UserProfile | null {
  const stored = localStorage.getItem('agentic_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return DEMO_USER;
}

export function setStoredUser(user: UserProfile | null): void {
  if (user) {
    localStorage.setItem('agentic_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('agentic_user');
  }
}

export function getStoredToken(): string {
  const user = getStoredUser();
  if (user?.isDemo) {
    return 'demo-token-alex-director';
  }
  return localStorage.getItem('supabase_auth_token') || 'demo-token-alex-director';
}
