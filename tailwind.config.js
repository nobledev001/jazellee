/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
  blush: {
    50: '#FBE9EE',   // Very light pink (exact)
    100: '#F9D9E1',
    200: '#F7C9D6',  // Baby pink (exact)
    300: '#F5BCCB',
    400: '#F3B1C2',
    500: '#F2A9BC',  // Blush pink — primary accent (exact)
    600: '#D9789A',  // Muted rose pink — hover states (exact)
    700: '#C15D80',  // Deeper accent pink — active elements (exact)
    800: '#A1365B',
    900: '#752441',
  },
  rose: {
    50: '#FCF6F8', 100: '#F8E6EC', 200: '#F2CEDA', 300: '#EBB4C6',
    400: '#E39BB4', 500: '#D9789A', 600: '#C15D80', 700: '#A1365B',
    800: '#752441', 900: '#4E1830',
  },
  berry: {
    300: '#D29EAC', 400: '#C36F85', 500: '#B44B67', 600: '#9A3D56',
    700: '#8C3A50',  // Soft burgundy — anchor for dark text
    800: '#6C273A', 900: '#481825',
  },
  cream: {
    50: '#FFF9F5',   // Warm off-white (exact)
    100: '#FDF3EC',  // Cream (exact)
    200: '#EEE4DD', 300: '#E1CEC1', 400: '#D1B39F', 500: '#BD9275',
    600: '#A57250', 700: '#7C553C', 800: '#5A3E2B', 900: '#37261B',
  },
  logo: '#F13184',   // NEW — reserved for logo, splash, key brand moments only
  sage: { /* leave unchanged — used for "in stock" success states, not brand pink */ },
  gold: { /* leave unchanged — used for star ratings, not brand pink */ },
},
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(220, 120, 137, 0.08)',
        'soft-lg': '0 8px 30px rgba(220, 120, 137, 0.12)',
        'soft-xl': '0 12px 40px rgba(220, 120, 137, 0.15)',
        'inner-soft': 'inset 0 1px 3px rgba(220, 120, 137, 0.06)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'cart-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fade-in-down': 'fade-in-down 0.4s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'cart-pop': 'cart-pop 0.4s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
