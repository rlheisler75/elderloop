export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36aaf5',
          500: '#0c90e1',
          600: '#0072bf',
          700: '#015a9a',
          800: '#064d80',
          900: '#0a406b',
          950: '#072a49',
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
