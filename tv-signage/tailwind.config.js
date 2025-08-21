/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        uct: {
          primary: '#2D1B69',
          secondary: '#FFD700',
          accent: '#20B2AA',
          light: '#F8F9FA',
          dark: '#1A1A2E',
          gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#111827',
          },
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'uct': '0 4px 6px -1px rgba(45, 27, 105, 0.1), 0 2px 4px -1px rgba(45, 27, 105, 0.06)',
        'uct-lg': '0 10px 15px -3px rgba(45, 27, 105, 0.1), 0 4px 6px -2px rgba(45, 27, 105, 0.05)',
      },
      backgroundImage: {
        'uct-gradient': 'linear-gradient(135deg, #2D1B69 0%, #1A1A2E 100%)',
        'uct-accent-gradient': 'linear-gradient(90deg, #20B2AA 0%, #FFD700 100%)',
      }
    },
  },
  plugins: [],
};
