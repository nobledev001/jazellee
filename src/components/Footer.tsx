import { useState } from 'react';
import {
  Instagram,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabaseClient';
import TikTokIcon from '@/components/icons/TikTokIcon';

const FOOTER_SECTIONS = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/shop' },
      { label: 'Skincare', href: '/categories/skincare' },
      { label: 'Body Care', href: '/categories/body-care' },
      { label: 'Grooming', href: '/categories/grooming' },
      { label: 'Self Care', href: '/categories/self-care' },
      { label: 'Best Sellers', href: '/shop?filter=best-sellers' },
    ],
  },
  {
    title: 'Help & Customer Care',
    links: [
      { label: 'Track Your Order', href: '/track-order' },
      { label: 'FAQs', href: '/faqs' },
      { label: 'Shipping & Delivery', href: '/shipping' },
      { label: 'Returns & Exchanges', href: '/returns' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    title: 'Learning & Journal',
    links: [
      { label: 'The Haven Journal', href: '/journal' },
      { label: 'What Does SPF Actually Mean?', href: '/journal/what-does-spf-actually-mean' },
      { label: 'Self-Care ≠ Hygiene', href: '/journal/self-care-is-not-hygiene' },
      { label: '3 Body-Care Mistakes', href: '/journal/3-body-care-mistakes' },
      { label: 'Why Elbows & Knees Look Darker', href: '/journal/why-elbows-knees-look-darker' },
    ],
  },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    setSubscribeError(null);
    setSubscribed(false);

    try {
      const { error } = await supabase.from('newsletter_subscribers').insert({
        email: email.trim().toLowerCase(),
        source: 'footer_newsletter',
        created_at: new Date().toISOString(),
      });

      if (error && error.code !== '23505') {
        setSubscribeError(`Subscription failed: ${error.message}`);
        setSubmitting(false);
        return;
      }

      setSubscribed(true);
      setSubmitting(false);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to subscribe right now.';
      setSubscribeError(`Subscription failed: ${msg}`);
      setSubmitting(false);
    }
  };

  return (
    <footer className="mt-20">
      {/* Newsletter */}
      <div className="relative overflow-hidden bg-cream-50 border-t border-blush-100">
        <div className="relative container-jazelle py-14 sm:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blush-400" />
              <span className="section-subtitle">Join the Haven</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-berry-800 text-balance mb-3">
              Get cute self-care tips + first dibs on new drops.
            </h2>
            <p className="text-berry-500 text-sm sm:text-base mb-6">
              Sign up for our newsletter and be the first to know about restocks, fresh arrivals,
              and little daily reminders to take gentle care of you.
            </p>
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            >
              <div className="relative flex-1">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-blush-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-jazelle pl-14"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary whitespace-nowrap disabled:opacity-70"
              >
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Subscribe</span>
                  </>
                )}
              </button>
            </form>
            {subscribed && (
              <p className="mt-3 text-sm text-sage-600 font-medium animate-fade-in-down">
                You're on the list! Check your inbox for sweet self-care love from us.
              </p>
            )}
            {subscribeError && (
              <p className="mt-3 text-sm text-blush-600 font-medium animate-fade-in-down">
                {subscribeError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="relative overflow-hidden bg-white border-t border-blush-100">
        <div className="relative container-jazelle py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
            {/* Brand column */}
            <div className="lg:col-span-2">
              <div className="mb-5">
                <a href="/" aria-label="Jazelle Skin Haven Home" className="inline-block">
                  <Logo size="lg" className="shrink-0 drop-shadow-xs" />
                </a>
              </div>
              <p className="text-sm text-berry-500 leading-relaxed max-w-sm mb-5">
                Your cute little self-care corner on the internet. Skincare, body-care,
                grooming & self-care for the modern Nigerian woman &mdash; delivered with love
                across Nigeria.
              </p>
              <div className="space-y-2.5 text-sm text-berry-600">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-blush-400 flex-shrink-0" />
                  <span>Abuja, Nigeria &bull; Delivering nationwide</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-blush-400 flex-shrink-0" />
                  <a href="tel:+2348123456789" className="hover:text-blush-600 transition-colors">
                    +234 812 345 6789
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-[#25D366] flex-shrink-0" />
                  <a
                    href="https://wa.me/message/ET5GM7MR4LYIC1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-berry-700 hover:text-[#25D366] transition-colors inline-flex items-center gap-1"
                  >
                    <span>WhatsApp: Chat With Jazelle</span>
                    <ExternalLink className="w-3 h-3 text-[#25D366]" />
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-blush-400 flex-shrink-0" />
                  <a href="mailto:hello@jazelleskinhaven.com" className="hover:text-blush-600 transition-colors">
                    hello@jazelleskinhaven.com
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Instagram className="w-4 h-4 text-blush-500 flex-shrink-0" />
                  <a
                    href="https://www.instagram.com/jazelle.skin.haven"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blush-600 hover:text-blush-700 transition-colors inline-flex items-center gap-1"
                  >
                    <span>@jazelle.skin.haven on Instagram</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <TikTokIcon className="w-4 h-4 text-berry-800 flex-shrink-0" />
                  <a
                    href="https://www.tiktok.com/@jazelleskinhaven"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-berry-700 hover:text-berry-900 transition-colors inline-flex items-center gap-1"
                  >
                    <span>@jazelleskinhaven on TikTok</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-berry-800 mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-berry-500 hover:text-blush-500 transition-colors duration-200"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Social & Currency note */}
          <div className="mt-12 pt-8 border-t border-blush-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="https://www.instagram.com/jazelle.skin.haven"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram @jazelle.skin.haven"
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white text-berry-600 hover:bg-blush-100 hover:text-blush-600 transition-colors duration-200 shadow-soft text-xs font-medium"
              >
                <Instagram className="w-4 h-4 text-blush-500" />
                <span>@jazelle.skin.haven</span>
              </a>
              <a
                href="https://www.tiktok.com/@jazelleskinhaven"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok @jazelleskinhaven"
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white text-berry-700 hover:bg-pink-50 hover:text-berry-900 transition-colors duration-200 shadow-soft text-xs font-medium"
              >
                <TikTokIcon className="w-3.5 h-3.5 text-berry-900" />
                <span>@jazelleskinhaven</span>
              </a>
              <a
                href="https://wa.me/message/ET5GM7MR4LYIC1"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white text-berry-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors duration-200 shadow-soft text-xs font-medium"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>
            <p className="text-xs text-berry-400 text-center sm:text-right">
              All prices in Nigerian Naira (&#8358;). Delivering with care across Nigeria.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-berry-800 text-cream-200">
        <div className="container-jazelle py-4">
          <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 text-center">
            <p className="text-xs text-cream-300">
              &copy; {new Date().getFullYear()} Jazelle Skin Haven. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-cream-400">
              <a href="/privacy" className="hover:text-blush-300 transition-colors">
                Privacy
              </a>
              <a href="/terms" className="hover:text-blush-300 transition-colors">
                Terms
              </a>
              <a href="/admin" className="hover:text-blush-300 transition-colors">
                Admin Portal
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
