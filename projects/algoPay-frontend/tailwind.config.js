/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false,  // Disable Tailwind reset — our App.css design system handles global styles
  },
  theme: {
    extend: {},
  },
  plugins: [],
}