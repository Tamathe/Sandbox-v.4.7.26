import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        kch: {
          blue: '#003DA5',
          'blue-light': '#0066CC',
          'blue-dark': '#002D7A',
          gold: '#C89933',
          gray: {
            50: '#F8F9FA',
            100: '#F1F3F5',
            200: '#E9ECEF',
            300: '#DEE2E6',
            400: '#CED4DA',
            500: '#ADB5BD',
            600: '#868E96',
            700: '#495057',
            800: '#343A40',
            900: '#212529',
          }
        }
      }
    },
  },
  plugins: [],
}
export default config
