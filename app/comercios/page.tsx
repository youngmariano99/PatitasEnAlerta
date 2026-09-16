import { BuscadorComercios } from '@presentacion/componentes/comercios/BuscadorComercios';

/**
 * Búsqueda y mapa de comercios verificados por proximidad (Módulo 7) — vista
 * pública, sin login (GET /api/comercios/cercanos ya es de lectura pública,
 * ver middleware.ts). Toda la lógica vive en BuscadorComercios.tsx.
 */
export default function PaginaComercios() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-text-primary">
      <h1 className="mb-1 text-xl font-semibold">Comercios cercanos</h1>
      <p className="mb-6 text-sm text-text-muted">
        Pet shops, veterinarias, forrajerías y otros comercios verificados por la plataforma.
      </p>
      <BuscadorComercios />
    </main>
  );
}
