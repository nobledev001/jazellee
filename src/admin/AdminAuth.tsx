import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { rawSupabaseClient } from '@/lib/supabaseClient';
import type { Profile } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AdminAuthValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileFromSupabase = async (uid: string): Promise<Profile | null> => {
    try {
      const { data, error } = await rawSupabaseClient
        .from('profiles')
        .select('id, email, role, display_name')
        .eq('id', uid)
        .maybeSingle();

      if (!error && data) {
        return data as Profile;
      }
    } catch {
      // ignore network error; return null
    }
    return null;
  };

  useEffect(() => {
    // Purge any legacy local/session storage mock artifacts immediately
    try {
      localStorage.removeItem('jazelle_mock_session');
      localStorage.removeItem('jazelle_admin_session');
      sessionStorage.removeItem('jazelle_admin_session');
    } catch {
      // ignore storage errors
    }

    const verifyAndApplySession = async (sess: Session | null) => {
      if (
        !sess ||
        !sess.access_token ||
        sess.access_token === 'mock-token' ||
        !sess.user?.id ||
        !sess.user?.email
      ) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Cryptographically verify the JWT session token directly against Supabase Auth server
      const { data: userCheck, error: userError } = await rawSupabaseClient.auth.getUser(sess.access_token);
      if (userError || !userCheck?.user || userCheck.user.id !== sess.user.id) {
        await rawSupabaseClient.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const verifiedEmail = (userCheck.user.email || '').toLowerCase();
      const dbProf = await fetchProfileFromSupabase(userCheck.user.id);
      const appMetaRole = (userCheck.user.app_metadata as Record<string, unknown> | undefined)?.role;

      const hasAdminPrivilege =
        dbProf?.role === 'admin' ||
        dbProf?.role === 'owner' ||
        appMetaRole === 'admin' ||
        appMetaRole === 'owner' ||
        verifiedEmail === 'admin@jazelle.com';

      if (!hasAdminPrivilege) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const resolvedProfile: Profile = dbProf || {
        id: userCheck.user.id,
        email: verifiedEmail,
        role: verifiedEmail === 'admin@jazelle.com' ? 'owner' : 'admin',
        display_name:
          (userCheck.user.user_metadata?.full_name as string | undefined) ||
          (verifiedEmail === 'admin@jazelle.com' ? 'Store Owner' : verifiedEmail.split('@')[0]),
      };

      setSession(sess);
      setUser(userCheck.user);
      setProfile(resolvedProfile);
      setLoading(false);
    };

    rawSupabaseClient.auth.getSession().then(({ data }) => {
      void verifyAndApplySession(data.session);
    });

    const { data: listener } = rawSupabaseClient.auth.onAuthStateChange((_event, newSession) => {
      void verifyAndApplySession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const rawEmail = (email || '').trim().toLowerCase();

    if (!rawEmail) {
      return {
        error: 'Please enter your administrator or store owner email.',
      };
    }

    if (!password) {
      return {
        error: 'Please enter your password to sign in.',
      };
    }

    // 1. Authoritative Database-Backed Rate Limit & Lockout Guard (Supabase PostgreSQL)
    try {
      const { data: lockoutCheck, error: rpcErr } = await rawSupabaseClient.rpc('check_admin_login_lockout', {
        p_email: rawEmail,
      });

      if (!rpcErr && lockoutCheck && typeof lockoutCheck === 'object') {
        const check = lockoutCheck as {
          locked?: boolean;
          remaining_seconds?: number;
          failed_attempts?: number;
          message?: string;
        };
        if (check.locked) {
          return {
            error:
              check.message ||
              `Too many failed login attempts (${check.failed_attempts || 5}/5). Account locked for ${check.remaining_seconds || 900} seconds.`,
          };
        }
      } else {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: recentAttempts } = await rawSupabaseClient
          .from('admin_login_attempts')
          .select('id, attempted_at')
          .eq('email', rawEmail)
          .eq('success', false)
          .gte('attempted_at', fifteenMinsAgo);

        if (recentAttempts && recentAttempts.length >= 5) {
          return {
            error: 'Too many failed login attempts recorded in database. Account locked for 15 minutes for security.',
          };
        }
      }
    } catch (checkErr) {
      console.warn('[Admin Auth] Database lockout check notice:', checkErr);
    }

    // 2. Strictly authenticate with real, unproxied Supabase Auth (rawSupabaseClient.auth.signInWithPassword)
    try {
      const { data: authData, error: authError } = await rawSupabaseClient.auth.signInWithPassword({
        email: rawEmail,
        password,
      });

      // Reject immediately if Supabase returns ANY error or if no valid session/access_token is returned
      if (
        authError ||
        !authData?.session ||
        !authData.session.access_token ||
        authData.session.access_token === 'mock-token' ||
        !authData?.user?.id
      ) {
        try {
          const { error: recordErr } = await rawSupabaseClient.rpc('record_admin_login_attempt', {
            p_email: rawEmail,
            p_success: false,
            p_ip: '',
          });
          if (recordErr) {
            await rawSupabaseClient.from('admin_login_attempts').insert({
              email: rawEmail,
              success: false,
              attempted_at: new Date().toISOString(),
            });
          }
        } catch {
          void rawSupabaseClient.from('admin_login_attempts').insert({
            email: rawEmail,
            success: false,
            attempted_at: new Date().toISOString(),
          });
        }

        setSession(null);
        setUser(null);
        setProfile(null);

        return {
          error: authError?.message || 'Invalid email or password.',
        };
      }

      // 3. Cryptographically verify the returned JWT with Supabase Auth server
      const { data: verifiedUserData, error: verifyError } = await rawSupabaseClient.auth.getUser(
        authData.session.access_token
      );

      if (verifyError || !verifiedUserData?.user || verifiedUserData.user.id !== authData.user.id) {
        await rawSupabaseClient.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        return {
          error: verifyError?.message || 'Session verification failed.',
        };
      }

      // 4. Verify the authenticated Supabase user has administrator or store owner role
      const verifiedEmail = (verifiedUserData.user.email || '').toLowerCase();
      const prof = await fetchProfileFromSupabase(verifiedUserData.user.id);
      const appMetaRole = (verifiedUserData.user.app_metadata as Record<string, unknown> | undefined)?.role;

      const isAuthorized =
        prof?.role === 'admin' ||
        prof?.role === 'owner' ||
        appMetaRole === 'admin' ||
        appMetaRole === 'owner' ||
        verifiedEmail === 'admin@jazelle.com';

      if (!isAuthorized) {
        await rawSupabaseClient.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        return {
          error: 'Access denied: Your account does not have administrator privileges.',
        };
      }

      // 5. Record successful login in PostgreSQL to clear prior failed attempts
      try {
        const { error: clearErr } = await rawSupabaseClient.rpc('record_admin_login_attempt', {
          p_email: rawEmail,
          p_success: true,
          p_ip: '',
        });
        if (clearErr) {
          await rawSupabaseClient.from('admin_login_attempts').delete().eq('email', rawEmail);
        }
      } catch {
        void rawSupabaseClient.from('admin_login_attempts').delete().eq('email', rawEmail);
      }

      const activeProf: Profile = prof || {
        id: verifiedUserData.user.id,
        email: verifiedEmail,
        role: verifiedEmail === 'admin@jazelle.com' ? 'owner' : 'admin',
        display_name: verifiedEmail === 'admin@jazelle.com' ? 'Store Owner' : verifiedEmail.split('@')[0],
      };

      setSession(authData.session);
      setUser(verifiedUserData.user);
      setProfile(activeProf);

      return { error: null };
    } catch (err: unknown) {
      setSession(null);
      setUser(null);
      setProfile(null);
      const msg = err instanceof Error ? err.message : 'Authentication service error';
      return { error: `Authentication failed: ${msg}` };
    }
  };

  const signOut = async () => {
    try {
      sessionStorage.removeItem('jazelle_admin_session');
      localStorage.removeItem('jazelle_admin_session');
      localStorage.removeItem('jazelle_mock_session');
      await rawSupabaseClient.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Strictly require an active, verified Supabase session AND user with admin/owner privilege
  const isAdmin = Boolean(
    user &&
      session &&
      session.access_token &&
      session.access_token !== 'mock-token' &&
      (profile?.role === 'admin' ||
        profile?.role === 'owner' ||
        user.email?.toLowerCase() === 'admin@jazelle.com')
  );

  return (
    <AdminAuthContext.Provider value={{ user, session, profile, loading, isAdmin, signIn, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  return ctx;
}
