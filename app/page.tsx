'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';
import { EstadisticasComunidad } from '@presentacion/componentes/home/EstadisticasComunidad';
import { TONO_POR_TIPO_REPORTE } from '@presentacion/config/tonosReporte';
import { optimizarImagenCloudinary, PRESETS_IMAGEN } from '@presentacion/lib/optimizacionImagenes';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que app/reportes/page.tsx.
const MapaComunidad = dynamic(
  () => import('@presentacion/componentes/mapas/MapaComunidad').then((mod) => mod.MapaComunidad),
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
  especie: string | null;
  fotoUrl?: string;
}

interface EventoApi {
  id: string;
  titulo: string;
  direccion: string;
  fecha: string;
  tipo: string;
  latitud: number;
  longitud: number;
}

interface RespuestaListado<T> {
  items: T[];
  total: number;
}

const ACCESOS_RAPIDOS = [
  {
    href: '/reportes/nuevo',
    etiqueta: 'Reportar mascota',
    imagen: '/acceso-rapido/Reportar-encontrado-perdido.png',
  },
  {
    href: '/municipio/eventos',
    etiqueta: 'Operativos',
    imagen: '/acceso-rapido/Operativos.png',
  },
  {
    href: '/adopciones',
    etiqueta: 'Adopciones',
    imagen: '/acceso-rapido/Adopciones.png',
  },
  {
    href: '/comercios',
    etiqueta: 'Veterinarias y comercios',
    imagen: '/acceso-rapido/Comercios-Veterinarios.png',
  },
];

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

/**
 * Home pública (`/`) — landing para un vecino sin cuenta. Reutiliza los
 * mismos endpoints públicos ya usados en `/reportes`, `/municipio/eventos`
 * y `/adopciones` (GET plano, sin `fetchConSesion`, mismos que
 * `RUTAS_API_LECTURA_PUBLICA` en middleware.ts habilita para `anon`) — el
 * strip de estadísticas reutiliza el `.total` que cada uno ya devuelve, sin
 * ningún fetch nuevo. Usa el shell de navegación de `app/layout.tsx` (modo
 * invitado).
 */
export default function HomePage() {
  const [reportes, setReportes] = useState<RespuestaListado<ReporteApi> | null>(null);
  const [eventos, setEventos] = useState<RespuestaListado<EventoApi> | null>(null);
  const [totalAdopcion, setTotalAdopcion] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/reportes?porPagina=30')
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: RespuestaListado<ReporteApi> | null) =>
        setReportes(datos ?? { items: [], total: 0 }),
      )
      .catch(() => setReportes({ items: [], total: 0 }));

    fetch('/api/municipio/eventos?porPagina=15')
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: RespuestaListado<EventoApi> | null) =>
        setEventos(datos ?? { items: [], total: 0 }),
      )
      .catch(() => setEventos({ items: [], total: 0 }));

    fetch('/api/adopciones?pagina=1&porPagina=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: RespuestaListado<unknown> | null) => setTotalAdopcion(datos?.total ?? 0))
      .catch(() => setTotalAdopcion(0));
  }, []);

  const marcadoresReportes = (reportes?.items ?? []).map((r) => ({
    id: r.id,
    tipo: r.tipo,
    estado: r.estado,
    descripcion: r.descripcion,
    latitud: r.latitud,
    longitud: r.longitud,
    especie: r.especie,
    fotoUrl: r.fotoUrl,
  }));
  const marcadoresEventos = eventos?.items ?? [];

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 text-text-primary">
      <section className="relative mb-6 overflow-hidden rounded-lg">
        <div className="relative h-80 w-full sm:h-96 lg:aspect-[8/3] lg:h-auto">
          <Image
            src="/Banner_inicial.png"
            alt="Un perro y un gato con pañuelos rojos de Patitas en Alerta"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Degradé angosto (no toda la foto) usando el token `text-primary`
              (Carbón Óptico, nunca negro puro) — deja ver el color real de la
              foto en la mayor parte de la imagen, con contraste garantizado
              solo detrás del texto. */}
          <div className="absolute inset-0 bg-gradient-to-r from-text-primary from-5% via-text-primary/70 via-35% to-transparent to-60%" />
          <div className="relative flex h-full max-w-md flex-col justify-center gap-4 px-6 sm:px-10">
            <h1 className="font-display text-3xl font-bold text-base">Patitas en Alerta</h1>
            <p className="text-base/90">
              Reportar protege. Actuar salva. Reportá una mascota perdida o encontrada, seguí los
              operativos municipales y encontrá tu próximo compañero en adopción — sin necesidad de
              crear una cuenta.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/reportes/nuevo">
                <Boton>Reportar una mascota</Boton>
              </Link>
              <Link href="/auth/registro">
                {/* Estilo inline (no className) a propósito: `variante="secundaria"`
                    usa texto/borde `accent`, pensado para fondos claros — acá
                    necesitamos garantía de contraste sobre el degradé oscuro,
                    y un override por className no es fiable contra el orden
                    interno de utilidades que genera Tailwind. */}
                <Boton variante="secundaria" style={{ borderColor: '#F8F9FA', color: '#F8F9FA' }}>
                  Crear cuenta
                </Boton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <EstadisticasComunidad
          reportesActivos={reportes?.total ?? null}
          operativosProximos={eventos?.total ?? null}
          animalesAdopcion={totalAdopcion}
        />
      </section>

      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Mapa de la comunidad</h2>
            <Link
              href="/reportes"
              className="text-sm text-accent underline-offset-2 hover:underline"
            >
              Ver todos los reportes
            </Link>
          </div>
          {reportes === null || eventos === null ? (
            <p className="text-sm text-text-muted">Cargando…</p>
          ) : (
            <MapaComunidad
              reportes={marcadoresReportes}
              eventos={marcadoresEventos}
              centro={CENTRO_PRINGLES}
            />
          )}

          <div className="mt-8">
            <h2 className="mb-4 font-display text-xl font-bold text-text-primary">Accesos rápidos</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {ACCESOS_RAPIDOS.map((acceso) => (
                <Link
                  key={acceso.href}
                  href={acceso.href}
                  aria-label={acceso.etiqueta}
                  className="group relative block aspect-[16/7] min-h-[110px] w-full overflow-hidden rounded-xl border-2 border-surface2 bg-surface1 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Image
                    src={acceso.imagen}
                    alt={acceso.etiqueta}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Reportes recientes</h2>
              <Link
                href="/reportes"
                className="text-sm text-accent underline-offset-2 hover:underline"
              >
                Ver todos
              </Link>
            </div>
            {reportes === null ? <p className="text-sm text-text-muted">Cargando…</p> : null}
            {reportes && reportes.items.length === 0 ? (
              <p className="text-sm text-text-muted">No hay reportes activos por el momento.</p>
            ) : null}
            {reportes && reportes.items.length > 0 ? (
              <>
                <ul className="flex flex-col gap-2">
                  {reportes.items.slice(0, 4).map((reporte) => (
                    <li key={reporte.id}>
                      <Link href={`/reportes/${reporte.id}`} className="block">
                        <Tarjeta className="flex items-center gap-3 p-2.5 hover:border-accent">
                          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-surface2 bg-surface2">
                            <span className="text-xl" aria-hidden="true">
                              {reporte.especie?.toLowerCase() === 'gato' ? '🐱' : reporte.especie?.toLowerCase() === 'perro' ? '🐶' : '🐾'}
                            </span>
                            {reporte.fotoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={optimizarImagenCloudinary(
                                  reporte.fotoUrl,
                                  PRESETS_IMAGEN.miniatura,
                                )}
                                alt={reporte.descripcion}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                tono={
                                  TONO_POR_TIPO_REPORTE[
                                    reporte.tipo as keyof typeof TONO_POR_TIPO_REPORTE
                                  ] ?? 'neutro'
                                }
                              >
                                {reporte.tipo}
                              </Badge>
                              {reporte.especie ? (
                                <span className="text-xs capitalize text-text-muted">
                                  · {reporte.especie}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 line-clamp-2 text-sm text-text-primary">
                              {reporte.descripcion}
                            </p>
                          </div>
                        </Tarjeta>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Link href="/reportes" className="block">
                    <Boton variante="secundaria" className="w-full text-sm">
                      Ver todos los reportes {reportes.total > 0 ? `(${reportes.total})` : ''}
                    </Boton>
                  </Link>
                </div>
              </>
            ) : null}
          </div>

          <div>
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
            {eventos && eventos.items.length === 0 ? (
              <p className="text-sm text-text-muted">No hay operativos próximos por el momento.</p>
            ) : null}
            {eventos && eventos.items.length > 0 ? (
              <>
                <ul className="flex flex-col gap-2">
                  {eventos.items.slice(0, 3).map((evento) => (
                    <li key={evento.id}>
                      <Link href="/municipio/eventos">
                        <Tarjeta className="hover:border-accent">
                          <p className="font-medium text-text-primary">{evento.titulo}</p>
                          <p className="text-sm text-text-muted">
                            {formatearFecha(evento.fecha)} · {evento.direccion}
                          </p>
                        </Tarjeta>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <Link href="/municipio/eventos" className="block">
                    <Boton variante="secundaria" className="w-full text-sm">
                      Ver calendario completo {eventos.total > 0 ? `(${eventos.total})` : ''}
                    </Boton>
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
