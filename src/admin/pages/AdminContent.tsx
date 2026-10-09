import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  HelpCircle,
  Save,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Loader2,
  Clock,
  Eye,
  EyeOff,
  Layout,
  Timer,
  User,
  Phone,
  Truck,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Image as ImageIcon,
  Layers,
  Search,
  ChevronRight,
  Instagram,
  MessageCircle,
} from 'lucide-react';
import { supabase, type DbJournalArticle, type DbFaqSection, type DbFaqItem } from '../supabase';
import ArticleModal from '../components/ArticleModal';
import FaqItemModal from '../components/FaqItemModal';
import FaqSectionModal from '../components/FaqSectionModal';
import ImageUploadField from '../components/ImageUploadField';
import { DEFAULT_SITE_SETTINGS } from '@/hooks/useSiteSettings';
import concernDarkSpotsImg from '@/assets/images/macro_skin_dark_spots_1790509837383.jpg';
import concernDrySkinImg from '@/assets/images/macro_skin_dry_skin_1790509851867.jpg';
import concernUnevenToneImg from '@/assets/images/macro_skin_uneven_tone_1790509862896.jpg';
import concernBodyBumpsImg from '@/assets/images/macro_skin_body_bumps_1790509874175.jpg';
import concernDullSkinImg from '@/assets/images/macro_skin_dull_skin_1790509883787.jpg';
import concernSunProtectionImg from '@/assets/images/macro_skin_sun_protection_1790509895105.jpg';
import concernSoftFreshImg from '@/assets/images/macro_skin_soft_fresh_1790509905630.jpg';

// ---------------------------------------------------------------------------
// CONCERN CATEGORIES CONFIGURATION
// ---------------------------------------------------------------------------
const CONCERN_CONFIG = [
  {
    key: 'concern_image_dark_spots',
    title: 'Dark Spots',
    question: 'Dark spots?',
    targetSlug: 'dark-spots',
    defaultImg: concernDarkSpotsImg,
    badge: 'Hyperpigmentation & Blemishes',
    description: 'Targeted hyperpigmentation, acne marks, and melasma care.',
  },
  {
    key: 'concern_image_dry_skin',
    title: 'Dry Skin',
    question: 'Dry skin?',
    targetSlug: 'dry-skin',
    defaultImg: concernDrySkinImg,
    badge: 'Moisture Barrier & Hydration',
    description: 'Deep barrier hydration, ceramides, and rich moisture balms.',
  },
  {
    key: 'concern_image_uneven_tone',
    title: 'Uneven Skin Tone',
    question: 'Uneven skin tone?',
    targetSlug: 'uneven-tone',
    defaultImg: concernUnevenToneImg,
    badge: 'Radiance & Brightening',
    description: 'Gentle brightening, vitamin C, and radiant tone clarifying.',
  },
  {
    key: 'concern_image_body_bumps',
    title: 'Body Bumps',
    question: 'Body bumps?',
    targetSlug: 'body-bumps',
    defaultImg: concernBodyBumpsImg,
    badge: 'Texture & Smoothing',
    description: 'Keratosis pilaris, body breakouts, and smoothing scrubs.',
  },
  {
    key: 'concern_image_dull_skin',
    title: 'Dull Skin',
    question: 'Dull skin?',
    targetSlug: 'dull-skin',
    defaultImg: concernDullSkinImg,
    badge: 'Glow & Renewal',
    description: 'Exfoliation, glow serums, and tired skin revitalizers.',
  },
  {
    key: 'concern_image_sun_protection',
    title: 'Sun Protection',
    question: 'Need better sun protection?',
    targetSlug: 'sun-protection',
    defaultImg: concernSunProtectionImg,
    badge: 'SPF & Daily Shield',
    description: 'Broad spectrum SPF 50+, no white cast on dark skin.',
  },
  {
    key: 'concern_image_soft_fresh',
    title: 'Soft & Fresh',
    question: 'Just want to feel softer & fresher?',
    targetSlug: 'soft-fresh',
    defaultImg: concernSoftFreshImg,
    badge: 'Everyday Indulgence',
    description: 'Silky body oils, luxurious washes, and everyday softness.',
  },
];

// ---------------------------------------------------------------------------
// ORDERED STOREFRONT SECTIONS METADATA (Top-to-Bottom Customer Flow)
// ---------------------------------------------------------------------------
export type ContentSectionId =
  | 'store_info'
  | 'hero'
  | 'concerns'
  | 'homepage'
  | 'countdown'
  | 'about'
  | 'delivery';

interface SectionMeta {
  id: ContentSectionId;
  order: string;
  name: string;
  shortDesc: string;
  icon: typeof Phone;
  badge: string;
  badgeBg: string;
}

const ORDERED_SECTIONS: SectionMeta[] = [
  {
    id: 'store_info',
    order: '01',
    name: 'Top Announcement & Contact',
    shortDesc: 'Top banner, WhatsApp, phone, email & studio address',
    icon: Phone,
    badge: 'Header Bar',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'hero',
    order: '02',
    name: 'Hero Showcase & Headline',
    shortDesc: 'Primary banner, headline, description & CTA buttons',
    icon: Sparkles,
    badge: 'Above Fold',
    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  {
    id: 'concerns',
    order: '03',
    name: 'Shop By Concern Photography',
    shortDesc: '7 custom skin concern photo tiles & titles',
    icon: Layers,
    badge: '7 Visuals',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    id: 'homepage',
    order: '04',
    name: 'Homepage Interactive Modules',
    shortDesc: 'WhatsApp help consultation, Instagram & TikTok grid',
    icon: Layout,
    badge: 'Community',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'countdown',
    order: '05',
    name: 'Launch & Flash Countdown',
    shortDesc: 'Target date, restock drop timer & pre/post headlines',
    icon: Timer,
    badge: 'Flash Timer',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'about',
    order: '06',
    name: 'About Page & Founder Story',
    shortDesc: 'Founder greeting, story text & portrait on /about',
    icon: User,
    badge: 'Brand Story',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  {
    id: 'delivery',
    order: '07',
    name: 'Delivery Pricing & Logistics',
    shortDesc: 'Doorstep, Motor Park waybill & Fez delivery fees',
    icon: Truck,
    badge: 'Checkout Fees',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];

export default function AdminContent() {
  const [activeTab, setActiveTab] = useState<'content' | 'journal' | 'faq'>('content');
  const [contentSubTab, setContentSubTab] = useState<ContentSectionId | 'all'>('all');
  const [viewMode, setViewMode] = useState<'all' | 'focus'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ----------------------------------------------------
  // DYNAMIC SITE CONTENT STATE
  // ----------------------------------------------------
  const [settings, setSettings] = useState<Record<string, string>>({ ...DEFAULT_SITE_SETTINGS });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ----------------------------------------------------
  // JOURNAL TAB STATE
  // ----------------------------------------------------
  const [articles, setArticles] = useState<DbJournalArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<DbJournalArticle | null>(null);

  // ----------------------------------------------------
  // FAQ TAB STATE
  // ----------------------------------------------------
  const [faqSections, setFaqSections] = useState<DbFaqSection[]>([]);
  const [faqItems, setFaqItems] = useState<DbFaqItem[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingFaqItem, setEditingFaqItem] = useState<DbFaqItem | null>(null);
  const [selectedSectionForNewItem, setSelectedSectionForNewItem] = useState<string>('');
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingFaqSection, setEditingFaqSection] = useState<DbFaqSection | null>(null);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // ----------------------------------------------------
  // FETCHERS
  // ----------------------------------------------------
  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase.from('site_settings').select('*');
      if (error) throw error;
      const map: Record<string, string> = {};
      if (data && data.length > 0) {
        data.forEach((row: { key: string; value: string }) => {
          if (row.key && row.value !== undefined) {
            map[row.key] = String(row.value);
          }
        });
      }
      if (Object.keys(map).length > 0) {
        setSettings((prev) => ({ ...prev, ...map }));
      }
    } catch (err) {
      console.warn('Could not load site_settings from Supabase:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchArticles = async () => {
    setLoadingArticles(true);
    try {
      const { data, error } = await supabase
        .from('journal_articles')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      if (data) setArticles(data as DbJournalArticle[]);
    } catch (err) {
      console.warn('Could not load journal articles:', err);
    } finally {
      setLoadingArticles(false);
    }
  };

  const fetchFaqs = async () => {
    setLoadingFaqs(true);
    try {
      const [secRes, itemRes] = await Promise.all([
        supabase.from('faq_sections').select('*').order('sort_order', { ascending: true }),
        supabase.from('faq_items').select('*').order('sort_order', { ascending: true }),
      ]);
      if (secRes.data) setFaqSections(secRes.data as DbFaqSection[]);
      if (itemRes.data) setFaqItems(itemRes.data as DbFaqItem[]);
    } catch (err) {
      console.warn('Could not load FAQs:', err);
    } finally {
      setLoadingFaqs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchArticles();
    fetchFaqs();
  }, []);

  // Keyboard shortcut Ctrl+S or Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        void handleSaveAllSettings();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ----------------------------------------------------
  // SAVE SITE CONTENT
  // ----------------------------------------------------
  const handleSaveAllSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      const rows = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;

      window.dispatchEvent(new CustomEvent('jazelle_settings_updated', { detail: settings }));

      setHasChanges(false);
      showToast('All website content saved and updated live!');
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to save settings.';
      showToast(`Database error saving settings: ${errMsg}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // Scroll to section helper
  const navigateToSection = (secId: ContentSectionId) => {
    if (viewMode === 'all') {
      const el = sectionRefs.current[secId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      setContentSubTab(secId);
    }
  };

  // ----------------------------------------------------
  // ARTICLE ACTIONS
  // ----------------------------------------------------
  const togglePublishArticle = async (art: DbJournalArticle) => {
    try {
      const newStatus = !art.is_published;
      const { error } = await supabase
        .from('journal_articles')
        .update({ is_published: newStatus, updated_at: new Date().toISOString() })
        .eq('id', art.id);
      if (error) throw error;
      setArticles((prev) =>
        prev.map((a) => (a.id === art.id ? { ...a, is_published: newStatus } : a))
      );
      showToast(newStatus ? 'Article published.' : 'Article unpublished.');
    } catch (err) {
      console.error('Toggle article error:', err);
      alert('Could not update article status.');
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this journal article?')) return;
    try {
      const { error } = await supabase.from('journal_articles').delete().eq('id', id);
      if (error) throw error;
      setArticles((prev) => prev.filter((a) => a.id !== id));
      showToast('Article deleted.');
    } catch (err) {
      console.error('Delete article error:', err);
      alert('Could not delete article.');
    }
  };

  // ----------------------------------------------------
  // FAQ ACTIONS
  // ----------------------------------------------------
  const deleteFaqSection = async (id: string) => {
    if (!confirm('Delete this section? All its questions will also be removed.')) return;
    try {
      const { error } = await supabase.from('faq_sections').delete().eq('id', id);
      if (error) throw error;
      setFaqSections((prev) => prev.filter((s) => s.id !== id));
      setFaqItems((prev) => prev.filter((i) => i.section_id !== id));
      showToast('FAQ Section deleted.');
    } catch (err) {
      console.error('Delete FAQ section error:', err);
      alert('Could not delete section.');
    }
  };

  const deleteFaqItem = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    try {
      const { error } = await supabase.from('faq_items').delete().eq('id', id);
      if (error) throw error;
      setFaqItems((prev) => prev.filter((i) => i.id !== id));
      showToast('FAQ question deleted.');
    } catch (err) {
      console.error('Delete FAQ item error:', err);
      alert('Could not delete FAQ item.');
    }
  };

  // Filter sections by search query
  const filteredSections = ORDERED_SECTIONS.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sec.name.toLowerCase().includes(q) ||
      sec.shortDesc.toLowerCase().includes(q) ||
      sec.id.toLowerCase().includes(q)
    );
  });

  // ----------------------------------------------------
  // SECTION RENDERERS
  // ----------------------------------------------------

  // 1. ANNOUNCEMENT & CONTACT
  const renderStoreInfoSection = () => (
    <div
      id="section-store_info"
      ref={(el) => {
        sectionRefs.current['store_info'] = el;
      }}
      className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-6 transition-all hover:border-emerald-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
            01
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              <span>Top Announcement &amp; Store Contact</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              The high-visibility top announcement bar visible across every page, plus official WhatsApp, email &amp; physical location.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          Global Header Bar
        </span>
      </div>

      {/* Live Preview Ribbon */}
      <div className="rounded-xl bg-pink-50/80 border border-pink-200 p-3 sm:p-4 space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-700">
          Live Storefront Announcement Bar Preview:
        </span>
        <div className="rounded-lg bg-berry-900 text-white px-4 py-2.5 text-xs text-center font-medium shadow-xs truncate">
          ✨ {settings.announcement_bar || 'Free delivery on orders over ₦35,000 • Nationwide shipping across Nigeria'}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Top Announcement Bar Text <span className="text-pink-600">*</span>
          </label>
          <input
            type="text"
            required
            value={settings.announcement_bar || ''}
            onChange={(e) => handleSettingChange('announcement_bar', e.target.value)}
            placeholder="Free delivery on orders over ₦35,000 • Nationwide shipping across Nigeria"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-medium"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Displayed on every single page at the very top of the website.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Customer WhatsApp Number (International)
            </label>
            <input
              type="text"
              value={settings.whatsapp_number || '+2347017186752'}
              onChange={(e) => handleSettingChange('whatsapp_number', e.target.value)}
              placeholder="2347017186752"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Used for instant WhatsApp chat redirection buttons on the storefront.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Support Phone (Formatted display)
            </label>
            <input
              type="text"
              value={settings.support_phone || ''}
              onChange={(e) => handleSettingChange('support_phone', e.target.value)}
              placeholder="+234 701 718 6752"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Support Email Address
            </label>
            <input
              type="email"
              value={settings.support_email || ''}
              onChange={(e) => handleSettingChange('support_email', e.target.value)}
              placeholder="hello@jazelle.ng"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Free Delivery Threshold (₦)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                ₦
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={settings.free_delivery_threshold || '35000'}
                onChange={(e) => handleSettingChange('free_delivery_threshold', e.target.value)}
                placeholder="35000"
                className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Physical Studio / Store Address
            </label>
            <input
              type="text"
              value={settings.store_address || settings.store_location || ''}
              onChange={(e) => {
                handleSettingChange('store_address', e.target.value);
                handleSettingChange('store_location', e.target.value);
              }}
              placeholder="Abuja, Nigeria (Nationwide Delivery)"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // 2. HERO SHOWCASE
  const renderHeroSection = () => (
    <div
      id="section-hero"
      ref={(el) => {
        sectionRefs.current['hero'] = el;
      }}
      className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-6 transition-all hover:border-pink-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-pink-700 font-bold text-xs border border-pink-200">
            02
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pink-600" />
              <span>Hero Section Showcase &amp; Headlines</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              The primary hero visual, prominent greeting, CTA buttons, and social proof counter on landing.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto text-[11px] font-medium px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
          Above The Fold
        </span>
      </div>

      {/* Hero Live Preview Card */}
      <div className="rounded-xl bg-gradient-to-br from-cream-50 via-rose-50/40 to-pink-50/60 border border-pink-100 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-pink-800">
            Live Hero Typography Preview
          </span>
          <span className="text-[10px] text-gray-500">{settings.hero_social_proof}</span>
        </div>
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-white text-[11px] font-semibold text-pink-600 border border-pink-200/60 shadow-xs">
            {settings.hero_badge || 'Now delivering across Nigeria'}
          </span>
          <h4 className="font-display text-lg sm:text-xl font-bold text-gray-900 leading-tight">
            {settings.hero_headline || 'Your little self-care haven'}
          </h4>
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 max-w-xl">
            {settings.hero_subtitle || 'Skincare, body care & little things that make you feel good — curated with love for Nigerian women.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="px-3.5 py-1.5 rounded-lg bg-pink-600 text-white text-xs font-medium shadow-xs">
              {settings.hero_cta_primary_label || 'Shop Now'} →
            </span>
            <span className="px-3.5 py-1.5 rounded-lg bg-white text-gray-700 text-xs font-medium border border-gray-200">
              {settings.hero_cta_secondary_label || 'Explore Self-Care'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Floating Top Badge Text
          </label>
          <input
            type="text"
            value={settings.hero_badge || ''}
            onChange={(e) => handleSettingChange('hero_badge', e.target.value)}
            placeholder="Now delivering across Nigeria"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Main Hero Headline <span className="text-pink-600">*</span>
          </label>
          <input
            type="text"
            value={settings.hero_headline || ''}
            onChange={(e) => handleSettingChange('hero_headline', e.target.value)}
            placeholder="Your little self-care haven"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Hero Description / Subtitle
          </label>
          <textarea
            rows={3}
            value={settings.hero_subtitle || ''}
            onChange={(e) => handleSettingChange('hero_subtitle', e.target.value)}
            placeholder="Skincare, body care & little things that make you feel good..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
          />
        </div>

        <div>
          <ImageUploadField
            label="Custom Hero Banner Background Image (Optional)"
            value={settings.hero_banner_image || ''}
            onChange={(url) => handleSettingChange('hero_banner_image', url)}
            bucketName="site-assets"
            aspectRatioLabel="Landscape 16:9 or 21:9 (min 1920×1080)"
            helpText="Upload a custom hero banner from your device or leave blank to use default slider."
            previewClassName="h-24 w-40 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Primary Button Label
            </label>
            <input
              type="text"
              value={settings.hero_cta_primary_label || ''}
              onChange={(e) => handleSettingChange('hero_cta_primary_label', e.target.value)}
              placeholder="Shop Now"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Primary Button Link Target
            </label>
            <input
              type="text"
              value={settings.hero_cta_primary_link || ''}
              onChange={(e) => handleSettingChange('hero_cta_primary_link', e.target.value)}
              placeholder="/shop"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Secondary Button Label
            </label>
            <input
              type="text"
              value={settings.hero_cta_secondary_label || ''}
              onChange={(e) => handleSettingChange('hero_cta_secondary_label', e.target.value)}
              placeholder="Explore Self-Care"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Secondary Button Link Target
            </label>
            <input
              type="text"
              value={settings.hero_cta_secondary_link || ''}
              onChange={(e) => handleSettingChange('hero_cta_secondary_link', e.target.value)}
              placeholder="/categories/self-care"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Social Proof Counter Text
          </label>
          <input
            type="text"
            value={settings.hero_social_proof || ''}
            onChange={(e) => handleSettingChange('hero_social_proof', e.target.value)}
            placeholder="Loved by 500+ women across Nigeria"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>
    </div>
  );

  // 3. SHOP BY CONCERN
  const renderConcernsSection = () => (
    <div
      id="section-concerns"
      ref={(el) => {
        sectionRefs.current['concerns'] = el;
      }}
      className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-6 transition-all hover:border-purple-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold text-xs border border-purple-200">
            03
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-600" />
              <span>Shop By Concern — Visuals &amp; Photography</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload custom images from your device for all 7 skin concern tiles displayed on the homepage.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            7 Photo Cards
          </span>
          <a
            href="/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            <span>Live shop</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Section Titles */}
      <div className="rounded-xl border border-gray-200/80 bg-gray-50/50 p-4 space-y-3">
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
          Section Header Copy
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Eyebrow Subtitle
            </label>
            <input
              type="text"
              value={settings.concern_section_subtitle || ''}
              onChange={(e) => handleSettingChange('concern_section_subtitle', e.target.value)}
              placeholder="Find Your Match"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Main Section Title
            </label>
            <input
              type="text"
              value={settings.concern_section_title || ''}
              onChange={(e) => handleSettingChange('concern_section_title', e.target.value)}
              placeholder="Shop By Concern"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Section Description
            </label>
            <input
              type="text"
              value={settings.concern_section_description || ''}
              onChange={(e) => handleSettingChange('concern_section_description', e.target.value)}
              placeholder="Tell us what's bothering you and we'll point you to the right picks..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      </div>

      {/* 7 Skin Concern Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            All 7 Skin Concern Cards
          </h4>
          <span className="text-[11px] text-gray-400">Square 1:1 • JPEG, PNG, WEBP, AVIF</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {CONCERN_CONFIG.map((concern, idx) => {
            const customUrl = settings[concern.key]?.trim();
            const isCustom = Boolean(customUrl);
            const activeImage = customUrl || concern.defaultImg;

            return (
              <div
                key={concern.key}
                className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-xs hover:border-purple-200 transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      <h5 className="text-sm font-bold text-gray-900">{concern.title}</h5>
                    </div>

                    {isCustom ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        Custom Image
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        <ImageIcon className="h-3 w-3 text-gray-400" />
                        Default Studio
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                      “{concern.question}”
                    </span>
                    <span className="text-[11px] text-gray-400">• {concern.badge}</span>
                  </div>

                  <p className="text-xs text-gray-500">{concern.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-4 items-start pt-2 border-t border-gray-100">
                  {/* Storefront Card Simulation */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="relative w-full aspect-square max-w-[130px] rounded-2xl overflow-hidden bg-gray-900 shadow-sm border border-gray-200 group">
                      <img
                        src={activeImage}
                        alt={concern.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" />
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-gray-800 text-[10px]">
                        ↗
                      </div>
                      <p className="absolute bottom-2 left-2 right-2 text-white font-medium text-[11px] leading-tight line-clamp-2">
                        {concern.question}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">Storefront Look</span>
                  </div>

                  {/* Upload Controls */}
                  <div className="space-y-2 w-full">
                    <ImageUploadField
                      label={`Change ${concern.title} Image`}
                      value={settings[concern.key] || ''}
                      onChange={(url) => handleSettingChange(concern.key, url)}
                      bucketName="site-assets"
                      aspectRatioLabel="Square 1:1"
                      helpText="Upload from computer or drop file."
                      previewClassName="h-14 w-14 rounded-xl"
                    />

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {isCustom ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Reset ${concern.title} to default photo?`)) {
                              handleSettingChange(concern.key, '');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset to default</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Using default</span>
                      )}

                      <a
                        href={`/shop?concern=${concern.targetSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:text-purple-700 ml-auto"
                      >
                        <span>Category link</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // 4. HOMEPAGE MODULES
  const renderHomepageSection = () => (
    <div
      id="section-homepage"
      ref={(el) => {
        sectionRefs.current['homepage'] = el;
      }}
      className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-6 transition-all hover:border-blue-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
            04
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layout className="h-4 w-4 text-blue-600" />
              <span>Homepage Interactive Modules</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              WhatsApp consultation banner, plus Instagram &amp; TikTok community showcase.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          Social &amp; Advice
        </span>
      </div>

      {/* WhatsApp Consultation Banner */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>Need Help Choosing? (WhatsApp Consultation Banner)</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Banner Headline</label>
            <input
              type="text"
              value={settings.need_help_headline || ''}
              onChange={(e) => handleSettingChange('need_help_headline', e.target.value)}
              placeholder="Need help choosing?"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Button Text</label>
            <input
              type="text"
              value={settings.need_help_button || ''}
              onChange={(e) => handleSettingChange('need_help_button', e.target.value)}
              placeholder="Chat With Jazelle"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Banner Subtitle / Reassurance
            </label>
            <input
              type="text"
              value={settings.need_help_subtext || ''}
              onChange={(e) => handleSettingChange('need_help_subtext', e.target.value)}
              placeholder="Not sure what your skin needs? Don't worry, we've got you..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Follow the Haven */}
      <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-4 space-y-3">
        <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
          <Instagram className="h-3.5 w-3.5 text-purple-600" />
          <span>Follow the Haven (Social Showcase)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Headline</label>
            <input
              type="text"
              value={settings.follow_haven_headline || ''}
              onChange={(e) => handleSettingChange('follow_haven_headline', e.target.value)}
              placeholder="Follow the Haven"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Instagram Handle</label>
            <input
              type="text"
              value={settings.instagram_handle || ''}
              onChange={(e) => handleSettingChange('instagram_handle', e.target.value)}
              placeholder="@jazelle.skin.haven"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">TikTok Handle</label>
            <input
              type="text"
              value={settings.tiktok_handle || ''}
              onChange={(e) => handleSettingChange('tiktok_handle', e.target.value)}
              placeholder="@jazelleskinhaven"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Community Subtitle</label>
            <input
              type="text"
              value={settings.follow_haven_subtext || ''}
              onChange={(e) => handleSettingChange('follow_haven_subtext', e.target.value)}
              placeholder="Self-care tips, behind-the-scenes..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // 5. COUNTDOWN BANNER
  const renderCountdownSection = () => (
    <div
      id="section-countdown"
      ref={(el) => {
        sectionRefs.current['countdown'] = el;
      }}
      className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-6 transition-all hover:border-amber-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
            05
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Timer className="h-4 w-4 text-amber-500" />
              <span>Launch &amp; Flash-Sale Countdown Banner</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Display a live countdown timer for restocks, promotional events, or store launches.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            checked={settings.countdown_enabled === 'true'}
            onChange={(e) =>
              handleSettingChange('countdown_enabled', e.target.checked ? 'true' : 'false')
            }
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          <span className="ml-2 text-xs font-semibold text-gray-700">
            {settings.countdown_enabled === 'true' ? 'Active On Site' : 'Hidden'}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Target Countdown Date &amp; Time
          </label>
          <input
            type="datetime-local"
            value={
              settings.countdown_target_date ? settings.countdown_target_date.substring(0, 16) : ''
            }
            onChange={(e) => handleSettingChange('countdown_target_date', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Pre-Launch Headline
          </label>
          <input
            type="text"
            value={settings.countdown_headline || ''}
            onChange={(e) => handleSettingChange('countdown_headline', e.target.value)}
            placeholder="Our full shop goes live soon"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Pre-Launch Subtitle
          </label>
          <input
            type="text"
            value={settings.countdown_subtext || settings.countdown_subtitle || ''}
            onChange={(e) => {
              handleSettingChange('countdown_subtext', e.target.value);
              handleSettingChange('countdown_subtitle', e.target.value);
            }}
            placeholder="Waitlist members get 24-hour early access and special launch gift..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>
    </div>
  );

  // 6. ABOUT PAGE & FOUNDER
  const renderAboutSection = () => (
    <div
      id="section-about"
      ref={(el) => {
        sectionRefs.current['about'] = el;
      }}
      className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-6 transition-all hover:border-rose-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200">
            06
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <User className="h-4 w-4 text-rose-600" />
              <span>About Page &amp; Founder Story</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure founder greetings, photo, and brand note displayed on <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">/about</code>.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto text-[11px] font-medium px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          /about page
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Section Subtitle</label>
          <input
            type="text"
            value={settings.about_hero_subtitle || ''}
            onChange={(e) => handleSettingChange('about_hero_subtitle', e.target.value)}
            placeholder="Our Story"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Founder Greeting Headline
          </label>
          <input
            type="text"
            value={settings.founder_greeting || settings.about_headline || ''}
            onChange={(e) => {
              handleSettingChange('founder_greeting', e.target.value);
              handleSettingChange('about_headline', e.target.value);
            }}
            placeholder="Thoughtfully chosen for everyday softness"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-500 font-medium"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Founder Story &amp; Brand Philosophy
          </label>
          <textarea
            rows={4}
            value={settings.founder_intro || settings.about_story_p1 || ''}
            onChange={(e) => {
              handleSettingChange('founder_intro', e.target.value);
              handleSettingChange('about_story_p1', e.target.value);
            }}
            placeholder="Jazelle started with a simple wish: to make shopping for skincare and body care in Nigeria feel calm, trustworthy, and genuinely joyful..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-500 leading-relaxed"
          />
        </div>

        <div className="sm:col-span-2">
          <ImageUploadField
            label="Founder Portrait Photo"
            value={settings.founder_image_url || ''}
            onChange={(url) => handleSettingChange('founder_image_url', url)}
            bucketName="site-assets"
            aspectRatioLabel="Square or 4:5 portrait (min 800×800)"
            helpText="Upload a warm photo of Jazelle displayed on the /about story page."
            previewClassName="h-24 w-24 rounded-full"
          />
        </div>
      </div>
    </div>
  );

  // 7. DELIVERY SETTINGS
  const renderDeliverySection = () => (
    <div
      id="section-delivery"
      ref={(el) => {
        sectionRefs.current['delivery'] = el;
      }}
      className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-6 transition-all hover:border-indigo-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
            07
          </span>
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-indigo-600" />
              <span>Delivery Methods &amp; Pricing</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Standard doorstep fee, free delivery threshold, and Motor Park / Bus pickup price verified at checkout.
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto text-[11px] font-medium px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
          Checkout Pricing
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-2">
          <label className="block text-xs font-bold text-gray-900">
            Standard Doorstep Delivery Fee (₦)
          </label>
          <p className="text-[11px] text-gray-500">
            Applied at checkout when cart total is below the free delivery threshold.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
              ₦
            </span>
            <input
              type="number"
              min="0"
              step="100"
              value={settings.standard_delivery_fee ?? '3500'}
              onChange={(e) => handleSettingChange('standard_delivery_fee', e.target.value)}
              placeholder="3500"
              className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-2">
          <label className="block text-xs font-bold text-gray-900">
            Motor Park / Bus Pickup Fee (₦)
          </label>
          <p className="text-[11px] text-gray-500">
            Interstate bus / motor park waybill pickup fee verified server-side.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
              ₦
            </span>
            <input
              type="number"
              min="0"
              step="100"
              value={settings.delivery_fee_motor_park ?? '2000'}
              onChange={(e) => handleSettingChange('delivery_fee_motor_park', e.target.value)}
              placeholder="2000"
              className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 py-2 text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-100 p-4 bg-emerald-50/40 space-y-2">
          <label className="block text-xs font-bold text-emerald-900">
            Free Standard Delivery Threshold (₦)
          </label>
          <p className="text-[11px] text-emerald-800">
            Orders using Standard Delivery at or above this amount get free delivery.
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-semibold">
              ₦
            </span>
            <input
              type="number"
              min="0"
              step="1000"
              value={settings.free_delivery_threshold ?? '35000'}
              onChange={(e) => handleSettingChange('free_delivery_threshold', e.target.value)}
              placeholder="35000"
              className="w-full rounded-lg border border-emerald-200 bg-white pl-8 pr-3 py-2 text-sm font-semibold text-emerald-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-pink-100 p-4 bg-pink-50/40 space-y-2">
          <div className="text-xs font-bold text-pink-900 flex items-center justify-between">
            <span>Fez Delivery (External Courier)</span>
            <span className="text-[10px] font-semibold bg-pink-100 text-pink-800 px-2 py-0.5 rounded">
              ₦0 on site
            </span>
          </div>
          <p className="text-[11px] text-pink-800 leading-relaxed">
            <strong>₦0 added on this website.</strong> When a customer selects Fez Delivery at checkout, shipping is arranged and paid directly between the courier and customer.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-medium text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
              <Sparkles className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Website Content &amp; Media Manager
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
            Rearrange and customize top announcements, hero banners, 7 skin concern photo tiles, founder story, delivery pricing, and articles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-xs"
          >
            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            <span>View Live Store</span>
          </a>

          {activeTab === 'content' && (
            <button
              onClick={() => handleSaveAllSettings()}
              disabled={savingSettings}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer ${
                hasChanges
                  ? 'bg-pink-600 hover:bg-pink-500 ring-2 ring-pink-500/20'
                  : 'bg-gray-900 hover:bg-gray-800'
              } disabled:opacity-50`}
            >
              {savingSettings ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{hasChanges ? 'Save Changes *' : 'Save Content'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Top Primary Tabs */}
      <div className="flex overflow-x-auto border-b border-gray-200 gap-4 sm:gap-6">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'content'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layout className="h-4 w-4 shrink-0" />
          <span>Storefront Sections (7)</span>
        </button>

        <button
          onClick={() => setActiveTab('journal')}
          className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'journal'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>Journal / Blog ({articles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'faq'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span>Help &amp; FAQs ({faqItems.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: WEBSITE CONTENT EDITOR */}
      {/* ============================================================ */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Layout Controls Bar (View All vs Single Focus) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Display Mode:
              </span>
              <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('all');
                    setContentSubTab('all');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                    viewMode === 'all'
                      ? 'bg-white text-gray-900 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5 text-pink-600" />
                  <span>See Everything (All 7 Sections)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('focus');
                    if (contentSubTab === 'all') setContentSubTab('store_info');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                    viewMode === 'focus'
                      ? 'bg-white text-gray-900 shadow-xs font-semibold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Focus One Section</span>
                </button>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-1.5 text-xs bg-gray-50/60 focus:bg-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {loadingSettings ? (
            <div className="py-16 text-center text-sm text-gray-400 flex items-center justify-center gap-2 bg-white rounded-2xl border border-gray-200">
              <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
              <span>Loading current website settings from database...</span>
            </div>
          ) : (
            /* Master-Detail / Two-Column Section Layout */
            <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6 items-start">
              {/* Left Column: Sections Navigator (Sticky on Desktop) */}
              <div className="space-y-4 lg:sticky lg:top-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-xs space-y-1.5">
                  <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Storefront Flow (Top ↓ Down)
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">7 Modules</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    {/* View All Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('all');
                        setContentSubTab('all');
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        viewMode === 'all'
                          ? 'bg-pink-50 text-pink-900 font-bold border border-pink-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-pink-100 text-pink-700 font-bold text-[10px]">
                          ∞
                        </span>
                        <span>View All Sections On 1 Page</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    {/* Section items in reordered sequence */}
                    {filteredSections.map((sec) => {
                      const Icon = sec.icon;
                      const isFocused = viewMode === 'focus' && contentSubTab === sec.id;

                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => {
                            if (viewMode === 'focus') {
                              setContentSubTab(sec.id);
                            } else {
                              navigateToSection(sec.id);
                            }
                          }}
                          className={`w-full text-left p-2.5 rounded-xl text-xs transition-all cursor-pointer flex flex-col gap-1 border ${
                            isFocused
                              ? 'bg-pink-50 border-pink-200 text-pink-900 font-semibold shadow-2xs'
                              : 'border-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 font-medium">
                              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gray-100 text-gray-700 text-[10px] font-bold">
                                {sec.order}
                              </span>
                              <Icon className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                              <span className="truncate max-w-[155px]">{sec.name}</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sec.badgeBg}`}>
                              {sec.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 pl-7 truncate">{sec.shortDesc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sticky Action Card */}
                <div className="bg-gradient-to-br from-pink-50 via-cream-50 to-rose-50 rounded-2xl border border-pink-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-pink-900">
                    <Sparkles className="h-3.5 w-3.5 text-pink-600" />
                    <span>Quick Save Actions</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Edits apply in real-time across your store. Press <kbd className="px-1 py-0.5 rounded bg-white border border-gray-300 text-[10px]">Ctrl+S</kbd> anytime to save.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSaveAllSettings()}
                    disabled={savingSettings}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-pink-500 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving Changes…</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save All Changes</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Reset all fields to factory defaults?')) {
                        setSettings({ ...DEFAULT_SITE_SETTINGS });
                        setHasChanges(true);
                      }
                    }}
                    className="w-full text-center text-[11px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    Reset fields to factory defaults
                  </button>
                </div>
              </div>

              {/* Right Column: Content Sections */}
              <div className="space-y-6">
                {/* When viewing All or Specific Section */}
                {(viewMode === 'all' || contentSubTab === 'store_info') &&
                  renderStoreInfoSection()}

                {(viewMode === 'all' || contentSubTab === 'hero') && renderHeroSection()}

                {(viewMode === 'all' || contentSubTab === 'concerns') && renderConcernsSection()}

                {(viewMode === 'all' || contentSubTab === 'homepage') && renderHomepageSection()}

                {(viewMode === 'all' || contentSubTab === 'countdown') && renderCountdownSection()}

                {(viewMode === 'all' || contentSubTab === 'about') && renderAboutSection()}

                {(viewMode === 'all' || contentSubTab === 'delivery') && renderDeliverySection()}

                {/* Bottom Global Save Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-xs">
                  <div className="text-xs text-gray-500">
                    {hasChanges ? (
                      <span className="text-pink-600 font-semibold">
                        ● You have unsaved changes. Remember to click Save.
                      </span>
                    ) : (
                      <span>All settings are currently saved and up to date.</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveAllSettings()}
                    disabled={savingSettings}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-pink-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-pink-500 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Saving…</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save All Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: JOURNAL ARTICLES */}
      {/* ============================================================ */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Journal Articles</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Editorial guides, skincare rituals, and educational routines.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingArticle(null);
                setIsArticleModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-pink-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-pink-500 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>New Article</span>
            </button>
          </div>

          {loadingArticles ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading articles…</div>
          ) : articles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">No journal articles yet</p>
              <p className="text-xs text-gray-400 mt-1">Create your first post to educate customers.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
              {/* Mobile Card List (< 768px) */}
              <div className="divide-y divide-gray-100 md:hidden">
                {articles.map((art) => (
                  <div key={art.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-900">{art.title}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                          {art.category} • /{art.slug}
                        </div>
                      </div>
                      <button
                        onClick={() => togglePublishArticle(art)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                          art.is_published
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {art.is_published ? (
                          <>
                            <Eye className="h-3 w-3" /> Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" /> Draft
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {art.read_time || '3 min read'}
                      </span>

                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingArticle(art);
                            setIsArticleModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => deleteArticle(art.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet & Desktop Table (>= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Title &amp; Category</th>
                      <th className="py-3 px-4 font-semibold">Read Time</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {articles.map((art) => (
                      <tr key={art.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">{art.title}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {art.category} • /{art.slug}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {art.read_time || '3 min read'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => togglePublishArticle(art)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                              art.is_published
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                          >
                            {art.is_published ? (
                              <>
                                <Eye className="h-3 w-3" /> Published
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" /> Draft
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingArticle(art);
                                setIsArticleModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteArticle(art.id)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: FAQ QUESTIONS & SECTIONS */}
      {/* ============================================================ */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Frequently Asked Questions</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Organized into sections on the Customer Care / FAQ page.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setEditingFaqSection(null);
                  setIsSectionModalOpen(true);
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Section</span>
              </button>
              <button
                onClick={() => {
                  setEditingFaqItem(null);
                  setSelectedSectionForNewItem(faqSections[0]?.id || '');
                  setIsItemModalOpen(true);
                }}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg bg-pink-600 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-pink-500 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Question</span>
              </button>
            </div>
          </div>

          {loadingFaqs ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading FAQ knowledgebase…</div>
          ) : faqSections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
              <HelpCircle className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-600">No FAQ sections yet</p>
              <p className="text-xs text-gray-400 mt-1">Add a section first (e.g. Orders &amp; Delivery).</p>
            </div>
          ) : (
            <div className="space-y-5">
              {faqSections.map((sec) => {
                const items = faqItems.filter((i) => i.section_id === sec.id);
                return (
                  <div key={sec.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-xs">
                    <div className="flex items-center justify-between bg-gray-50/75 px-4 py-3 border-b border-gray-100">
                      <div>
                        <span className="font-semibold text-xs text-gray-900">{sec.title}</span>
                        <span className="ml-2 text-[10px] text-gray-400 uppercase tracking-wider">
                          ({items.length} questions)
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingFaqSection(sec);
                            setIsSectionModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                          title="Edit Section Name"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteFaqSection(sec.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Delete Section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100 text-xs">
                      {items.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 italic text-[11px]">
                          No questions in this section yet.{' '}
                          <button
                            onClick={() => {
                              setSelectedSectionForNewItem(sec.id);
                              setEditingFaqItem(null);
                              setIsItemModalOpen(true);
                            }}
                            className="text-pink-600 font-medium hover:underline cursor-pointer"
                          >
                            Add one
                          </button>
                        </div>
                      ) : (
                        items.map((it) => (
                          <div key={it.id} className="p-4 flex items-start justify-between gap-4 hover:bg-gray-50/40">
                            <div>
                              <div className="font-medium text-gray-900">{it.question}</div>
                              <div className="text-gray-500 mt-1 line-clamp-2 leading-relaxed text-[11px]">
                                {it.answer}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingFaqItem(it);
                                  setIsItemModalOpen(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded cursor-pointer"
                                title="Edit Question"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteFaqItem(it.id)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                                title="Delete Question"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALS */}
      {/* ============================================================ */}
      <ArticleModal
        isOpen={isArticleModalOpen}
        onClose={() => setIsArticleModalOpen(false)}
        onSaved={() => {
          fetchArticles();
          showToast('Journal article updated.');
        }}
        article={editingArticle}
      />

      <FaqItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSaved={() => {
          fetchFaqs();
          showToast('FAQ question saved.');
        }}
        item={editingFaqItem}
        sections={faqSections}
        defaultSectionId={selectedSectionForNewItem}
      />

      <FaqSectionModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
        onSaved={() => {
          fetchFaqs();
          showToast('FAQ section saved.');
        }}
        section={editingFaqSection}
      />
    </div>
  );
}
