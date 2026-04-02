import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Tonal Surface Hierarchy (from DESIGN.md) ──
        'surface':                  'var(--color-surface)',
        'surface-dim':              'var(--color-surface-dim)',
        'surface-bright':           'var(--color-surface-bright)',
        'surface-container-lowest': 'var(--color-surface-container-lowest)',
        'surface-container-low':    'var(--color-surface-container-low)',
        'surface-container':        'var(--color-surface-container)',
        'surface-container-high':   'var(--color-surface-container-high)',
        'surface-container-highest':'var(--color-surface-container-highest)',

        // ── On-surface text ──
        'on-surface':         'var(--color-on-surface)',
        'on-surface-variant': 'var(--color-on-surface-variant)',

        // ── Primary ──
        'primary':           'var(--color-primary)',
        'primary-container': 'var(--color-primary-container)',
        'on-primary':        'var(--color-on-primary)',
        'on-primary-container': 'var(--color-on-primary-container)',

        // ── Secondary ──
        'secondary':           'var(--color-secondary)',
        'secondary-container': 'var(--color-secondary-container)',
        'on-secondary':        'var(--color-on-secondary)',

        // ── Tertiary (drafts / warnings) ──
        'tertiary':           'var(--color-tertiary)',
        'tertiary-container': 'var(--color-tertiary-container)',
        'tertiary-fixed':     'var(--color-tertiary-fixed)',
        'tertiary-fixed-dim': 'var(--color-tertiary-fixed-dim)',
        'on-tertiary-fixed-variant': 'var(--color-on-tertiary-fixed-variant)',

        // ── Error ──
        'error':           'var(--color-error)',
        'error-container': 'var(--color-error-container)',
        'on-error':        'var(--color-on-error)',
        'on-error-container': 'var(--color-on-error-container)',

        // ── Outline ──
        'outline':         'var(--color-outline)',
        'outline-variant': 'var(--color-outline-variant)',

        // ── Inverse ──
        'inverse-surface':    'var(--color-inverse-surface)',
        'inverse-on-surface': 'var(--color-inverse-on-surface)',
        'inverse-primary':    'var(--color-inverse-primary)',
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body:     ['Inter', 'sans-serif'],
        label:    ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg:      '0.5rem',
        xl:      '0.75rem',
        '2xl':   '1rem',
        full:    '9999px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
