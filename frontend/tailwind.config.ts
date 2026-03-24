import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — mirror CSS vars for Tailwind class use
        base:      'var(--base)',
        raised:    'var(--raised)',
        float:     'var(--float)',
        // Named palette — earthy, warm
        cream:     'var(--cream)',
        parchment: 'var(--parchment)',
        taupe:     'var(--taupe)',
        sage:      'var(--sage)',
        coral:     'var(--coral)',
        amber:     'var(--amber)',
        live:      'var(--live)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      letterSpacing: {
        label: '0.13em',
      },
      borderRadius: {
        DEFAULT: '0px',
        sm:   '4px',
        md:   '6px',
        lg:   '10px',
        full: '9999px',
      },
    },
  },
  plugins: [],
}

export default config
