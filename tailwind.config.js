/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'oga-black': '#000000',
        'oga-charcoal': '#121212',
        'oga-green': '#39FF14',
        'oga-grey': '#2C2C2C',
        'oga-surface': '#1A1A1A',
      },
      fontFamily: {
        sans: ['Helvetica Now', 'Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
