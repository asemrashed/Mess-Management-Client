import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f7f2",
          100: "#e2ebde",
          500: "#3f7d3a",
          600: "#33642f",
          700: "#284f25",
        },
      },
    },
  },
  plugins: [],
};
export default config;
