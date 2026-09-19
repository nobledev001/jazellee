import { useEffect, useState } from 'react';

const WORD = 'JAZELLE';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [shouldShow, setShouldShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLeaving(true), 6000);
    const completeTimer = window.setTimeout(() => {
      setShouldShow(false);
      onComplete();
    }, 6900);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (!shouldShow) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-cream-50 transition-opacity duration-700 ${leaving ? 'opacity-0' : 'opacity-100'}`}>
      <div
        className="absolute inset-0 opacity-0 animate-splash-pattern"
        style={{
          backgroundImage: "url('/assets/images/image%20copy.png')",
          backgroundSize: '460px 460px',
          backgroundPosition: 'center',
          mixBlendMode: 'multiply',
        }}
      />
      <div className="relative flex flex-col items-center">
        <span
          className="block h-40 w-40 bg-no-repeat bg-center opacity-0 animate-splash-badge"
          style={{
            backgroundImage: "url('/assets/images/image.png')",
            backgroundSize: 'contain',
          }}
        />
        <div className="mt-6 flex" aria-label="Jazelle">
          {WORD.split('').map((letter, index) => (
            <span
              key={`${letter}-${index}`}
              className="font-display text-6xl font-semibold tracking-[0.18em] text-logo opacity-0 animate-splash-letter sm:text-7xl"
              style={{ animationDelay: `${2.15 + index * 0.24}s` }}
            >
              {letter}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm font-semibold uppercase tracking-[0.38em] text-blush-400 opacity-0 animate-splash-subtitle sm:text-base">
          Skin Haven
        </p>
      </div>
    </div>
  );
}
