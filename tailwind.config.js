/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Roboto', 'system-ui', 'sans-serif'],
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        blush: {
          50: '#FCF3F7',
          100: '#F8DDE9',
          200: '#F5BCD5',
          300: '#F28CB8',
          400: '#F25A9B',
          500: '#F13184', // LOGO PINK (base) — primary brand color, buttons, links, logo
          600: '#D70F65', // deep pink — active/pressed states
          700: '#A20B4C', // dark pink — headings on light bg, emphasis
          800: '#760536', // darkest — text on pink backgrounds
          900: '#4F0322',
        },
        rose: {
          // same ramp, mirrored for consistency since this scale is barely used elsewhere
          50: '#FCF3F7',
          100: '#F8DDE9',
          200: '#F5BCD5',
          300: '#F28CB8',
          400: '#F25A9B',
          500: '#F13184',
          600: '#D70F65',
          700: '#A20B4C',
          800: '#760536',
          900: '#4F0322',
        },
        berry: {
          // one step darker than blush at each index — this is the scale used for body/heading text sitewide
          300: '#F5BCD5',
          400: '#F28CB8',
          500: '#F25A9B',
          600: '#F13184',
          700: '#D70F65',
          800: '#A20B4C',
          900: '#760536',
        },
        cream: {
          50: '#FFF9F5',
          100: '#FDF3EC',
          200: '#EEE4DD',
          300: '#E1CEC1',
          400: '#D1B39F',
          500: '#BD9275',
          600: '#A57250',
          700: '#7C553C',
          800: '#5A3E2B',
          900: '#37261B',
        },
        sage: {
          50: '#f7f9f6',
          100: '#eef3ec',
          200: '#dde8da',
          300: '#c2d2bd',
          400: '#a0b89b',
          500: '#809b7a',
          600: '#637e5d',
          700: '#4f644a',
          800: '#3f503c',
          900: '#334230',
        },
        gold: {
          50: '#fdfaf3',
          100: '#faf3e1',
          200: '#f3e5bf',
          300: '#ead08c',
          400: '#ddb858',
          500: '#cda03a',
          600: '#b5832e',
          700: '#926628',
          800: '#765124',
          900: '#5f4220',
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(241, 49, 132, 0.08)',
        'soft-lg': '0 8px 30px rgba(241, 49, 132, 0.12)',
        'soft-xl': '0 12px 40px rgba(241, 49, 132, 0.15)',
        'inner-soft': 'inset 0 1px 3px rgba(241, 49, 132, 0.06)',
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
