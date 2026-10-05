/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // identidade visual inspirada no Porto Digital
        porto: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8ec6ff',
          400: '#59a6ff',
          500: '#3385fc',
          600: '#1d65f1',
          700: '#1650de',
          800: '#1943b4',
          900: '#1a3c8e',
        },
        criativo: {
          400: '#ffb547',
          500: '#ff9a1f',
          600: '#ea7a0b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};