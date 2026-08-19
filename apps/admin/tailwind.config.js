/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
          elevated: '#ffffff',
        },
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(15 23 42 / 0.04), 0 4px 16px -2px rgb(15 23 42 / 0.06)',
        glow: '0 0 40px -8px rgb(20 184 166 / 0.35)',
        'glow-violet': '0 0 40px -8px rgb(139 92 246 / 0.3)',
      },
      backgroundImage: {
        'mesh-admin': 'radial-gradient(at 40% 20%, rgb(20 184 166 / 0.12) 0px, transparent 50%), radial-gradient(at 80% 0%, rgb(139 92 246 / 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, rgb(59 130 246 / 0.08) 0px, transparent 50%)',
        'mesh-hero': 'linear-gradient(135deg, #0f766e 0%, #0d9488 35%, #6366f1 100%)',
        'mesh-login': 'linear-gradient(135deg, #0f172a 0%, #134e4a 50%, #312e81 100%)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        celebrate: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.45s ease-out forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        celebrate: 'celebrate 0.6s ease-in-out',
      },
    },
  },
  plugins: [],
};
