import type { Config } from 'tailwindcss';

/**
 * "Patitas en Alerta UI SYSTEM" — Brandbook institucional (docs/DISENO.md).
 *
 * REGLAS DE NEGACIÓN ("El Freno de IA") — no tocar sin actualizar docs/DISENO.md:
 * - Prohibido negro puro (#000) y blanco puro (#FFF) — usar `base`/`text-primary`.
 * - `alert` (Naranja Alerta) reservado para emergencias reales, nunca error de formulario.
 * - Fuente mínima 14px (text-sm es el piso permitido).
 * - Toda superficie interactiva ≥44x44px (ver plugin de utilidades táctiles abajo).
 * - Ningún estado se comunica solo por color: siempre ícono + texto explícito.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/presentacion/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondo / superficies — usar SIEMPRE estos tokens, nunca hex directo en componentes
        base: '#F8F9FA', // Blanco Clínico
        surface1: '#EEF1F4',
        surface2: '#E2E8EE',
        // Texto
        'text-primary': '#1E1E1E', // Carbón Óptico
        'text-muted': '#5B6470', // gris medio, ≥4.5:1 sobre #F8F9FA
        // Marca y semánticos
        primary: '#008080', // Verde Sanitario — navegación, CTA primaria
        accent: '#0073E6', // Azul Cívico — enlaces, focus states
        alert: '#C44601', // Naranja Alerta — solo emergencias reales / FAB crítico
        success: '#0F7B4D',
        danger: '#B3261E',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Lexend', 'sans-serif'],
        sans: ['var(--font-sans)', 'Atkinson Hyperlegible', 'sans-serif'],
        mono: ['var(--font-mono)', 'Roboto Mono', 'monospace'],
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
