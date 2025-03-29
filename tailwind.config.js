/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0F172A',
        'brand-navy': '#1E293B',
        'brand-gray': '#334155',
        'brand-text': '#E2E8F0',
        'brand-text-secondary': '#94A3B8',
        'brand-red': '#EF4444',
        'brand-logo': '#60A5FA'
      }
    },
  },
  plugins: [],
};