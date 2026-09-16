'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import {
  BadgeVerificacion,
  type EstadoVerificacion,
} from '@presentacion/componentes/auth/BadgeVerificacion';

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

interface EnlaceRapido {
  href: string;
  etiqueta: string;
}

const ENLACES_POR_ROL: Record<string, EnlaceRapido[]> = {
  dueño: [
    { href: '/mascotas', etiqueta: 'Mis mascotas' },
    { href: '/reportes/nuevo', etiqueta: 'Reportar una mascota' },
    { href: '/turnos/mis-turnos', etiqueta: 'Mis turnos' },
    { href: '/adopciones', etiqueta: 'Vitrina de adopción' },
  ],
  veterinario: [
    { href: '/turnos/mis-turnos', etiqueta: 'Mis turnos' },
    { href: '/reportes', etiqueta: 'Reportes de la comunidad' },
  ],
  municipio: [
    { href: '/municipio/dashboard', etiqueta: 'Panel de reportes' },
    { href: '/municipio/eventos', etiqueta: 'Calendario de operativos' },
    { href: '/municipio/adopciones', etiqueta: 'Vitrina de adopción' },
  ],
  administrador: [
    { href: '/admin/verificaciones', etiqueta: 'Cola de verificaciones' },
    { href: '/admin/auditoria', etiqueta: 'Historial de auditoría' },
  ],
};

const ETIQUETA_ROL: Record<string, string> = {
  dueño: 'Dueño de mascota',
  veterinario: 'Veterinario/a',
  municipio: 'Cuenta municipal',
  administrador: 'Administrador de plataforma',
};

export default function PaginaPanel() {
  const [perfil, setPerfil] = useState<PerfilPropio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {enlaces.map((enlace) => (
          <Tarjeta key={enlace.href}>
            <Link
              href={enlace.href}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {enlace.etiqueta}
            </Link>
          </Tarjeta>
        ))}
        {enlaces.length === 0 ? (
          <p className="text-sm text-text-muted">
            Todavía no hay accesos rápidos configurados para tu rol.
          </p>
        ) : null}
      </div>
    </main>
  );
}
