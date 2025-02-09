import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tone1 : "#01012D",
        tone2 : "#11A27F",
        tone3: "#D292FF",
        tone4: "#ffffff",
        tone5 : "#3D46FE",
        tone6:"#212121",
        tone7:"#171717",
        textTone1:"#B4B5B5",
        black: "#000000",
        navy: "#14213d",
        gray: "#e5e5e5",
        orange: "#fca311",
      },
      fontFamily: {
        Poppins: ["Poppins", "sans-serif"],
        Roboto: ["Roboto", "sans-serif"],
        OpenSans: ["Open Sans", "sans-serif"],
        Montserrat : ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
