/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 10px 30px rgba(32, 35, 74, 0.08)'
      },
      colors: {
        primary: '#4338CA',
        secondary: '#6366F1',
        indigoDark: '#20234A',
        bgMain: '#F8FAFC',
        card: '#FFFFFF',
        lightIndigo: '#EEF2FF',
        border: '#E2E8F0',
        textMain: '#20234A',
        textMuted: '#64748B',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444'
      }
    }
  },
  plugins: []
};
