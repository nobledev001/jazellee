import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const SETTINGS_CACHE_KEY = 'jazelle_site_settings_cache';

// Built-in site-wide defaults
export const DEFAULT_SITE_SETTINGS: Record<string, string> = {
  // Announcements & Top Bar
  announcement_bar: 'Free delivery on orders over ₦40,000 — across Nigeria ✨',
  free_delivery_threshold: '40000',

  // Hero Section
  hero_badge: 'Now delivering across Nigeria',
  hero_headline: 'Your little self-care haven',
  hero_subtitle:
    'Skincare, body care & little things that make you feel good. Thoughtfully picked for the modern Nigerian woman — soft, warm, and made for you.',
  hero_cta_primary_label: 'Shop Now',
  hero_cta_primary_link: '/shop',
  hero_cta_secondary_label: 'Explore Self-Care',
  hero_cta_secondary_link: '/categories/self-care',
  hero_social_proof: 'Loved by 500+ women across Nigeria',

  // Countdown & Flash Sale Banner
  countdown_enabled: 'true',
  countdown_mode: 'launch', // 'launch' | 'flash_sale'
  countdown_headline: 'Our full shop goes live soon',
  countdown_subtext: 'Counting down to something special. In the meantime, explore our preview collection.',
  countdown_target_date: '2026-10-10T00:00:00',
  countdown_live_headline: "We're live!",
  countdown_live_subtext:
    'The Jazelle Skin Haven shop is officially open. Come explore our full collection of self-care favourites.',

  // About Page & Founder Story
  about_hero_title: 'Welcome to the haven',
  about_hero_subtitle: 'A warm, gentle corner built for your skincare journey in Nigeria.',
  founder_greeting: 'Hi, I’m Jazelle — and this is my little corner for you.',
  founder_intro:
    'What started as a personal obsession with soft, happy skin in the Nigerian climate turned into a dream to build something gentle, warm, and welcoming for every woman who wants to care for herself.',
  founder_image_url:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
  founder_quote: 'Skincare shouldn’t feel intimidating or overwhelming. It should feel like coming home to yourself.',

  // Homepage Sections
  need_help_headline: 'Need Help Choosing?',
  need_help_subtext:
    'Not sure what your skin needs? Chat with our team for personalised routine recommendations via WhatsApp.',
  need_help_button: 'Chat with us on WhatsApp',
  follow_haven_headline: 'Follow the Haven',
  follow_haven_subtext: 'Daily rituals, product tips, and behind-the-scenes on our Instagram.',
  newsletter_headline: 'Join the Haven Letter',
  newsletter_subtext:
    'Gentle skin tips, secret restocks, and a warm welcome note. Never spam, just genuine love.',

  // Store & Contact Info
  support_phone: '+234 812 345 6789',
  support_email: 'hello@jazelleskinhaven.com',
  store_address: 'Wuse II, Abuja, Nigeria',
  instagram_handle: '@jazelle.skin.haven',
  instagram_url: 'https://www.instagram.com/jazelle.skin.haven',
  tiktok_handle: '@jazelleskinhaven',
  tiktok_url: 'https://www.tiktok.com/@jazelleskinhaven',
  whatsapp_url: 'https://wa.me/message/ET5GM7MR4LYIC1',
  whatsapp_number: '+2348123456789',
  delivery_lagos_fee: '2500',
  delivery_national_fee: '4500',
};

export function getInitialSettings(): Record<string, string> {
  if (typeof window === 'undefined') return { ...DEFAULT_SITE_SETTINGS };
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      return { ...DEFAULT_SITE_SETTINGS, ...JSON.parse(cached) };
    }
  } catch {
    // ignore local storage errors
  }
  return { ...DEFAULT_SITE_SETTINGS };
}

export interface SiteSettingsContextValue {
  settings: Record<string, string>;
  loading: boolean;
  getSetting: (key: string, fallback?: string) => string;
  updateSetting: (key: string, value: string) => Promise<boolean>;
  updateMultipleSettings: (entries: Record<string, string>) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, string>>(getInitialSettings);
  const [loading, setLoading] = useState(false);

  const fetchLatestSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('key, value');
      if (!error && data && data.length > 0) {
        const mapped: Record<string, string> = {};
        data.forEach((row) => {
          if (row.key && row.value !== undefined && row.value !== null) {
            mapped[row.key] = String(row.value);
          }
        });

        setSettings((prev) => {
          const merged = { ...prev, ...mapped };
          try {
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(merged));
          } catch {
            // ignore quota
          }
          return merged;
        });
      }
    } catch (err) {
      console.warn('[SiteSettings] Load notice:', err);
    }
  }, []);

  useEffect(() => {
    fetchLatestSettings();

    // Single realtime channel with unique name to prevent any collisions
    const channelId = `site_settings_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let channel: unknown = null;
    if (typeof supabase?.channel === 'function') {
      try {
        channel = supabase
          .channel(channelId)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'site_settings' },
            () => {
              fetchLatestSettings();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('[SiteSettings] Realtime subscription init notice:', err);
      }
    }

    // Window event listener for instant local updates across tabs or admin updates
    const onLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Record<string, string>>;
      if (customEvent.detail) {
        setSettings((prev) => ({ ...prev, ...customEvent.detail }));
      } else {
        fetchLatestSettings();
      }
    };
    window.addEventListener('jazelle_settings_updated', onLocalUpdate);

    return () => {
      if (channel && typeof supabase?.removeChannel === 'function') {
        try {
          void supabase.removeChannel(channel as Parameters<typeof supabase.removeChannel>[0]);
        } catch {
          // ignore
        }
      }
      window.removeEventListener('jazelle_settings_updated', onLocalUpdate);
    };
  }, [fetchLatestSettings]);

  const getSetting = useCallback(
    (key: string, fallback?: string): string => {
      if (settings[key] !== undefined && settings[key] !== '') {
        return settings[key];
      }
      if (DEFAULT_SITE_SETTINGS[key] !== undefined) {
        return DEFAULT_SITE_SETTINGS[key];
      }
      return fallback ?? '';
    },
    [settings]
  );

  const updateSetting = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error } = await supabase.from('site_settings').upsert(
          {
            key,
            value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

        if (error) throw error;

        setSettings((prev) => {
          const next = { ...prev, [key]: value };
          try {
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next));
          } catch {
            // quota
          }
          return next;
        });

        window.dispatchEvent(
          new CustomEvent('jazelle_settings_updated', { detail: { [key]: value } })
        );

        return true;
      } catch (err) {
        console.error('[SiteSettings] Failed to update setting:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateMultipleSettings = useCallback(
    async (entries: Record<string, string>): Promise<boolean> => {
      setLoading(true);
      try {
        const rows = Object.entries(entries).map(([key, value]) => ({
          key,
          value,
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('site_settings')
          .upsert(rows, { onConflict: 'key' });

        if (error) throw error;

        setSettings((prev) => {
          const next = { ...prev, ...entries };
          try {
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(next));
          } catch {
            // quota
          }
          return next;
        });

        window.dispatchEvent(
          new CustomEvent('jazelle_settings_updated', { detail: entries })
        );

        return true;
      } catch (err) {
        console.error('[SiteSettings] Failed to save multiple settings:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const value = useMemo<SiteSettingsContextValue>(
    () => ({
      settings,
      loading,
      getSetting,
      updateSetting,
      updateMultipleSettings,
      refresh: fetchLatestSettings,
    }),
    [settings, loading, getSetting, updateSetting, updateMultipleSettings, fetchLatestSettings]
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings(): SiteSettingsContextValue {
  const context = useContext(SiteSettingsContext);
  if (context) {
    return context;
  }

  // Safe fallback if called outside provider: read from local cache without setting up rogue channels
  const initial = getInitialSettings();
  return {
    settings: initial,
    loading: false,
    getSetting: (key: string, fallback?: string) => {
      if (initial[key] !== undefined && initial[key] !== '') {
        return initial[key];
      }
      if (DEFAULT_SITE_SETTINGS[key] !== undefined) {
        return DEFAULT_SITE_SETTINGS[key];
      }
      return fallback ?? '';
    },
    updateSetting: async () => false,
    updateMultipleSettings: async () => false,
    refresh: async () => {},
  };
}
