import { useState } from 'react';
import { MessageCircle, Mail, Phone, MapPin, Send, Check, Clock } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/whatsapp';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.name.trim() && form.email.trim() && form.message.trim()) {
      setSent(true);
      setForm({ name: '', email: '', message: '' });
      setTimeout(() => setSent(false), 5000);
    }
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
              href={getWhatsAppLink('Hi Jazelle!')}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                <MessageCircle className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700 group-hover:text-blush-500 transition-colors">WhatsApp</h3>
                <p className="text-sm text-berry-400">+234 801 234 5678</p>
                <p className="mt-1 text-xs text-blush-400">Tap to chat \u2014 usually the fastest reply</p>
              </div>
            </a>

            <a
              href="mailto:hello@jazelleskinhaven.com"
              className="group flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg"
            >
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blush-50 text-blush-500">
                <Mail className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700 group-hover:text-blush-500 transition-colors">Email</h3>
                <p className="text-sm text-berry-400">hello@jazelleskinhaven.com</p>
                <p className="mt-1 text-xs text-blush-400">We reply within 24 hours</p>
              </div>
            </a>

            <div className="flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-cream-200 text-cream-800">
                <Phone className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700">Phone</h3>
                <p className="text-sm text-berry-400">+234 800 000 0000</p>
                <p className="mt-1 text-xs text-blush-400">Mon\u2013Sat, 9am\u20136pm WAT</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-4xl bg-white p-5 shadow-soft">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                <MapPin className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-berry-700">Location</h3>
                <p className="text-sm text-berry-400">Abuja, Nigeria</p>
                <p className="mt-1 text-xs text-blush-400">Delivering across Nigeria</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-4xl bg-blush-50 p-5">
              <Clock className="h-5 w-5 flex-shrink-0 text-blush-400" />
              <p className="text-sm text-berry-500">
                <span className="font-semibold text-berry-700">Working hours:</span> Monday to Saturday, 9am \u2013 6pm WAT. We are closed on Sundays.
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div className="rounded-5xl bg-white p-6 shadow-soft sm:p-8">
            <h2 className="font-display text-2xl font-medium text-berry-800">Send us a message</h2>
            <p className="mt-1 text-sm text-berry-400">
              Fill in the form below and we will get back to you as soon as we can.
            </p>
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
              <button type="submit" className="btn-primary w-full">
                <Send className="h-4 w-4" />
                Send Message
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
