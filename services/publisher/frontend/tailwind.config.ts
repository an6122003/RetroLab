import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Tonal Surface Hierarchy (from DESIGN.md) ──
        'surface':                  '#faf8ff',
        'surface-dim':              '#d2d9f4',
        'surface-bright':           '#faf8ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low':    '#f2f3ff',
        'surface-container':        '#eaedff',
        'surface-container-high':   '#e2e7ff',
        'surface-container-highest':'#dae2fd',

        // ── On-surface text ──
        'on-surface':         '#131b2e',
        'on-surface-variant': '#434655',

        // ── Primary ──
        'primary':           '#004ac6',
        'primary-container': '#2563eb',
        'on-primary':        '#ffffff',
        'on-primary-container': '#eeefff',

        // ── Secondary ──
        'secondary':           '#495c95',
        'secondary-container': '#acbfff',
        'on-secondary':        '#ffffff',

        // ── Tertiary (drafts / warnings) ──
        'tertiary':           '#943700',
        'tertiary-container': '#bc4800',
        'tertiary-fixed':     '#ffdbcd',
        'tertiary-fixed-dim': '#ffb596',
        'on-tertiary-fixed-variant': '#7d2d00',

        // ── Error ──
        'error':           '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error':        '#ffffff',
        'on-error-container': '#93000a',

        // ── Outline ──
        'outline':         '#737686',
        'outline-variant': '#c3c6d7',

        // ── Inverse ──
        'inverse-surface':    '#283044',
        'inverse-on-surface': '#eef0ff',
        'inverse-primary':    '#b4c5ff',
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
