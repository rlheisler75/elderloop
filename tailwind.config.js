export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // brand.* is driven by CSS variables (see src/index.css) so a user's
        // chosen accent color (Settings page) re-tints every existing
        // bg-brand-*/text-brand-*/border-brand-* usage app-wide without
        // touching individual components. rgb(... / <alpha-value>) keeps
        // opacity modifiers like bg-brand-600/50 working.
        brand: {
          50:  'rgb(var(--brand-50) / <alpha-value>)',
          100: 'rgb(var(--brand-100) / <alpha-value>)',
          200: 'rgb(var(--brand-200) / <alpha-value>)',
          300: 'rgb(var(--brand-300) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
          800: 'rgb(var(--brand-800) / <alpha-value>)',
          900: 'rgb(var(--brand-900) / <alpha-value>)',
          950: 'rgb(var(--brand-950) / <alpha-value>)',
        },
        sage: {
          50:  '#f4f7f4',
          100: '#e3ebe3',
          200: '#c7d8c8',
          300: '#9dbda0',
          400: '#6d9d72',
          500: '#4c7f52',
          600: '#3a653f',
          700: '#2f5134',
          800: '#27422b',
          900: '#213724',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
}
