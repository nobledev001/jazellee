import { MessageCircle, Heart } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/whatsapp';

export default function NeedHelpChoosing() {
  return (
    <section className="container-jazelle py-14 sm:py-20">
      <div className="relative overflow-hidden rounded-5xl bg-gradient-rose-soft px-6 py-12 sm:px-12 sm:py-16 text-center">
        <div className="absolute top-4 left-6 w-16 h-16 rounded-full bg-white/30 blur-2xl pointer-events-none" />
        <div className="absolute bottom-4 right-6 w-20 h-20 rounded-full bg-blush-300/30 blur-2xl pointer-events-none" />

        <div className="relative max-w-xl mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-soft mb-5">
            <Heart className="w-6 h-6 text-blush-500 fill-blush-500" />
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-medium text-berry-800 mb-3 text-balance">
            Need help choosing?
          </h2>
          <p className="text-berry-500 text-base sm:text-lg mb-7 text-balance">
            Not sure what your skin needs? Don't worry, we've got you.
            Chat with us and we'll help you find your perfect match.
          </p>

          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <MessageCircle className="w-4 h-4" />
            Chat With Jazelle
          </a>

          <p className="mt-4 text-xs text-berry-400">
            Available Mon–Sat, 9am–6pm WAT
          </p>
        </div>
      </div>
    </section>
  );
}
