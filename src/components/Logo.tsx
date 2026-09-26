interface LogoProps {
  className?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'header' | string;
}

export default function Logo({ className = '', compact = false, size }: LogoProps) {
  // Proportions for wide wordmark (approx 2.5:1 aspect ratio)
  let sizeClass = 'h-10 sm:h-12 w-auto';

  if (size === 'header') {
    sizeClass = 'h-11 sm:h-12 md:h-13 lg:h-14 xl:h-15 w-auto max-w-[220px] sm:max-w-[260px] md:max-w-[300px] lg:max-w-[340px]';
  } else if (size === 'sm') {
    sizeClass = 'h-7 sm:h-8 w-auto';
  } else if (size === 'md') {
    sizeClass = 'h-9 sm:h-10 w-auto';
  } else if (size === 'lg') {
    sizeClass = 'h-14 sm:h-16 md:h-18 w-auto max-w-[280px] sm:max-w-[340px]';
  } else if (compact) {
    sizeClass = 'h-8 sm:h-9 w-auto';
  }

  return (
    <img
      src="/assets/images/jazelle_wordmark_transparent.png"
      alt="Jazelle Skin Haven"
      referrerPolicy="no-referrer"
      className={`inline-block shrink-0 object-contain select-none transition-all ${sizeClass} ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = '/assets/images/jazelle_wordmark_transparent.svg';
      }}
    />
  );
}

