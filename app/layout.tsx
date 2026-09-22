import type { Metadata } from 'next';
import { Lexend, Atkinson_Hyperlegible, Roboto_Mono } from 'next/font/google';
import './globals.css';

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Patitas en Alerta',
  description: 'Plataforma municipal de bienestar animal — Coronel Pringles',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${lexend.variable} ${atkinsonHyperlegible.variable} ${robotoMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
