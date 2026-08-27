/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === State colors (from design-spec §2.2) ===
        // Used identically across every screen for system state
        ai: {
          proposed: '#3B82F6',      // Blue — AI-generated content
          'proposed-light': '#DBEAFE',
        },
        clamped: {
          DEFAULT: '#F59E0B',       // Amber — policy modified or pending
          light: '#FEF3C7',
        },
        approved: {
          DEFAULT: '#10B981',       // Green — clean pass or success
          light: '#D1FAE5',
        },
        rejected: {
          DEFAULT: '#EF4444',       // Red — rejected or failed
          light: '#FEE2E2',
        },
        // === Cotton candy palette (surfaces & chrome only) ===
        candy: {
          pink: '#F472B6',
          'pink-deep': '#EC4899',
          lavender: '#A78BFA',
          'lavender-deep': '#8B5CF6',
          sky: '#38BDF8',
          'sky-soft': '#7DD3FC',
          blush: '#FDF2F8',
          cream: '#FFFBFE',
        },
        // === Dusk-night dashboard surfaces ===
        dusk: {
          DEFAULT: '#171325',       // Dashboard background
          card: '#211B36',          // Dashboard card
          border: '#372E52',        // Dashboard borders
          glow: '#4C3A6E',          // Aurora glow base
        },
        // === Legacy surface aliases (kept for existing markup) ===
        surface: {
          dark: '#171325',
          'dark-card': '#211B36',
          'dark-border': '#372E52',
          light: '#FDF7FB',
          'light-card': '#FFFFFF',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'candy-sky': 'linear-gradient(160deg, #FDF2F8 0%, #F3EFFE 40%, #E3F2FD 100%)',
        'candy-btn': 'linear-gradient(135deg, #F472B6 0%, #A78BFA 60%, #60A5FA 120%)',
        'candy-soft': 'linear-gradient(135deg, #FCE7F3 0%, #EDE9FE 55%, #E0F2FE 100%)',
      },
      boxShadow: {
        candy: '0 8px 30px rgba(236, 72, 153, 0.12), 0 2px 8px rgba(139, 92, 246, 0.08)',
        'candy-lg': '0 16px 50px rgba(236, 72, 153, 0.18), 0 4px 14px rgba(96, 165, 250, 0.10)',
        glow: '0 0 24px rgba(167, 139, 250, 0.25)',
      },
    },
  },
  plugins: [],
}
