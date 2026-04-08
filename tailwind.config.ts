import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        void: '#0d0d0d',
        base: '#111111',
        surface: '#181818',
        elevated: '#1f1f1f',
        overlay: '#252525',
        'bg-card': '#1a1a1a',
        'bg-surface': '#252525',
        border: {
          subtle: '#252525',
          default: '#2d2d2d',
          emphasis: '#3a3a3a',
          dark: '#2d2d2d',
        },
        ink: {
          primary: '#f0f0f0',
          secondary: '#888888',
          muted: '#555555',
          disabled: '#3a3a3a',
        },
        'text-primary': '#f0f0f0',
        'text-muted':   '#888888',
        accent: {
          DEFAULT: '#2563eb',
          light: '#3b82f6',
          dim: 'rgba(37,99,235,0.12)',
          cyan: '#22d3ee',
          emerald: '#22d3ee',
          red: '#f87171',
        },
        amber: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dim: 'rgba(245,158,11,0.12)',
        },
        emerald: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dim: 'rgba(16,185,129,0.12)',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dim: 'rgba(239,68,68,0.12)',
        },
        orange: {
          DEFAULT: '#f97316',
          light: '#fb923c',
          dim: 'rgba(249,115,22,0.12)',
        },
        violet: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dim: 'rgba(139,92,246,0.12)',
        },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out forwards',
        'slide-in': 'slide-in 0.3s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
