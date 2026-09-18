import { useCountdown } from '@/hooks/useCountdown';
import { PartyPopper, Sparkles } from 'lucide-react';

const LAUNCH_DATE = new Date('2026-10-10T00:00:00');

function TimeUnit({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, '0');
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-3xl bg-white shadow-soft flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-blush opacity-30" />
        <span className="relative font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-berry-800 tabular-nums">
          {display}
        </span>
      </div>
      <span className="mt-2 text-[0.65rem] sm:text-xs font-semibold uppercase tracking-[0.15em] text-berry-400">
        {label}
      </span>
    </div>
  );
}

export default function Countdown() {
  const { timeLeft, isComplete } = useCountdown(LAUNCH_DATE);

  if (isComplete) {
    return (
      <section className="container-jazelle py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-5xl bg-gradient-rose-soft px-6 py-12 sm:py-16 text-center shadow-soft-lg">
          <div className="absolute top-4 left-8 w-20 h-20 rounded-full bg-blush-300/30 blur-2xl" />
          <div className="absolute bottom-4 right-8 w-24 h-24 rounded-full bg-cream-300/30 blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blush-500 text-white mb-5 animate-bounce-soft">
              <PartyPopper className="w-8 h-8" />
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium text-berry-800 mb-3 text-balance">
              We're live!
            </h2>
            <p className="text-berry-500 text-base sm:text-lg max-w-md mx-auto mb-6">
              The Jazelle Skin Haven shop is officially open. Come explore our
              full collection of self-care favourites.
            </p>
            <a href="/shop" className="btn-primary">
              <Sparkles className="w-4 h-4" />
              Start Shopping
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container-jazelle py-10 sm:py-14">
      <div className="relative overflow-hidden rounded-5xl bg-white shadow-soft-lg px-6 py-10 sm:py-12">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-blush-100/50 blur-3xl pointer-events-none" />
        <div className="relative text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blush-400" />
            <span className="section-subtitle">Launching Soon</span>
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-medium text-berry-800 mb-2 text-balance">
            Our full shop goes live October 10th
          </h2>
          <p className="text-berry-400 text-sm sm:text-base mb-7">
            Counting down to something special
          </p>

          <div className="flex items-center justify-center gap-3 sm:gap-4 lg:gap-6">
            <TimeUnit value={timeLeft.days} label="Days" />
            <span className="font-display text-2xl sm:text-3xl text-blush-300 font-light -mt-6">
              :
            </span>
            <TimeUnit value={timeLeft.hours} label="Hours" />
            <span className="font-display text-2xl sm:text-3xl text-blush-300 font-light -mt-6">
              :
            </span>
            <TimeUnit value={timeLeft.minutes} label="Minutes" />
            <span className="font-display text-2xl sm:text-3xl text-blush-300 font-light -mt-6">
              :
            </span>
            <TimeUnit value={timeLeft.seconds} label="Seconds" />
          </div>
        </div>
      </div>
    </section>
  );
}
