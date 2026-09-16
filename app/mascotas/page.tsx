'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';

interface MascotaApi {
  id: string;
  nombre: string;
  especie: string;
  fotoUrl: string;
  raza: string | null;
  edadAproximada: number | null;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

export default function PaginaMascotas() {
  const [mascotas, setMascotas] = useState<MascotaApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarMascotas() {
      try {
        const respuesta = await fetchConSesion('/api/mascotas');
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json()) as RespuestaError;
          if (!cancelado) setError(cuerpo.mensaje);
          return;
        }
        const datos = (await respuesta.json()) as MascotaApi[];
        if (!cancelado) setMascotas(datos);
      } catch {
        if (!cancelado)
          setError(
            'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
          );
      }
    }

    cargarMascotas();
    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <EncabezadoIlustrado
          imagenSrc="/animales/Registro.png"
          alt="Mascota de Patitas en Alerta"
          titulo="Mis mascotas"
        />
        <Link href="/mascotas/nueva">
          <Boton className="whitespace-nowrap">Registrar mascota</Boton>
        </Link>
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {mascotas === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}

      {mascotas && mascotas.length === 0 ? (
        <EstadoIlustrado
          imagenSrc="/animales/Registro.png"
          alt="Mascota esperando a que registres a la tuya"
          titulo="Todavía no registraste ninguna mascota"
          descripcion="Registrá a tu mascota para poder reportarla si se pierde y llevar su libreta sanitaria."
          accion={
            <Link href="/mascotas/nueva">
              <Boton>Registrar mi primera mascota</Boton>
            </Link>
          }
        />
      ) : null}

      {mascotas && mascotas.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {mascotas.map((mascota) => (
            <li key={mascota.id}>
              <Link href={`/mascotas/${mascota.id}`}>
                <Tarjeta className="flex items-center gap-3 transition-colors hover:border-accent">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mascota.fotoUrl}
                    alt={`Foto de ${mascota.nombre}`}
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                  <div>
                    <p className="font-medium text-text-primary">{mascota.nombre}</p>
                    <p className="text-sm text-text-muted">
                      {mascota.especie}
                      {mascota.raza ? ` · ${mascota.raza}` : ''}
                      {mascota.edadAproximada != null ? ` · ${mascota.edadAproximada} años` : ''}
                    </p>
                  </div>
                </Tarjeta>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
