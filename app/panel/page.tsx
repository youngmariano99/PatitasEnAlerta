'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Calendar, CheckCircle2, type LucideIcon } from 'lucide-react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import {
  BadgeVerificacion,
  type EstadoVerificacion,
} from '@presentacion/componentes/auth/BadgeVerificacion';
import { ENLACES_POR_ROL, ETIQUETA_ROL } from '@presentacion/config/enlacesPorRol';

interface PerfilPropio {
  id: string;
  email: string;
  rol: string;
  estadoVerificacion: EstadoVerificacion;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

interface TarjetaUrgente {
  href: string | null;
  texto: string;
  icono: LucideIcon;
}

interface TurnoPropio {
  estado: string;
  franjaInicio: string;
}

function formatearFechaTurno(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * "Lo más urgente" del panel: se arma solo con datos que ya existen (sin
 * backend nuevo) — `noLeidas` de /api/notificaciones (ya calculado
 * server-side), el próximo turno reservado de /api/turnos/mis-turnos
 * (filtrado acá, la API no tiene un endpoint dedicado a "el próximo"), y
 * el total de la cola de /api/admin/verificaciones. Cada fetch es
 * independiente y silencioso ante error — esta sección es un "extra", nunca
 * debe romper el resto del panel si uno de los tres falla.
 */
async function cargarUrgencias(rol: string): Promise<TarjetaUrgente[]> {
  const items: TarjetaUrgente[] = [];

  try {
    const respuesta = await fetchConSesion('/api/notificaciones?pagina=1&porPagina=1');
    if (respuesta.ok) {
      const datos = (await respuesta.json()) as { noLeidas: number };
      if (datos.noLeidas > 0) {
        const palabra = datos.noLeidas === 1 ? 'notificación' : 'notificaciones';
        items.push({
          href: null,
          texto: `Tenés ${datos.noLeidas} ${palabra} sin leer — mirá la campana arriba`,
          icono: Bell,
        });
      }
    }
  } catch {
    // Extra informativo — un fallo acá nunca debe bloquear el resto del panel.
  }

  if (rol === 'dueño') {
    try {
      const respuesta = await fetchConSesion('/api/turnos/mis-turnos?pagina=1&porPagina=50');
      if (respuesta.ok) {
        const datos = (await respuesta.json()) as { items: TurnoPropio[] };
        const ahora = Date.now();
        const proximo = datos.items
          .filter((t) => t.estado === 'reservado' && new Date(t.franjaInicio).getTime() > ahora)
          .sort(
            (a, b) => new Date(a.franjaInicio).getTime() - new Date(b.franjaInicio).getTime(),
          )[0];
        if (proximo) {
          items.push({
            href: '/turnos/mis-turnos',
            texto: `Tu próximo turno: ${formatearFechaTurno(proximo.franjaInicio)}`,
            icono: Calendar,
          });
        }
      }
    } catch {
      // ídem.
    }
  }

  if (rol === 'administrador') {
    try {
      const respuesta = await fetchConSesion('/api/admin/verificaciones?pagina=1&porPagina=1');
      if (respuesta.ok) {
        const datos = (await respuesta.json()) as { total: number };
        if (datos.total > 0) {
          const palabra =
            datos.total === 1 ? 'verificación pendiente' : 'verificaciones pendientes';
          items.push({
            href: '/admin/verificaciones',
            texto: `${datos.total} ${palabra}`,
            icono: CheckCircle2,
          });
        }
      }
    } catch {
      // ídem.
    }
  }

  return items;
}

export default function PaginaPanel() {
  const [perfil, setPerfil] = useState<PerfilPropio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [urgentes, setUrgentes] = useState<TarjetaUrgente[]>([]);

  useEffect(() => {
    let cancelado = false;

    async function cargarPerfil() {
      try {
        const respuesta = await fetchConSesion('/api/perfil');
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json()) as RespuestaError;
          if (!cancelado) setError(cuerpo.mensaje);
          return;
        }
        const datos = (await respuesta.json()) as PerfilPropio;
        if (!cancelado) setPerfil(datos);
      } catch {
        if (!cancelado)
          setError(
            'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
          );
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargarPerfil();
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    if (!perfil) return;
    let cancelado = false;
    cargarUrgencias(perfil.rol).then((items) => {
      if (!cancelado) setUrgentes(items);
    });
    return () => {
      cancelado = true;
    };
  }, [perfil]);

  if (cargando) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-sm text-text-muted">Cargando tu panel…</p>
      </main>
    );
  }

  if (error || !perfil) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <EstadoIlustrado
          imagenSrc="/animales/Error-Problema.png"
          alt="Mascota confundida ante un error del sistema"
          titulo="No pudimos cargar tu panel"
          descripcion={error ?? 'Algo salió mal de nuestro lado. Probá recargar la página.'}
        />
      </main>
    );
  }

  const enlaces = ENLACES_POR_ROL[perfil.rol] ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <EncabezadoIlustrado
        imagenSrc="/animales/Inicio-Dashboard.png"
        alt="Mascota dando la bienvenida al panel"
        titulo={`Hola, ${ETIQUETA_ROL[perfil.rol] ?? perfil.rol}`}
        descripcion={perfil.email}
      />

      {perfil.rol === 'veterinario' ? (
        <div className="mt-4">
          <BadgeVerificacion usuarioId={perfil.id} estadoInicial={perfil.estadoVerificacion} />
        </div>
      ) : null}

      {urgentes.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-base font-semibold text-text-primary">
            Lo más urgente
          </h2>
          <div className="flex flex-col gap-2">
            {urgentes.map((item) => {
              const contenido = (
                <Tarjeta className="flex items-center gap-3 border-accent/40 bg-accent/5">
                  <item.icono aria-hidden="true" className="h-5 w-5 shrink-0 text-accent" />
                  <p className="text-sm font-medium text-text-primary">{item.texto}</p>
                </Tarjeta>
              );
              return item.href ? (
                <Link key={item.texto} href={item.href}>
                  {contenido}
                </Link>
              ) : (
                <div key={item.texto}>{contenido}</div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 font-display text-base font-semibold text-text-primary">Accesos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {enlaces.map((enlace) => (
            <Link key={enlace.href} href={enlace.href}>
              <Tarjeta className="flex items-center gap-3 hover:border-accent">
                <enlace.icono aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
                <span className="font-medium text-text-primary">{enlace.etiqueta}</span>
              </Tarjeta>
            </Link>
          ))}
          {enlaces.length === 0 ? (
            <p className="text-sm text-text-muted">
              Todavía no hay accesos rápidos configurados para tu rol.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
