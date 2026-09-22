import Link from 'next/link';

/** Pie de página persistente — oculto en `/auth/*` por `ShellNavegacion`, igual que el resto del shell. */
export function PieDePagina() {
  return (
    <footer className="border-t border-surface2 bg-surface1 px-4 py-6 text-sm text-text-muted">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <p>🐾 Patitas en Alerta — Municipalidad de Coronel Pringles</p>
        <nav aria-label="Enlaces del pie de página" className="flex gap-4">
          <Link href="/reportes" className="hover:underline">
            Reportes
          </Link>
          <Link href="/adopciones" className="hover:underline">
            Adopción
          </Link>
          <Link href="/comercios" className="hover:underline">
            Comercios
          </Link>
        </nav>
      </div>
    </footer>
  );
}
