/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF5A5F',
        secondary: '#4A90E2',
        accent: '#00D4FF',
      },
    },
  },
  plugins: [],
}