import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Patitas en Alerta',
  description: 'Plataforma municipal de bienestar animal — Coronel Pringles',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body>{children}</body>
    </html>
  );
}
