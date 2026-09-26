import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface SiteSettings {
  // Hero Section
  hero_badge: string;
  hero_headline: string;
  hero_subtitle: string;
  hero_cta_primary_label: string;
  hero_cta_primary_link: string;
  hero_cta_secondary_label: string;
  hero_cta_secondary_link: string;
  hero_social_proof: string;

  // Countdown Banner
  countdown_enabled: string;
  countdown_target_date: string;
  countdown_headline: string;
  countdown_subtitle: string;
  countdown_post_launch_headline: string;
  countdown_post_launch_subtitle: string;

  // About / Founder Section
  about_headline: string;
  about_story_p1: string;
  about_story_p2: string;
  about_founder_name: string;
  about_founder_title: string;
  about_founder_quote: string;

  // Homepage Sections
  bestsellers_title: string;
  bestsellers_subtitle: string;
  categories_title: string;
  categories_subtitle: string;
  testimonials_title: string;
  testimonials_subtitle: string;

  // Store & Contact Info
  announcement_bar: string;
  whatsapp_number: string;
  support_email: string;
  instagram_handle: string;
  tiktok_handle: string;
  store_location: string;
  free_delivery_threshold: string;
  [key: string]: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  hero_badge: 'Now delivering across Nigeria',
  hero_headline: 'Your little self-care haven',
  hero_subtitle:
    'Skincare, body care & little things that make you feel good — curated with love for Nigerian women.',
  hero_cta_primary_label: 'Shop Now',
  hero_cta_primary_link: '/shop',
  hero_cta_secondary_label: 'Explore Self-Care',
  hero_cta_secondary_link: '/categories/self-care',
  hero_social_proof: 'Loved by 500+ women across Nigeria',

  countdown_enabled: 'true',
  countdown_target_date: '2025-07-01T00:00:00+01:00',
  countdown_headline: 'Our full shop goes live soon',
  countdown_subtitle:
    'Waitlist members get 24-hour early access and a special launch gift on opening day.',
  countdown_post_launch_headline: 'Waitlist is now open for our next restock drop',
  countdown_post_launch_subtitle:
    'Join the inner circle for first dibs on limited-batch body oils and new arrivals.',

  about_headline: 'Thoughtfully chosen for everyday softness',
  about_story_p1:
    'Jazelle started with a simple wish: to make shopping for skincare and body care in Nigeria feel calm, trustworthy, and genuinely joyful.',
  about_story_p2:
    'Instead of overwhelming you with hundreds of confusing bottles, we curate gentle, effective favourites that fit into real routines and real Abuja & Lagos weather.',
  about_founder_name: 'Jazelle',
  about_founder_title: 'Founder & Curator',
  about_founder_quote: 'Self-care does not have to be complicated to feel special.',

  bestsellers_title: 'Most-loved right now',
  bestsellers_subtitle: 'Customer Favourites',
  categories_title: 'What are you in the mood for?',
  categories_subtitle: 'Shop by Category',
  testimonials_title: 'Sweet words from the Haven',
  testimonials_subtitle: 'Real Customer Love',

  announcement_bar: '✨ Free delivery on orders over ₦35,000 • Nationwide shipping across Nigeria',
  whatsapp_number: '2348000000000',
  support_email: 'hello@jazelle.ng',
  instagram_handle: '@jazelleskinhaven',
  tiktok_handle: '@jazelleskinhaven',
  store_location: 'Abuja, Nigeria (Nationwide Delivery)',
  free_delivery_threshold: '35000',
};

interface SiteSettingsContextValue {
  settings: SiteSettings;
  loading: boolean;
  getSetting: (key: string, fallback?: string) => string;
  refreshSettings: () => Promise<void>;
  updateSettingLocally: (key: string, value: string) => void;
  updateMultipleSettingsLocally: (updates: Record<string, string>) => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings: DEFAULT_SITE_SETTINGS,
  loading: false,
  getSetting: (key: string, fallback?: string) =>
    DEFAULT_SITE_SETTINGS[key] !== undefined ? DEFAULT_SITE_SETTINGS[key] : fallback ?? '',
  refreshSettings: async () => {},
  updateSettingLocally: () => {},
  updateMultipleSettingsLocally: () => {},
});

export const SiteSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('site_settings').select('key, value');
      if (!error && data && data.length > 0) {
        const dbMap: Record<string, string> = {};
        data.forEach((row: { key: string; value: string }) => {
          if (row.key && row.value !== undefined && row.value !== null) {
            dbMap[row.key] = String(row.value);
          }
        });

        const merged: SiteSettings = {
          ...DEFAULT_SITE_SETTINGS,
          ...dbMap,
        };
        setSettings(merged);
      }
    } catch {
      // Fall back to in-memory defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();

    // Real-time subscription to site_settings changes
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      if (typeof supabase.channel === 'function') {
        channel = supabase
          .channel('public:site_settings_changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'site_settings' },
            () => {
              refreshSettings();
            }
          )
          .subscribe();
      }
    } catch {
      // Ignore realtime channel errors
    }

    const handleCustomUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<Record<string, string>>;
      if (customEvent.detail) {
        setSettings((prev) => ({
          ...prev,
          ...customEvent.detail,
        }));
      } else {
        refreshSettings();
      }
    };

    window.addEventListener('jazelle_settings_updated', handleCustomUpdate);

    return () => {
      if (channel && typeof supabase.removeChannel === 'function') {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
      window.removeEventListener('jazelle_settings_updated', handleCustomUpdate);
    };
  }, [refreshSettings]);

  const updateSettingLocally = useCallback((key: string, value: string) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      window.dispatchEvent(new CustomEvent('jazelle_settings_updated', { detail: { [key]: value } }));
      return next;
    });
  }, []);

  const updateMultipleSettingsLocally = useCallback((updates: Record<string, string>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      window.dispatchEvent(new CustomEvent('jazelle_settings_updated', { detail: updates }));
      return next;
    });
  }, []);

  const getSetting = useCallback(
    (key: string, fallback?: string): string => {
      const val = settings[key];
      if (val !== undefined && val !== '') {
        return val;
      }
      if (fallback !== undefined) {
        return fallback;
      }
      return DEFAULT_SITE_SETTINGS[key] ?? '';
    },
    [settings]
  );

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        loading,
        getSetting,
        refreshSettings,
        updateSettingLocally,
        updateMultipleSettingsLocally,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => useContext(SiteSettingsContext);
