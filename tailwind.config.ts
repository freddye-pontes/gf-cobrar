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
        void: '#F8FAFC',
        base: '#F1F5F9',
        surface: '#FFFFFF',
        elevated: '#F1F5F9',
        overlay: '#E8EDF2',
        'bg-card': '#FFFFFF',
        'bg-surface': '#F8FAFC',
        border: {
          subtle: '#E2E8F0',
          default: '#E2E8F0',
          emphasis: '#CBD5E1',
          dark: '#CBD5E1',
        },
        ink: {
          primary: '#1A1A1A',
          secondary: '#64748B',
          muted: '#94A3B8',
          disabled: '#CBD5E1',
        },
        'text-primary': '#1A1A1A',
        'text-muted':   '#64748B',
        accent: {
          DEFAULT: '#FF6600',
          light: '#E65C00',
          dim: 'rgba(255,102,0,0.10)',
          cyan: '#0891B2',
          emerald: '#10B981',
          red: '#E63946',
        },
        amber: {
          DEFAULT: '#D97706',
          light: '#F59E0B',
          dim: 'rgba(217,119,6,0.10)',
        },
        emerald: {
          DEFAULT: '#10B981',
          light: '#059669',
          dim: 'rgba(16,185,129,0.10)',
        },
        danger: {
          DEFAULT: '#E63946',
          light: '#EF4444',
          dim: 'rgba(230,57,70,0.10)',
        },
        orange: {
          DEFAULT: '#FF6600',
          light: '#E65C00',
          dim: 'rgba(255,102,0,0.10)',
        },
        violet: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          dim: 'rgba(124,58,237,0.10)',
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
