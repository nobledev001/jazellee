import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/whatsapp';

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Tooltip bubble */}
      {showTooltip && !dismissed && (
        <div className="relative bg-white rounded-3xl shadow-soft-lg px-4 py-3 max-w-[220px] animate-fade-in-up">
          <button
            onClick={() => setDismissed(true)}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blush-100 text-berry-500 flex items-center justify-center hover:bg-blush-200 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <p className="text-sm font-medium text-berry-700 mb-0.5">
            Hey lovely! Need help?
          </p>
          <p className="text-xs text-berry-400">
            Chat with us on WhatsApp — we're here for you.
          </p>
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white rotate-45" />
        </div>
      )}

      {/* Floating button */}
      <a
        href={getWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] shadow-soft-lg hover:shadow-soft-xl transition-shadow duration-300"
        aria-label="Chat on WhatsApp"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20" />
        <MessageCircle className="relative w-7 h-7 text-white fill-white/20" />
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blush-500 border-2 border-white" />
      </a>
    </div>
  );
}
