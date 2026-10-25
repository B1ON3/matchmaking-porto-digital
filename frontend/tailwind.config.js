const verde = {
  50: '#f2f8f4',
  100: '#dfeee5',
  200: '#c1ddcc',
  300: '#95c3ab',
  400: '#66a386',
  500: '#45876b',
  600: '#326c55',
  700: '#295746',
  800: '#23473a',
  900: '#1e3b31',
  950: '#0f211b',
};

const barro = {
  50: '#fdf5ef',
  100: '#fbe9dd',
  200: '#f6d0b9',
  300: '#efae8a',
  400: '#e78358',
  500: '#d96a3f',
  600: '#c4622d',
  700: '#a94f24',
  800: '#8c4120',
  900: '#73371f',
};

const areia = {
  50: '#fdfaf3',
  100: '#faf4e7',
  200: '#f4e9d8',
  300: '#ecd9bd',
  400: '#dfc096',
  500: '#d0a56e',
  600: '#b8854d',
  700: '#996a3f',
  800: '#7d5736',
};

const noite = {
  500: '#2c463c',
  600: '#213830',
  700: '#182a23',
  800: '#12201b',
  850: '#0e1a16',
  900: '#0b1512',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        laco: verde,
        // mantido como alias para as telas antigas que ainda usam `porto-*`
        porto: verde,
        barro,
        criativo: barro,
        areia,
        noite,
        creme: '#faf7f0',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        laco: '0 28px 60px -34px rgba(15, 33, 27, 0.55)',
      },
    },
  },
  plugins: [],
};
