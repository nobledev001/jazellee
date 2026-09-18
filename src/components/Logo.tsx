interface LogoProps {
  className?: string;
  compact?: boolean;
}

export default function Logo({ className = '', compact = false }: LogoProps) {
  return (
    <span
      aria-label="Jazelle Skin Haven"
      className={`inline-block bg-no-repeat bg-center ${compact ? 'h-10 w-10' : 'h-14 w-14'} ${className}`}
      style={{
        backgroundImage: "url('/assets/images/image.png')",
        backgroundSize: 'contain',
      }}
    />
  );
}
