import React from 'react';

export function TikTokIcon({ className = 'w-4 h-4', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.87 2.89 2.89 0 0 1-2.88-2.87 2.89 2.89 0 0 1 2.88-2.87c.33 0 .65.06.95.16v-3.5a6.38 6.38 0 0 0-.95-.08C5.9 9.38 3 12.28 3 15.86 3 19.44 5.9 22.34 9.49 22.34c3.58 0 6.48-2.9 6.48-6.48V8.71a8.3 8.3 0 0 0 4.62 1.48V6.69h-1z" />
    </svg>
  );
}

export default TikTokIcon;
