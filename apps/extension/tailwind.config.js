/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6fa5ee',
          light: '#8fb9f3',
          dark: '#5089d8',
        },
        background: {
          light: '#fafafa',
          dark: '#1a1a1a',
        },
        text: {
          primary: '#272f3a',
          secondary: '#979fac',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
