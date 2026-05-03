// tailwind.config.js
// Compatible with: nativewind@^4.1.23, tailwindcss@^3.4.x
// All tokens derived from frontend/src/index.css and landing.module.css
const { hairlineWidth } = require('nativewind/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.ts',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // ─── Colors (Light theme defaults) ───────────────────────
      colors: {
        'page-bg':           '#f5f7fb',   // index.css:388
        'card-bg':           '#ffffff',   // index.css:389
        'card-border':       '#e2e8f0',   // index.css:390
        'input-bg':          '#f8fafc',   // index.css:391
        'input-border':      '#cbd5e1',   // index.css:392
        'text-primary':      '#0f172a',   // index.css:393
        'text-secondary':    '#64748b',   // index.css:394
        'text-muted':        '#8fa1b9',   // index.css:395
        'accent':            '#4a6db4',   // index.css:397
        'accent-soft':       '#dbeafe',   // index.css:398
        'accent-strong':     '#3c5873',   // index.css:399
        'link':              '#4f46e5',   // index.css:402
        'btn-bg':            '#ffffff',   // index.css:405
        'btn-bg-pressed':    '#f1f5f9',   // index.css:406
        'btn-text':          '#0f172a',   // index.css:407
        'btn-border':        '#cbd5e1',   // index.css:408
        'btn-primary-bg':    '#4a6db4',   // index.css:413
        'btn-primary-text':  '#ffffff',   // index.css:415
        'tab-inactive-bg':   '#e5e7eb',   // index.css:420
        'tab-inactive-text': '#4b5563',   // index.css:422
        'search-blue':       '#60a5fa',   // index.css:296
        'search-green':      '#22c55e',   // index.css:300
        'brand-from':        '#8b5e34',   // landing.module.css:42
        'brand-to':          '#c97b4a',   // landing.module.css:42
      },

      // ─── Border Radius ────────────────────────────────────────
      borderRadius: {
        'xs':   '2px',     // landing.module.css:260
        'sm':   '4px',     // index.css:167
        'md':   '6px',     // landing.module.css:237
        'base': '8px',     // landing.module.css:41
        'lg':   '10px',    // index.css:418 — default interactive element
        'xl':   '12px',    // landing.module.css:78
        '2xl':  '16px',    // landing.module.css:355 — bottom sheet top
        'full': '9999px',  // index.css:615
      },

      // ─── Font Families ────────────────────────────────────────
      fontFamily: {
        sans:  ['System'],
        serif: ['InstrumentSerif_400Regular'],
        hand:  ['Caveat_500Medium'],
        mono:  ['JetBrainsMono_400Regular', 'monospace'],
      },

      // ─── Font Sizes ───────────────────────────────────────────
      fontSize: {
        'display': ['56px', { lineHeight: '1.0' }],
        'h1':      ['32px', { lineHeight: '1.1' }],
        'h2':      ['24px', { lineHeight: '1.2' }],
        'lead':    ['18px', { lineHeight: '1.6' }],
        'body':    ['16px', { lineHeight: '1.5' }],
        'body-sm': ['15px', { lineHeight: '1.5' }],
        'body-xs': ['14px', { lineHeight: '1.4' }],
        'caption': ['13px', { lineHeight: '1.4' }],
        'label':   ['12px', { lineHeight: '1.3' }],
        'code':    ['13px', { lineHeight: '1.5' }],
      },

      // ─── Spacing extras ───────────────────────────────────────
      spacing: {
        '11': '44px',   // min touch target / button base height
        '13': '52px',   // button lg height
        '15': '60px',   // button xl height
        '17': '68px',   // nav height
      },

      minHeight: {
        'touch': '44px',
      },

      height: {
        'tab-bar': '56px',
      },

      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
  plugins: [],
};
