'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que app/reportes/page.tsx.
const MapaReportes = dynamic(
  () => import('@presentacion/componentes/mapas/MapaReportes').then((mod) => mod.MapaReportes),
  { ssr: false, loading: () => <p className="text-sm text-text-muted">Cargando mapa…</p> },
);

const CENTRO_PRINGLES: [number, number] = [-37.9989, -61.3565];

interface ReporteApi {
  id: string;
  tipo: string;
  estado: string;
  descripcion: string;
  latitud: number;
  longitud: number;
}

interface EventoApi {
  id: string;
  titulo: string;
  direccion: string;
  fecha: string;
}

interface FichaApi {
  id: string;
  nombreAnimal: string;
  especie: string;
  fotoUrl: string;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

/**
 * Home pública (`/`) — landing para un vecino sin cuenta. Reutiliza los
 * mismos endpoints públicos y componentes ya usados en `/reportes`,
 * `/municipio/eventos` y `/adopciones` (GET plano, sin `fetchConSesion`,
 * mismos que `RUTAS_API_LECTURA_PUBLICA` en middleware.ts habilita para
 * `anon`) — nada de lógica de datos nueva, solo teasers de lo que ya
 * existe. Usa el shell de navegación de `app/layout.tsx` (modo invitado).
 */
export default function HomePage() {
  const [reportes, setReportes] = useState<ReporteApi[] | null>(null);
  const [eventos, setEventos] = useState<EventoApi[] | null>(null);
  const [fichas, setFichas] = useState<FichaApi[] | null>(null);

  useEffect(() => {
    fetch('/api/reportes?porPagina=6')
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: { items: ReporteApi[] } | null) => setReportes(datos?.items ?? []))
      .catch(() => setReportes([]));

    fetch('/api/municipio/eventos?porPagina=3')
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: { items: EventoApi[] } | null) => setEventos(datos?.items ?? []))
      .catch(() => setEventos([]));

    fetch('/api/adopciones?pagina=1&porPagina=3')
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: { items: FichaApi[] } | null) => setFichas(datos?.items ?? []))
      .catch(() => setFichas([]));
  }, []);

  const marcadores = (reportes ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo,
    estado: r.estado,
    descripcion: r.descripcion,
    latitud: r.latitud,
    longitud: r.longitud,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-text-primary">
      <section className="mb-10 flex flex-col items-center gap-4 text-center">
        <h1 className="font-display text-3xl font-bold">🐾 Patitas en Alerta</h1>
        <p className="max-w-md text-text-muted">
          Reportar protege. Actuar salva. Reportá una mascota perdida o encontrada, seguí los
          operativos municipales y encontrá tu próximo compañero en adopción — sin necesidad de
          crear una cuenta.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/reportes/nuevo">
            <Boton>Reportar una mascota</Boton>
          </Link>
          <Link href="/auth/registro">
            <Boton variante="secundaria">Crear cuenta</Boton>
          </Link>
          <Link href="/auth/login">
            <Boton variante="texto">Ya tengo cuenta</Boton>
          </Link>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Mapa de reportes activos</h2>
          <Link href="/reportes" className="text-sm text-accent underline-offset-2 hover:underline">
            Ver todos
          </Link>
        </div>
        {reportes === null ? (
          <p className="text-sm text-text-muted">Cargando…</p>
        ) : (
          <MapaReportes reportes={marcadores} centro={CENTRO_PRINGLES} />
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Próximos operativos</h2>
            <Link
              href="/municipio/eventos"
              className="text-sm text-accent underline-offset-2 hover:underline"
            >
              Ver calendario
            </Link>
          </div>
          {eventos === null ? <p className="text-sm text-text-muted">Cargando…</p> : null}
          {eventos && eventos.length === 0 ? (
            <p className="text-sm text-text-muted">No hay operativos próximos por el momento.</p>
          ) : null}
          {eventos && eventos.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {eventos.map((evento) => (
                <li key={evento.id}>
                  <Tarjeta>
                    <p className="font-medium text-text-primary">{evento.titulo}</p>
                    <p className="text-sm text-text-muted">
                      {formatearFecha(evento.fecha)} · {evento.direccion}
                    </p>
                  </Tarjeta>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">En adopción</h2>
            <Link
              href="/adopciones"
              className="text-sm text-accent underline-offset-2 hover:underline"
            >
              Ver vitrina
            </Link>
          </div>
          {fichas === null ? <p className="text-sm text-text-muted">Cargando…</p> : null}
          {fichas && fichas.length === 0 ? (
            <p className="text-sm text-text-muted">Por ahora no hay animales disponibles.</p>
          ) : null}
          {fichas && fichas.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {fichas.map((ficha) => (
                <li key={ficha.id}>
                  <Tarjeta className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ficha.fotoUrl}
                      alt={ficha.nombreAnimal}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                    <div>
                      <p className="font-medium text-text-primary">{ficha.nombreAnimal}</p>
                      <p className="text-sm text-text-muted">{ficha.especie}</p>
                    </div>
                  </Tarjeta>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <section className="mt-10">
        <Tarjeta className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-medium text-text-primary">
              ¿Buscás un pet shop o veterinaria cerca?
            </p>
            <p className="text-sm text-text-muted">
              Comercios verificados por el municipio, por proximidad.
            </p>
          </div>
          <Link href="/comercios">
            <Boton variante="secundaria">Buscar comercios</Boton>
          </Link>
        </Tarjeta>
      </section>
    </main>
  );
}
