/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AXEL PLAY Brand Colors
        primary: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',  // Purple main
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        secondary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Blue main
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',  // Orange main
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        success: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Green main
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        game: {
          purple: '#8b5cf6',
          blue:   '#3b82f6',
          orange: '#f97316',
          green:  '#22c55e',
          pink:   '#ec4899',
          yellow: '#eab308',
          red:    '#ef4444',
          teal:   '#14b8a6',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'bounce-slow':   'bounce 2s infinite',
        'pulse-slow':    'pulse 3s infinite',
        'spin-slow':     'spin 3s linear infinite',
        'fade-in':       'fadeIn 0.3s ease-in-out',
        'slide-up':      'slideUp 0.3s ease-out',
        'slide-down':    'slideDown 0.3s ease-out',
        'zoom-in':       'zoomIn 0.2s ease-out',
        'confetti':      'confetti 1s ease-out forwards',
        'float':         'float 3s ease-in-out infinite',
        'glow':          'glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        zoomIn: {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        confetti: {
          '0%':   { transform: 'scale(0) rotate(0deg)',     opacity: '1' },
          '100%': { transform: 'scale(1.5) rotate(360deg)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(139,92,246,0.5)' },
          '50%':      { boxShadow: '0 0 20px rgba(139,92,246,0.9), 0 0 40px rgba(139,92,246,0.5)' },
        },
      },
      backgroundImage: {
        'gradient-axel':    'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 50%, #06b6d4 100%)',
        'gradient-game':    'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)',
        'gradient-success': 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
        'gradient-warm':    'linear-gradient(135deg, #f97316 0%, #ef4444 100%)',
        'gradient-dark':    'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glow-purple': '0 0 15px rgba(139,92,246,0.5)',
        'glow-blue':   '0 0 15px rgba(59,130,246,0.5)',
        'glow-orange': '0 0 15px rgba(249,115,22,0.5)',
        'glow-green':  '0 0 15px rgba(34,197,94,0.5)',
        'card':        '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        'card-hover':  '0 10px 15px -3px rgba(0,0,0,0.2), 0 4px 6px -4px rgba(0,0,0,0.1)',
        'game':        '0 20px 60px rgba(0,0,0,0.3)',
      },
      screens: {
        'xs': '475px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
    },
  },
  plugins: [],
}
