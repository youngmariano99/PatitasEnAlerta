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

const TONO_POR_TIPO_REPORTE: Record<string, 'alerta' | 'exito' | 'peligro'> = {
  perdido: 'alerta',
  encontrado: 'exito',
  problematica: 'peligro',
};

const ACCESOS_RAPIDOS = [
  {
    href: '/reportes/nuevo',
    etiqueta: 'Reportar',
    descripcion: 'Ayudá a que vuelvan a casa',
    icono: Megaphone,
  },
  {
    href: '/municipio/eventos',
    etiqueta: 'Ver operativos',
    descripcion: 'Castración, desparasitación y más',
    icono: Calendar,
  },
  {
    href: '/adopciones',
    etiqueta: 'Adopción',
    descripcion: 'Dale una segunda oportunidad',
    icono: Home,
  },
  {
    href: '/comercios',
    etiqueta: 'Comercios y veterinarias',
    descripcion: 'Productos y servicios verificados',
    icono: Store,
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
    fetch('/api/reportes?porPagina=6')
      .then((r) => (r.ok ? r.json() : null))
      .then((datos: RespuestaListado<ReporteApi> | null) =>
        setReportes(datos ?? { items: [], total: 0 }),
      )
      .catch(() => setReportes({ items: [], total: 0 }));

    fetch('/api/municipio/eventos?porPagina=3')
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
  }));
  const marcadoresEventos = eventos?.items ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-text-primary">
      <section className="mb-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
        <div className="flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
          <h1 className="font-display text-3xl font-bold">Patitas en Alerta</h1>
          <p className="max-w-md text-text-muted">
            Reportar protege. Actuar salva. Reportá una mascota perdida o encontrada, seguí los
            operativos municipales y encontrá tu próximo compañero en adopción — sin necesidad de
            crear una cuenta.
          </p>
          <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
            <Link href="/reportes/nuevo">
              <Boton>Reportar una mascota</Boton>
            </Link>
            <Link href="/auth/registro">
              <Boton variante="secundaria">Crear cuenta</Boton>
            </Link>
          </div>
        </div>
        <Image
          src="/Banner_inicial.png"
          alt="Un perro y un gato con pañuelos rojos de Patitas en Alerta"
          width={2048}
          height={768}
          priority
          className="h-56 w-full rounded-lg object-cover sm:h-72 lg:h-full"
        />
      </section>

      <section className="mb-10">
        <EstadisticasComunidad
          reportesActivos={reportes?.total ?? null}
          operativosProximos={eventos?.total ?? null}
          animalesAdopcion={totalAdopcion}
        />
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Mapa de la comunidad</h2>
          <Link href="/reportes" className="text-sm text-accent underline-offset-2 hover:underline">
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
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Reportes recientes</h2>
          <Link href="/reportes" className="text-sm text-accent underline-offset-2 hover:underline">
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
                  <Tarjeta className="flex items-center justify-between gap-3 hover:border-accent">
                    <div>
                      <Badge tono={TONO_POR_TIPO_REPORTE[reporte.tipo] ?? 'neutro'}>
                        {reporte.tipo}
                      </Badge>
                      <p className="mt-1 text-sm text-text-primary">{reporte.descripcion}</p>
                    </div>
                  </Tarjeta>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mb-10">
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
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ACCESOS_RAPIDOS.map((acceso) => (
            <Link key={acceso.href} href={acceso.href}>
              <Tarjeta className="flex h-full flex-col items-center gap-2 text-center hover:border-accent">
                <acceso.icono aria-hidden="true" className="h-6 w-6 text-primary" />
                <p className="font-medium text-text-primary">{acceso.etiqueta}</p>
                <p className="text-sm text-text-muted">{acceso.descripcion}</p>
              </Tarjeta>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
