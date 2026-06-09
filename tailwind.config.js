/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // LearnPeers brand — derived from the corporate logo.
        // brand = the azure "Learn" / node colour (#0077BE)
        // ink   = the charcoal "Peers" / node colour (#243036)
        brand: {
          50: '#eff8fd',
          100: '#d8eefa',
          200: '#b4ddf4',
          300: '#84c6ec',
          400: '#4ca9de',
          500: '#1f8dcc',
          600: '#0077be', // primary brand colour (logo)
          700: '#02628f',
          800: '#0a4f74',
          900: '#0e4360',
          950: '#082a3f',
        },
        ink: {
          50: '#f4f7f8',
          100: '#e6ebed',
          200: '#ccd5d9',
          300: '#a6b4bb',
          400: '#738791',
          500: '#4f636d',
          600: '#3c4d56',
          700: '#313f47',
          800: '#2a363d',
          900: '#243036', // logo charcoal
          950: '#161e22',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.4s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
