import { SeccionComunidad } from '@presentacion/componentes/presentacion/SeccionComunidad';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Comunidad | Patitas en Alerta',
  description: 'Conocé a los co-creadores y rescatistas que ayudan a construir la plataforma.',
};

export default function PaginaComunidad() {
  return (
    <main className="min-h-screen bg-base">
      <SeccionComunidad />
    </main>
  );
}
