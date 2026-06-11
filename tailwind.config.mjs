export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    screens: {
      sm: "576px",
      md: "768px",
      lg: "992px",
      xl: "1200px",
      "2xl": "1400px"
    },
    extend: {
      colors: {
        primary: "#2B1536",
        primaryLight: "#3B1C49",
        secondary: "#EF7C0E",
        tertiary: "#76368C"
      },
      boxShadow: {
        soft: "5px 5px 0px 0px #B1A96E"
      },
      fontFamily: {
        sans: ["Futura Md BT", "Futura", "Trebuchet MS", "sans-serif"]
      }
    }
  },
  plugins: []
};
