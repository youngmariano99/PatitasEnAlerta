'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { Megaphone, Calendar, Home, Store } from 'lucide-react';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';
import { EstadisticasComunidad } from '@presentacion/componentes/home/EstadisticasComunidad';
import { TONO_POR_TIPO_REPORTE } from '@presentacion/config/tonosReporte';

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
    etiqueta: 'Reportar',
    descripcion: 'Ayudá a que vuelvan a casa',
    icono: Megaphone,
    imagen: '/animales/Reportar-mascota -perdida.png',
  },
  {
    href: '/municipio/eventos',
    etiqueta: 'Ver operativos',
    descripcion: 'Castración, desparasitación y más',
    icono: Calendar,
    imagen: '/animales/Datos y turnos del municipio.png',
  },
  {
    href: '/adopciones',
    etiqueta: 'Adopción',
    descripcion: 'Dale una segunda oportunidad',
    icono: Home,
    imagen: '/animales/Éxito-Confirmación.png',
  },
  {
    href: '/comercios',
    etiqueta: 'Veterinarios y comercios',
    descripcion: 'Productos y servicios verificados',
    icono: Store,
    imagen: '/animales/Veterinarias  gestión y registros clínicos.png',
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
              <ul className="flex flex-col gap-2">
                {reportes.items.map((reporte) => (
                  <li key={reporte.id}>
                    <Link href={`/reportes/${reporte.id}`}>
                      <Tarjeta className="hover:border-accent">
                        <Badge
                          tono={
                            TONO_POR_TIPO_REPORTE[
                              reporte.tipo as keyof typeof TONO_POR_TIPO_REPORTE
                            ] ?? 'neutro'
                          }
                        >
                          {reporte.tipo}
                        </Badge>
                        <p className="mt-1 text-sm text-text-primary">{reporte.descripcion}</p>
                      </Tarjeta>
                    </Link>
                  </li>
                ))}
              </ul>
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
              <ul className="flex flex-col gap-2">
                {eventos.items.map((evento) => (
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
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ACCESOS_RAPIDOS.map((acceso) => (
            <Link key={acceso.href} href={acceso.href}>
              <div className="flex h-full flex-col overflow-hidden rounded-lg border border-surface2 bg-surface1 shadow-sm hover:border-accent">
                <div className="relative h-24 w-full sm:h-28">
                  <Image
                    src={acceso.imagen}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <div className="flex items-center gap-1.5">
                    <acceso.icono aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                    <p className="text-sm font-medium text-text-primary">{acceso.etiqueta}</p>
                  </div>
                  <p className="text-sm text-text-muted">{acceso.descripcion}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
