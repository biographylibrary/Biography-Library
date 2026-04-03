import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans', 'sans-serif'],
        serif: ['Noto Serif', 'serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        'bg-main': '#EDEBE7',
        'bg-surface': '#FDFBF7',
        'text-primary': '#121212',
        'text-secondary': '#616161',
        'btn-primary-bg': '#EDEBE7',
        'btn-primary-border': '#121212',
        'btn-hover': '#C8DFBE',
        'border-global': '#616161',
        'error': '#944454',
        'status-info': '#D3F1FF',
        'status-warning': '#FBDEC1',
        'status-success': '#C8DFBE',
        'dark-bg-main': '#1F2121',
        'dark-bg-surface': '#656767',
        'dark-text-primary': '#FDFBF7',
        'dark-text-secondary': 'rgba(167, 169, 169, 0.7)',
        'dark-btn-primary-bg': '#1F2121',
        'dark-btn-primary-border': '#EDEBE7',
        /** Official product palette — use for alerts, banners, callouts, badges (no random Tailwind hues). */
        brand: {
          ink: '#121212',
          paper: '#FFFFFF',
          beigeLight: '#FDFBF7',
          beigeBg: '#ECE9E4',
          greenLight: '#C8DFBE',
          greenDark: '#5E685A',
          blue: '#C4DAEB',
          mustardLight: '#EDE4B9',
          mustardDark: '#DDCF88',
          wine: '#944454',
          wineDark: '#6D323E',
        },
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
