/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // 动画/过渡
    { pattern: /^animate-.*/ },
    { pattern: /^(duration|delay)-\d+$/ },
    { pattern: /^(ease|ease-in|ease-out|ease-in-out)$/ },
    // 颜色/背景（如果你用到动态色）
    { pattern: /^(bg|from|via|to|text|border|ring|shadow)-(.*)$/ },
    // 位移/透明（常见入场动效里会动态拼）
    { pattern: /^(translate|scale|rotate|opacity)-.*/ },
  ],
  theme: { extend: {} },
  plugins: [],
}
