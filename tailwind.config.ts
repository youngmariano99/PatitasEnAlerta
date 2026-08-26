import type { Config } from 'tailwindcss';

/**
 * "Patitas en Alerta UI SYSTEM" — Dark Utility Premium.
 *
 * REGLAS DE NEGACIÓN ("El Freno de IA") — no tocar sin actualizar docs/diseno:
 * - Prohibido purple/violet/indigo de Tailwind.
 * - Prohibido negro puro (#000) y blanco puro (#FFF).
 * - Fuente mínima 14px (text-sm es el piso permitido).
 * - Toda superficie interactiva ≥44x44px (ver plugin de utilidades táctiles abajo).
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/presentacion/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Fondo / superficies — usar SIEMPRE estos tokens, nunca hex directo en componentes
        base: '#0B0F19', // = slate-950
        surface1: '#1E293B', // = slate-800
        surface2: '#334155', // = slate-700
        // Texto
        'text-primary': '#F8FAFC', // = slate-50
        'text-muted': '#94A3B8', // = slate-400
        // Acento y semánticos
        accent: '#3B82F6', // = blue-500
        success: '#10B981', // = emerald-500
        danger: '#EF4444', // = red-500
      },
      fontFamily: {
        display: ['var(--font-display)', 'Plus Jakarta Sans', 'sans-serif'],
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // Piso de 14px: no agregar tamaños menores acá
        xs: ['14px', '20px'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      borderStyle: {
        dashed: 'dashed',
      },
    },
  },
  plugins: [],
};

export default config;
