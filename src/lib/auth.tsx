import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User, EmailOtpType } from '@supabase/supabase-js';
import { supabase, rawSupabaseClient } from './supabaseClient';

export { supabase };

const PENDING_OTP_STORAGE_KEY = 'jazelle_pending_otp_emails';

function getPendingOtpEmails(): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set();
    const raw = localStorage.getItem(PENDING_OTP_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.map((e) => String(e).trim().toLowerCase()).filter(Boolean));
    }
  } catch {
    // ignore storage errors
  }
  return new Set();
}

function addPendingOtpEmail(email: string): void {
  try {
    if (typeof window === 'undefined') return;
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    const set = getPendingOtpEmails();
    set.add(clean);
    localStorage.setItem(PENDING_OTP_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore storage errors
  }
}

function removePendingOtpEmail(email: string): void {
  try {
    if (typeof window === 'undefined') return;
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    const set = getPendingOtpEmails();
    if (set.has(clean)) {
      set.delete(clean);
      localStorage.setItem(PENDING_OTP_STORAGE_KEY, JSON.stringify(Array.from(set)));
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Checks whether a Supabase user has genuinely completed email OTP confirmation.
 * Requires both a valid `email_confirmed_at` timestamp from Supabase Auth AND
 * that the email is not awaiting signup OTP verification.
 */
export function isUserEmailConfirmed(u: User | null | undefined): boolean {
  if (!u || !u.id || !u.email) return false;
  const confirmedAt = u.email_confirmed_at || (u as unknown as { confirmed_at?: string }).confirmed_at;
  if (!confirmedAt || typeof confirmedAt !== 'string') {
    return false;
  }
  const pending = getPendingOtpEmails();
  if (pending.has(u.email.trim().toLowerCase())) {
    return false;
  }
  return true;
}

export async function recordCustomerProfile(profile: {
  id?: string;
  email: string;
  fullName?: string;
  phone?: string;
  created_at?: string;
}) {
  const cleanEmail = profile.email?.trim().toLowerCase();
  if (!cleanEmail) return;
  const displayName = profile.fullName?.trim() || cleanEmail.split('@')[0];
  const role = cleanEmail === 'admin@jazelle.com' ? 'owner' : 'customer';
  const newProfile = {
    id: profile.id || `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: cleanEmail,
    display_name: displayName,
    role,
    phone: profile.phone || '',
    created_at: profile.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const raw = localStorage.getItem('jazelle_registered_customers') || '[]';
    const list: (typeof newProfile)[] = JSON.parse(raw);
    const existingIdx = list.findIndex((c) => c.email.toLowerCase() === cleanEmail);
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...newProfile };
    } else {
      list.unshift(newProfile);
    }
    localStorage.setItem('jazelle_registered_customers', JSON.stringify(list));

    const rawDb = localStorage.getItem('jazelle_db_profiles') || '[]';
    const dbList: (typeof newProfile)[] = JSON.parse(rawDb);
    const dbIdx = dbList.findIndex((c) => c.email.toLowerCase() === cleanEmail);
    if (dbIdx >= 0) {
      dbList[dbIdx] = { ...dbList[dbIdx], ...newProfile };
    } else {
      dbList.unshift(newProfile);
    }
    localStorage.setItem('jazelle_db_profiles', JSON.stringify(dbList));
  } catch {
    // quota
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('jazelle_customer_registered', { detail: newProfile }));
  }

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newProfile.id);
  if (isUUID) {
    try {
      await rawSupabaseClient.from('profiles').upsert({
        id: newProfile.id,
        email: newProfile.email,
        display_name: newProfile.display_name,
        role: newProfile.role,
        phone: newProfile.phone,
        updated_at: newProfile.updated_at,
      });
    } catch {
      // silent cloud sync
    }
  }

  return newProfile;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsOtp?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; needsOtp?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string, type?: 'signup' | 'recovery' | 'email') => Promise<{ error: string | null }>;
  resendOtp: (email: string, type?: 'signup' | 'recovery') => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  updateProfile: (data: { fullName?: string }) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      localStorage.removeItem('jazelle_mock_session');
    } catch {
      // ignore
    }

    const validateAndApplySession = async (candidateSession: Session | null) => {
      if (
        !candidateSession ||
        !candidateSession.access_token ||
        candidateSession.access_token === 'mock-token' ||
        !candidateSession.user
      ) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Enforce email OTP confirmation on every page load and auth state change
      if (!isUserEmailConfirmed(candidateSession.user)) {
        await rawSupabaseClient.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(candidateSession);
      setUser(candidateSession.user);
      if (candidateSession.user.email) {
        await recordCustomerProfile({
          id: candidateSession.user.id,
          email: candidateSession.user.email,
          fullName: candidateSession.user.user_metadata?.full_name,
        });
      }
      setLoading(false);
    };

    rawSupabaseClient.auth.getSession().then(({ data }) => {
      void validateAndApplySession(data.session);
    });

    const { data: listener } = rawSupabaseClient.auth.onAuthStateChange((_event, newSession) => {
      void validateAndApplySession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await rawSupabaseClient.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: fullName.trim() } },
    });

    if (error) {
      return { error: error.message, needsOtp: false };
    }

    // Supabase returns identities: [] when the user already exists and email confirmations are enabled
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return {
        error: 'An account with this email already exists. Please sign in or reset your password.',
        needsOtp: false,
      };
    }

    // Mark this email as pending OTP verification until verifyOtp() succeeds
    addPendingOtpEmail(cleanEmail);

    // If Supabase created a session before OTP verification, explicitly sign out immediately
    // so the user cannot refresh the page or navigate to /account before verifying OTP
    if (data?.session || !isUserEmailConfirmed(data?.user)) {
      await rawSupabaseClient.auth.signOut();
    }

    setSession(null);
    setUser(null);

    return { error: null, needsOtp: true };
  };

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await rawSupabaseClient.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      const lowerMsg = error.message.toLowerCase();
      if (lowerMsg.includes('email not confirmed') || lowerMsg.includes('not confirmed')) {
        addPendingOtpEmail(cleanEmail);
        return {
          error: 'Your email address has not been verified yet. Please enter the 6-digit verification code sent to your email.',
          needsOtp: true,
        };
      }
      if (
        lowerMsg.includes('database error querying schema') ||
        lowerMsg.includes('invalid login credentials') ||
        lowerMsg.includes('invalid credentials') ||
        lowerMsg.includes('user not found')
      ) {
        return { error: 'Invalid email or password.', needsOtp: false };
      }
      return { error: error.message, needsOtp: false };
    }

    // Block login if no valid session or if the account has not completed OTP verification
    if (
      !data?.session ||
      !data.session.access_token ||
      data.session.access_token === 'mock-token' ||
      !data?.user ||
      !isUserEmailConfirmed(data.user)
    ) {
      await rawSupabaseClient.auth.signOut();
      setSession(null);
      setUser(null);
      addPendingOtpEmail(cleanEmail);
      return {
        error: 'Your email address has not been verified yet. Please enter the 6-digit verification code sent to your email.',
        needsOtp: true,
      };
    }

    setSession(data.session);
    setUser(data.user);
    await recordCustomerProfile({
      id: data.user.id,
      email: data.user.email || cleanEmail,
      fullName: data.user.user_metadata?.full_name,
    });

    return { error: null, needsOtp: false };
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('jazelle_mock_session');
    } catch {
      // ignore
    }
    await rawSupabaseClient.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await rawSupabaseClient.auth.resetPasswordForEmail(email.trim().toLowerCase());
    return { error: error?.message ?? null };
  };

  const verifyOtp = async (email: string, token: string, type: 'signup' | 'recovery' | 'email' = 'signup') => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    const { data, error } = await rawSupabaseClient.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: type as EmailOtpType,
    });

    if (error) {
      if (type === 'signup') {
        const retry = await rawSupabaseClient.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'email' as EmailOtpType,
        });
        if (!retry.error && retry.data?.session && retry.data?.user) {
          removePendingOtpEmail(cleanEmail);
          setSession(retry.data.session);
          setUser(retry.data.session.user);
          await recordCustomerProfile({
            id: retry.data.session.user.id,
            email: retry.data.session.user.email || cleanEmail,
            fullName: retry.data.session.user.user_metadata?.full_name,
          });
          return { error: null };
        }
      }
      return { error: error.message };
    }

    if (!data?.session || !data?.user) {
      return { error: 'Verification failed: No active session returned by Supabase.' };
    }

    // OTP verified! Remove from pending OTP set and grant session access
    removePendingOtpEmail(cleanEmail);
    setSession(data.session);
    setUser(data.session.user);
    await recordCustomerProfile({
      id: data.session.user.id,
      email: data.session.user.email || cleanEmail,
      fullName: data.session.user.user_metadata?.full_name,
    });

    return { error: null };
  };

  const resendOtp = async (email: string, type: 'signup' | 'recovery' = 'signup') => {
    const cleanEmail = email.trim().toLowerCase();
    if (type === 'recovery') {
      const { error } = await rawSupabaseClient.auth.resetPasswordForEmail(cleanEmail);
      return { error: error?.message ?? null };
    }
    const { error } = await rawSupabaseClient.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await rawSupabaseClient.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  const updateProfile = async (data: { fullName?: string }) => {
    const { error } = await rawSupabaseClient.auth.updateUser({
      data: data.fullName ? { full_name: data.fullName } : undefined,
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        verifyOtp,
        resendOtp,
        updatePassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function getDisplayName(user: User | null): string {
  if (!user) return '';
  const meta = user.user_metadata as Record<string, string> | null;
  return meta?.full_name ?? meta?.name ?? user.email?.split('@')[0] ?? '';
}
