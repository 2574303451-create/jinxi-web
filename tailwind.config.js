/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Keep safelist empty by default; broad regex patterns massively increase CSS bundle size.
  safelist: [],
  theme: { extend: {} },
  plugins: [],
}
