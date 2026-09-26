import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isValidSupabaseUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Clean up any legacy mock sessions or localStorage database mirrors from previous versions
const purgeLegacyLocalMirrors = () => {
  if (typeof window === 'undefined') return;
  try {
    const legacyLocalStorageKeys = [
      'jazelle_mock_auth_session',
      'jazelle_admin_auth',
      'jazelle_admin_session',
      'jazelle_verified_admin_v2',
      'jazelle_db_orders',
      'jazelle_db_products',
      'jazelle_db_coupons',
      'jazelle_db_product_reviews',
      'jazelle_db_profiles',
      'jazelle_db_site_settings',
      'jazelle_db_journal_articles',
      'jazelle_db_faq_sections',
      'jazelle_db_faq_items',
      'jazelle_deleted_products',
      'jazelle_deleted_coupons',
      'jazelle_deleted_product_reviews',
      'jazelle_deleted_orders',
      'jazelle_deleted_journal_articles',
      'jazelle_deleted_faq_sections',
      'jazelle_deleted_faq_items',
      'jazelle_registered_customers',
      'jazelle_newsletter_subscribers',
      'jazelle_site_settings_cache',
      'jazelle-applied-coupon',
    ];

    for (const key of legacyLocalStorageKeys) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    }

    // Also remove any dynamic jazelle_db_*, jazelle_deleted_*, or jazelle_storage_* keys
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (
        k &&
        (k.startsWith('jazelle_db_') ||
          k.startsWith('jazelle_deleted_') ||
          k.startsWith('jazelle_storage_'))
      ) {
        window.localStorage.removeItem(k);
      }
    }
  } catch {
    // Ignore storage cleanup errors
  }
};

purgeLegacyLocalMirrors();

if (!isValidSupabaseUrl(rawUrl) || !rawKey) {
  console.error(
    '[Supabase] Missing or invalid VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

export const rawSupabaseClient: SupabaseClient = createClient(rawUrl, rawKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const supabase: SupabaseClient = rawSupabaseClient;
