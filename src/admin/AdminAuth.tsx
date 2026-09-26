import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AdminAuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  session: null,
  user: null,
  isAdmin: false,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

const ADMIN_ALLOWED_EMAILS = ['admin@jazelle.com'];

/**
 * Purges any legacy mock session keys from localStorage and sessionStorage
 * so no fake or fabricated session can ever be read.
 */
function purgeLegacyMockSessions() {
  if (typeof window === 'undefined') return;
  const legacyKeys = [
    'jazelle_mock_auth_session',
    'jazelle_admin_auth',
    'jazelle_admin_session',
    'jazelle_verified_admin_v2',
  ];
  for (const key of legacyKeys) {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Verifies against the real Supabase database that the authenticated user
 * has role = 'admin' in public.profiles (or is in ADMIN_ALLOWED_EMAILS with a real JWT).
 */
async function verifyAdminAuthorization(user: User): Promise<boolean> {
  const email = (user.email || '').trim().toLowerCase();

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!error && profile && profile.role === 'admin') {
      return true;
    }

    if (!error && profile && profile.role && profile.role !== 'admin') {
      return false;
    }
  } catch (err) {
    console.warn('[AdminAuth] Profile role check error:', err);
  }

  const appRole = user.app_metadata?.role || user.user_metadata?.role;
  if (appRole === 'admin') {
    return true;
  }

  if (ADMIN_ALLOWED_EMAILS.includes(email)) {
    return true;
  }

  return false;
}

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    purgeLegacyMockSessions();

    const hydrateSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (!isMountedRef.current) return;

        if (error || !initialSession?.user) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const authorized = await verifyAdminAuthorization(initialSession.user);
        if (!isMountedRef.current) return;

        if (authorized) {
          setSession(initialSession);
          setUser(initialSession.user);
          setIsAdmin(true);
        } else {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error('[AdminAuth] Failed to verify initial session:', err);
        if (isMountedRef.current) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMountedRef.current) return;

      if (event === 'SIGNED_OUT' || !nextSession?.user) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const authorized = await verifyAdminAuthorization(nextSession.user);
      if (!isMountedRef.current) return;

      if (authorized) {
        setSession(nextSession);
        setUser(nextSession.user);
        setIsAdmin(true);
      } else {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    purgeLegacyMockSessions();

    // Check database-backed rate limiter before attempting sign-in
    try {
      const rateRes = await fetch('/api/auth/rate-limit-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_login', identifier: cleanEmail }),
      });
      if (rateRes.status === 429) {
        const rateData = await rateRes.json().catch(() => ({}));
        return {
          error: new Error(
            rateData.error || 'Too many failed login attempts. Please wait 15 minutes before trying again.'
          ),
        };
      }
    } catch {
      // Do not block if local express endpoint is unreachable
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.session || !data.user) {
        return {
          error: new Error(error?.message || 'Invalid login credentials. Access denied.'),
        };
      }

      const authorized = await verifyAdminAuthorization(data.user);
      if (!authorized) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        return {
          error: new Error('Access denied: This account does not have administrator privileges.'),
        };
      }

      setSession(data.session);
      setUser(data.user);
      setIsAdmin(true);
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      return { error: new Error(message) };
    }
  };

  const signOut = async () => {
    purgeLegacyMockSessions();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AdminAuth] Error signing out:', err);
    } finally {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ session, user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);
