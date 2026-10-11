/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#183D32', // Forest Green
          background: '#FAF7F0', // Warm Ivory
          secondary: '#DDE7D8', // Muted Sage
          accent: '#D9A441', // Golden Amber
          text: '#252A26', // Charcoal
          surface: '#FFFFFF', // White
          error: '#E53E3E', // Muted Red (Approx)
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'], // Fallback serif for promotional headers
      }
    },
  },
  plugins: [],
}
