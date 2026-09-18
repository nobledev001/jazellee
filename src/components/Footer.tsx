import { useState } from 'react';
import {
  Instagram,
  Facebook,
  Twitter,
  Heart,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
} from 'lucide-react';
import Logo from '@/components/Logo';

const FOOTER_LINKS = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/shop' },
      { label: 'Skincare', href: '/categories/skincare' },
      { label: 'Body Care', href: '/categories/body-care' },
      { label: 'Grooming', href: '/categories/grooming' },
      { label: 'Self Care', href: '/categories/self-care' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our Story', href: '/about' },
      { label: 'Journal', href: '/journal' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQs', href: '/faqs' },
    ],
  },
  {
    title: 'Customer Care',
    links: [
      { label: 'Shipping & Delivery', href: '/shipping' },
      { label: 'Returns & Exchanges', href: '/returns' },
      { label: 'Track Your Order', href: '/track-order' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: 'Instagram', href: '#', icon: Instagram },
  { label: 'Facebook', href: '#', icon: Facebook },
  { label: 'Twitter', href: '#', icon: Twitter },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="mt-20">
      {/* Newsletter */}
      <div className="relative overflow-hidden bg-gradient-blush border-t border-blush-100">
        <div className="absolute inset-0 bg-[url('/assets/images/image%20copy.png')] bg-[length:200px_200px] opacity-[0.025] mix-blend-multiply pointer-events-none" />
        <div className="relative container-jazelle py-14 sm:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blush-400" />
              <span className="section-subtitle">Join the Haven</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-berry-800 text-balance mb-3">
              Get self-care tips & sweet deals in your inbox
            </h2>
            <p className="text-berry-500 text-sm sm:text-base mb-6">
              Sign up for our newsletter and be the first to know about new arrivals,
              exclusive offers, and little reminders to take care of you.
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
              <button type="submit" className="btn-primary whitespace-nowrap">
                <Send className="w-4 h-4" />
                Subscribe
              </button>
            </form>
            {subscribed && (
              <p className="mt-3 text-sm text-sage-600 font-medium animate-fade-in-down">
                You're in! Check your inbox for a little hello from us.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="relative overflow-hidden bg-cream-100 border-t border-blush-100">
        <div className="absolute inset-0 bg-[url('/assets/images/image%20copy.png')] bg-[length:180px_180px] opacity-[0.035] mix-blend-multiply pointer-events-none" />
        <div className="relative">
        <div className="container-jazelle py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand column */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2"><Logo /><div className="leading-none"><span className="block font-display text-xl font-semibold text-berry-800">Jazelle</span><span className="block text-[0.65rem] uppercase tracking-[0.2em] text-blush-400 font-medium">Skin Haven</span></div></div>
              </div>
              <p className="text-sm text-berry-500 leading-relaxed max-w-xs mb-5">
                Your cute little self-care corner on the internet. Skincare, body-care,
                grooming & self-care for the modern Nigerian woman — delivered with love
                across Nigeria.
              </p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm text-berry-500">
                  <MapPin className="w-4 h-4 text-blush-400 flex-shrink-0" />
                  Abuja, Nigeria
                </div>
                <div className="flex items-center gap-2.5 text-sm text-berry-500">
                  <Phone className="w-4 h-4 text-blush-400 flex-shrink-0" />
                  +234 800 000 0000
                </div>
                <div className="flex items-center gap-2.5 text-sm text-berry-500">
                  <Mail className="w-4 h-4 text-blush-400 flex-shrink-0" />
                  hello@jazelleskinhaven.com
                </div>
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_LINKS.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-berry-700 mb-4">
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

          {/* Social */}
          <div className="mt-10 pt-8 border-t border-blush-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-berry-500 hover:bg-blush-100 hover:text-blush-500 transition-colors duration-200 shadow-soft"
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </a>
                );
              })}
            </div>
            <p className="text-xs text-berry-400 text-center sm:text-right">
              All prices in Nigerian Naira (&#8358;). We deliver across Nigeria only.
            </p>
          </div>
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
          </div>
        </div>
      </div>
    </footer>
  );
}
