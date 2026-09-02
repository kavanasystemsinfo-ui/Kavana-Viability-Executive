/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./apps/web/**/*.html",
    "./apps/web/**/*.component.ts",
    "./apps/web/**/*.template.ts",
    "./apps/web/**/*.scss"
  ],
  darkMode: 'class', 
  theme: {
    extend: {
      colors: {
        'bg': '#F7F6F2',
        'surface': '#FFFFFF',
        'ink': '#0F2A4A',
        'ink-hover': '#1A3F6B',
        'ai': '#2563EB',
        'green': '#0F766E',
        'amber': '#B45309',
        'red': '#B91C1C',
        'ink-secondary': '#475569',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'regular': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      fontVariantNumeric: {
        'tabular-nums': 'tabular-nums',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}