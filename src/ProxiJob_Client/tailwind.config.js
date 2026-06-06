/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brown: {
          700: "#7d6651",
          800: "#8a6644",
          900: "#3f2a1a",
        },
        tan: {
          400: "#bd8c5a",
          600: "#ba6b2a",
          700: "#d4892f",
        },
      },
    },
  },
  plugins: [],
};
