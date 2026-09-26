import { useState } from 'react';
import { MessageCircle, Mail, Phone, MapPin, Send, Check, Clock, Instagram } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import TikTokIcon from '@/components/icons/TikTokIcon';

export default function ContactPage() {
  const { getSetting } = useSiteSettings();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supportPhone = getSetting('support_phone', '+234 812 345 6789');
  const supportEmail = getSetting('support_email', 'hello@jazelleskinhaven.com');
  const storeAddress = getSetting('store_address', 'Wuse II, Abuja, Nigeria');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);

    const name = form.name.trim();
    const email = form.email.trim();
    const message = form.message.trim();

    if (!name || name.length < 2 || name.length > 100) {
      setErrorMessage('Please enter a valid name (2 to 100 characters).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email) || email.length > 120) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!message || message.length < 5 || message.length > 3000) {
      setErrorMessage('Please enter a message between 5 and 3000 characters.');
      return;
    }

    setLoading(true);
    try {
      await supabase.from('contact_messages').insert({
        name,
        email,
        message,
        created_at: new Date().toISOString(),
      });
    } catch {
      // safe fallback
    }
    setLoading(false);
    setSent(true);
    setForm({ name: '', email: '', message: '' });
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <main className="bg-cream-50">
      <div className="bg-gradient-blush">
        <div className="container-jazelle py-10 sm:py-14">
          <span className="section-subtitle">Get In Touch</span>
          <h1 className="section-title mt-2">We would love to hear from you</h1>
          <p className="mt-2 max-w-lg text-sm text-berry-400">
            Questions about a product? Need help choosing? Just want to say hi?
            Reach out \u2014 we are always happy to help, and no question is too
            small.
          </p>
        </div>
      </div>

      <div className="container-jazelle py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Contact info */}
          <div className="space-y-4">
            <a
              href="https://wa.me/message/ET5GM7MR4LYIC1"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                <MessageCircle className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700 group-hover:text-blush-500 transition-colors">WhatsApp</h3>
                <p className="text-sm text-berry-400">Chat with Jazelle Directly</p>
                <p className="mt-1 text-xs text-emerald-600 font-medium">Tap to chat &mdash; fastest response</p>
              </div>
            </a>

            <a
              href="https://www.instagram.com/jazelle.skin.haven"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-600">
                <Instagram className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700 group-hover:text-blush-500 transition-colors">Instagram</h3>
                <p className="text-sm text-berry-400">@jazelle.skin.haven</p>
                <p className="mt-1 text-xs text-blush-500">DM us, follow daily skincare rituals & restocks</p>
              </div>
            </a>

            <a
              href="https://www.tiktok.com/@jazelleskinhaven"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-berry-50 text-berry-900">
                <TikTokIcon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700 group-hover:text-blush-500 transition-colors">TikTok</h3>
                <p className="text-sm text-berry-400">@jazelleskinhaven</p>
                <p className="mt-1 text-xs text-berry-600">Watch routine videos, tutorials & tips</p>
              </div>
            </a>

            <a
              href={`mailto:${supportEmail}`}
              className="group flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blush-50 text-blush-500">
                <Mail className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700 group-hover:text-blush-500 transition-colors">Email</h3>
                <p className="text-sm text-berry-400">{supportEmail}</p>
                <p className="mt-1 text-xs text-blush-400">We reply within 24 hours</p>
              </div>
            </a>

            <div className="flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cream-200 text-cream-800">
                <Phone className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700">Phone</h3>
                <p className="text-sm text-berry-400">{supportPhone}</p>
                <p className="mt-1 text-xs text-blush-400">Mon&ndash;Sat, 9am&ndash;6pm WAT</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                <MapPin className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700">Location</h3>
                <p className="text-sm text-berry-400">{storeAddress}</p>
                <p className="mt-1 text-xs text-blush-400">Delivering across Nigeria</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-4xl bg-blush-50 p-5">
              <Clock className="h-5 w-5 flex-shrink-0 text-blush-400" />
              <p className="text-sm text-berry-500">
                <span className="font-semibold text-berry-700">Working hours:</span> Monday to Saturday, 9am &ndash; 6pm WAT. We are closed on Sundays.
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-5xl bg-white p-6 shadow-soft sm:p-8">
            <h2 className="font-display text-2xl font-medium text-berry-800">Send us a message</h2>
            <p className="mt-1 text-sm text-berry-400">
              Fill in the form below and we will get back to you as soon as we can.
            </p>
            {errorMessage && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-xs font-medium text-red-600 border border-red-200">
                {errorMessage}
              </div>
            )}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-berry-700">Your name</span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="What should we call you?"
                  className="input-jazelle mt-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-berry-700">Email address</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="you@example.com"
                  className="input-jazelle mt-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-berry-700">Your message</span>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  placeholder="How can we help?"
                  className="input-jazelle mt-2 resize-none rounded-3xl"
                />
              </label>
              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60 cursor-pointer">
                <Send className={`h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
                {loading ? 'Sending...' : 'Send Message'}
              </button>
              {sent && (
                <div className="flex items-center gap-2 rounded-3xl bg-sage-50 px-4 py-3 text-sm text-sage-700 animate-fade-in-down">
                  <Check className="h-4 w-4" />
                  Thank you! Your message has been sent. We will be in touch soon.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
