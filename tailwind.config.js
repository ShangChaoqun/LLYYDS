/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B8A',
          light: '#FF8FA8',
          dark: '#E5526E',
          50: '#FFF0F3',
          100: '#FFE0E8',
        },
        secondary: {
          DEFAULT: '#B088F9',
          light: '#C9ABFF',
          dark: '#9366E0',
          50: '#F3EEFF',
          100: '#E4D9FF',
        },
        bg: {
          DEFAULT: '#FFF5F7',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Helvetica Neue"', '"Microsoft YaHei"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
