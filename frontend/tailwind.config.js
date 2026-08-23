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
        // === Surface colors ===
        surface: {
          dark: '#0F172A',          // Dashboard background
          'dark-card': '#1E293B',   // Dashboard card
          'dark-border': '#334155', // Dashboard borders
          light: '#FAFAFA',         // Storefront background
          'light-card': '#FFFFFF',  // Storefront card
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
