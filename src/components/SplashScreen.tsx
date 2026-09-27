import { useEffect, useState } from 'react';
import jazelleSplashLogo from '@/assets/images/jazelle_splash_logo.png';

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
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-white transition-opacity duration-700 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center px-6 max-w-lg w-full">
        <img
          src={jazelleSplashLogo}
          alt="Jazelle Skin Haven"
          className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 object-contain opacity-0 animate-splash-badge select-none"
        />

        <p className="mt-6 text-xs sm:text-sm font-medium uppercase tracking-[0.26em] text-berry-600 opacity-0 animate-splash-subtitle text-center">
          Self-Care &bull; Skincare &bull; Nationwide
        </p>
      </div>
    </div>
  );
}
