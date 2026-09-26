import { useEffect, useState } from 'react';

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
          backgroundImage: "url('/assets/images/brand_pattern.jpg')",
          backgroundSize: '260px 260px',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat',
        }}
      />
      <div className="relative flex flex-col items-center px-6 max-w-lg w-full">
        <img
          src="/assets/images/jazelle_wordmark_transparent.png"
          alt="Jazelle Skin Haven"
          className="w-full max-w-[320px] sm:max-w-[400px] h-auto object-contain opacity-0 animate-splash-badge drop-shadow-sm select-none"
        />

        <p className="mt-5 text-xs sm:text-sm font-medium uppercase tracking-[0.26em] text-berry-600 opacity-0 animate-splash-subtitle text-center">
          Self-Care &bull; Skincare &bull; Nationwide
        </p>
      </div>
    </div>
  );
}
