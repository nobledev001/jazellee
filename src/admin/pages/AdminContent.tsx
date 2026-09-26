import { useState, useEffect } from 'react';
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
  ExternalLink,
} from 'lucide-react';
import { supabase, type DbJournalArticle, type DbFaqSection, type DbFaqItem } from '../supabase';
import ArticleModal from '../components/ArticleModal';
import FaqItemModal from '../components/FaqItemModal';
import FaqSectionModal from '../components/FaqSectionModal';
import { DEFAULT_SITE_SETTINGS } from '@/hooks/useSiteSettings';

export default function AdminContent() {
  const [activeTab, setActiveTab] = useState<'content' | 'journal' | 'faq'>('content');
  const [contentSubTab, setContentSubTab] = useState<
    'hero' | 'countdown' | 'about' | 'homepage' | 'store_info'
  >('hero');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ----------------------------------------------------
  // DYNAMIC SITE CONTENT STATE
  // ----------------------------------------------------
  const [settings, setSettings] = useState<Record<string, string>>({ ...DEFAULT_SITE_SETTINGS });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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

      showToast('All website content updated successfully!');
    } catch (err: unknown) {
      console.error('Error saving settings:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to save settings.';
      showToast(`Database error saving settings: ${errMsg}`);
    } finally {
      setSavingSettings(false);
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

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-xs font-medium text-white shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Website Content Manager</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Edit text, banners, hero sections, founder story, announcements, journal articles &amp; FAQs across the entire site.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            <span>View Live Site</span>
          </a>

          {activeTab === 'content' && (
            <button
              onClick={() => handleSaveAllSettings()}
              disabled={savingSettings}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-lg bg-pink-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-pink-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
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
          <span>Page &amp; Banner Content</span>
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
          {/* Subtabs for Content Sections */}
          <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-gray-100/80 border border-gray-200/60">
            <button
              onClick={() => setContentSubTab('hero')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                contentSubTab === 'hero'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Hero Showcase</span>
            </button>

            <button
              onClick={() => setContentSubTab('countdown')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                contentSubTab === 'countdown'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Timer className="h-3.5 w-3.5 text-amber-500" />
              <span>Countdown &amp; Launch</span>
            </button>

            <button
              onClick={() => setContentSubTab('about')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                contentSubTab === 'about'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="h-3.5 w-3.5 text-purple-500" />
              <span>About &amp; Founder</span>
            </button>

            <button
              onClick={() => setContentSubTab('homepage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                contentSubTab === 'homepage'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layout className="h-3.5 w-3.5 text-blue-500" />
              <span>Homepage Modules</span>
            </button>

            <button
              onClick={() => setContentSubTab('store_info')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                contentSubTab === 'store_info'
                  ? 'bg-white text-gray-900 shadow-xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Phone className="h-3.5 w-3.5 text-emerald-500" />
              <span>Announcements &amp; Contact</span>
            </button>
          </div>

          {loadingSettings ? (
            <div className="py-12 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
              <span>Loading current website content from Supabase...</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-xs space-y-6">
              {/* SUBSECTION 1: HERO */}
              {contentSubTab === 'hero' && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 pb-3">
                    <h2 className="text-sm font-semibold text-gray-900">Hero Section Showcase</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      The primary high-impact headline, subtext, and call-to-action buttons visible immediately when visitors arrive.
                    </p>
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
                        Main Hero Headline
                      </label>
                      <input
                        type="text"
                        value={settings.hero_headline || ''}
                        onChange={(e) => handleSettingChange('hero_headline', e.target.value)}
                        placeholder="Your little self-care haven"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 font-medium"
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Primary Button Label
                        </label>
                        <input
                          type="text"
                          value={settings.hero_cta_primary_label || ''}
                          onChange={(e) =>
                            handleSettingChange('hero_cta_primary_label', e.target.value)
                          }
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
                          onChange={(e) =>
                            handleSettingChange('hero_cta_primary_link', e.target.value)
                          }
                          placeholder="/shop"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Secondary Button Label
                        </label>
                        <input
                          type="text"
                          value={settings.hero_cta_secondary_label || ''}
                          onChange={(e) =>
                            handleSettingChange('hero_cta_secondary_label', e.target.value)
                          }
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
                          onChange={(e) =>
                            handleSettingChange('hero_cta_secondary_link', e.target.value)
                          }
                          placeholder="/categories/self-care"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Social Proof Rating Label
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
              )}

              {/* SUBSECTION 2: COUNTDOWN */}
              {contentSubTab === 'countdown' && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Launch &amp; Flash-Sale Countdown Banner
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Display a countdown timer for special restocks, promotions, or store launches.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.countdown_enabled === 'true'}
                        onChange={(e) =>
                          handleSettingChange('countdown_enabled', e.target.checked ? 'true' : 'false')
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                      <span className="ml-2 text-xs font-semibold text-gray-700">
                        {settings.countdown_enabled === 'true' ? 'Enabled' : 'Hidden'}
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
                        value={settings.countdown_target_date ? settings.countdown_target_date.substring(0, 16) : ''}
                        onChange={(e) =>
                          handleSettingChange('countdown_target_date', e.target.value)
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Pre-Launch Headline
                      </label>
                      <input
                        type="text"
                        value={settings.countdown_headline || ''}
                        onChange={(e) =>
                          handleSettingChange('countdown_headline', e.target.value)
                        }
                        placeholder="Our full shop goes live soon"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Pre-Launch Subtitle
                    </label>
                    <input
                      type="text"
                      value={settings.countdown_subtext || ''}
                      onChange={(e) => handleSettingChange('countdown_subtext', e.target.value)}
                      placeholder="Counting down to something special..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Post-Launch Headline (When timer hits 0)
                      </label>
                      <input
                        type="text"
                        value={settings.countdown_live_headline || ''}
                        onChange={(e) =>
                          handleSettingChange('countdown_live_headline', e.target.value)
                        }
                        placeholder="We're live!"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Post-Launch Subtitle
                      </label>
                      <input
                        type="text"
                        value={settings.countdown_live_subtext || ''}
                        onChange={(e) =>
                          handleSettingChange('countdown_live_subtext', e.target.value)
                        }
                        placeholder="The Jazelle Skin Haven shop is officially open..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SUBSECTION 3: ABOUT & FOUNDER */}
              {contentSubTab === 'about' && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 pb-3">
                    <h2 className="text-sm font-semibold text-gray-900">About Page &amp; Founder Story</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure founder greetings, photo, and the personal note displayed on <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">/about</code>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Section Subtitle
                      </label>
                      <input
                        type="text"
                        value={settings.about_hero_subtitle || ''}
                        onChange={(e) =>
                          handleSettingChange('about_hero_subtitle', e.target.value)
                        }
                        placeholder="Our Story"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Founder Greeting Headline
                      </label>
                      <input
                        type="text"
                        value={settings.founder_greeting || ''}
                        onChange={(e) =>
                          handleSettingChange('founder_greeting', e.target.value)
                        }
                        placeholder="Hi, I am Jazelle — and this is my little corner for you"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Founder Introduction &amp; Personal Story
                    </label>
                    <textarea
                      rows={4}
                      value={settings.founder_intro || ''}
                      onChange={(e) => handleSettingChange('founder_intro', e.target.value)}
                      placeholder="What started as a personal obsession with soft, happy skin..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Founder Photo URL
                    </label>
                    <input
                      type="url"
                      value={settings.founder_image_url || ''}
                      onChange={(e) => handleSettingChange('founder_image_url', e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 font-mono text-xs"
                    />
                    {settings.founder_image_url && (
                      <div className="mt-2 flex items-center gap-3">
                        <img
                          src={settings.founder_image_url}
                          alt="Preview"
                          className="h-14 w-14 rounded-full object-cover border border-gray-200 shadow-xs"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="text-[11px] text-gray-400">Photo preview</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUBSECTION 4: HOMEPAGE MODULES */}
              {contentSubTab === 'homepage' && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 pb-3">
                    <h2 className="text-sm font-semibold text-gray-900">Homepage Interactive Modules</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Customize WhatsApp consultation CTA, Instagram social showcase, and newsletter sections.
                    </p>
                  </div>

                  {/* Need Help Choosing */}
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50 space-y-3">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Need Help Choosing? (WhatsApp Consultation Banner)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Banner Headline
                        </label>
                        <input
                          type="text"
                          value={settings.need_help_headline || ''}
                          onChange={(e) =>
                            handleSettingChange('need_help_headline', e.target.value)
                          }
                          placeholder="Need help choosing?"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={settings.need_help_button || ''}
                          onChange={(e) =>
                            handleSettingChange('need_help_button', e.target.value)
                          }
                          placeholder="Chat With Jazelle"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Banner Subtitle / Reassurance
                      </label>
                      <input
                        type="text"
                        value={settings.need_help_subtext || ''}
                        onChange={(e) =>
                          handleSettingChange('need_help_subtext', e.target.value)
                        }
                        placeholder="Not sure what your skin needs? Don't worry, we've got you..."
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  {/* Follow the Haven */}
                  <div className="rounded-xl border border-gray-100 p-4 bg-gray-50/50 space-y-3">
                    <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Follow the Haven (Instagram Community Grid)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Section Headline
                        </label>
                        <input
                          type="text"
                          value={settings.follow_haven_headline || ''}
                          onChange={(e) =>
                            handleSettingChange('follow_haven_headline', e.target.value)
                          }
                          placeholder="Follow the Haven"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Instagram Handle
                        </label>
                        <input
                          type="text"
                          value={settings.instagram_handle || ''}
                          onChange={(e) =>
                            handleSettingChange('instagram_handle', e.target.value)
                          }
                          placeholder="@jazelle.skin.haven"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-pink-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          TikTok Handle
                        </label>
                        <input
                          type="text"
                          value={settings.tiktok_handle || ''}
                          onChange={(e) =>
                            handleSettingChange('tiktok_handle', e.target.value)
                          }
                          placeholder="@jazelleskinhaven"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Instagram Profile Link
                        </label>
                        <input
                          type="url"
                          value={settings.instagram_url || ''}
                          onChange={(e) => handleSettingChange('instagram_url', e.target.value)}
                          placeholder="https://www.instagram.com/jazelle.skin.haven"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-pink-500 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          TikTok Profile Link
                        </label>
                        <input
                          type="url"
                          value={settings.tiktok_url || ''}
                          onChange={(e) => handleSettingChange('tiktok_url', e.target.value)}
                          placeholder="https://www.tiktok.com/@jazelleskinhaven"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-pink-500 font-mono text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Community Subtitle
                        </label>
                        <input
                          type="text"
                          value={settings.follow_haven_subtext || ''}
                          onChange={(e) =>
                            handleSettingChange('follow_haven_subtext', e.target.value)
                          }
                          placeholder="Self-care tips, behind-the-scenes..."
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBSECTION 5: STORE INFO & CONTACT */}
              {contentSubTab === 'store_info' && (
                <div className="space-y-5">
                  <div className="border-b border-gray-100 pb-3">
                    <h2 className="text-sm font-semibold text-gray-900">
                      Top Announcement, Store &amp; Contact Info
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Storewide top banner, delivery thresholds, official contact information, and delivery fees.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Top Announcement Bar Text <span className="text-pink-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.announcement_bar || ''}
                      onChange={(e) => handleSettingChange('announcement_bar', e.target.value)}
                      placeholder="Free delivery on orders over ₦40,000 — across Nigeria"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Displayed on every single page at the top of the screen.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          value={settings.free_delivery_threshold || '40000'}
                          onChange={(e) =>
                            handleSettingChange('free_delivery_threshold', e.target.value)
                          }
                          placeholder="40000"
                          className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Customer WhatsApp Number (International Format)
                      </label>
                      <input
                        type="text"
                        value={settings.whatsapp_number || '+2348123456789'}
                        onChange={(e) => handleSettingChange('whatsapp_number', e.target.value)}
                        placeholder="2348123456789"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Used for instant chat redirection buttons on the storefront.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Support Phone Number (Display format)
                      </label>
                      <input
                        type="text"
                        value={settings.support_phone || ''}
                        onChange={(e) => handleSettingChange('support_phone', e.target.value)}
                        placeholder="+234 812 345 6789"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
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
                        placeholder="hello@jazelleskinhaven.com"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Physical Studio / Store Address
                      </label>
                      <input
                        type="text"
                        value={settings.store_address || ''}
                        onChange={(e) => handleSettingChange('store_address', e.target.value)}
                        placeholder="Wuse II, Abuja, Nigeria"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Save Bar */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset form fields to factory default settings?')) {
                      setSettings({ ...DEFAULT_SITE_SETTINGS });
                    }
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer py-2 text-center sm:text-left"
                >
                  Reset fields to defaults
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAllSettings()}
                  disabled={savingSettings}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-6 py-2.5 text-xs font-semibold text-white hover:bg-pink-500 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving to Supabase…</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Content Changes</span>
                    </>
                  )}
                </button>
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
