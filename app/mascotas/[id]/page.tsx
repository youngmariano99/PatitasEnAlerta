'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';

interface MascotaApi {
  id: string;
  nombre: string;
  especie: string;
  fotoUrl: string;
  raza: string | null;
  edadAproximada: number | null;
  identificacionChip: string | null;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

export default function PaginaDetalleMascota() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [mascota, setMascota] = useState<MascotaApi | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);

  const [nombre, setNombre] = useState('');
  const [raza, setRaza] = useState('');
  const [edadAproximada, setEdadAproximada] = useState('');
  const [identificacionChip, setIdentificacionChip] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarMascota() {
      try {
        const respuesta = await fetchConSesion(`/api/mascotas/${params.id}`);
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json()) as RespuestaError;
          if (!cancelado) setError(cuerpo.mensaje);
          return;
        }
        const datos = (await respuesta.json()) as MascotaApi;
        if (cancelado) return;
        setMascota(datos);
        setNombre(datos.nombre);
        setRaza(datos.raza ?? '');
        setEdadAproximada(datos.edadAproximada != null ? String(datos.edadAproximada) : '');
        setIdentificacionChip(datos.identificacionChip ?? '');
      } catch {
        if (!cancelado)
          setError(
            'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
          );
      }
    }

    cargarMascota();
    return () => {
      cancelado = true;
    };
  }, [params.id]);

  async function guardarCambios(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setErrorGuardado(null);

    try {
      const respuesta = await fetchConSesion(`/api/mascotas/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          raza: raza || undefined,
          edadAproximada: edadAproximada ? Number(edadAproximada) : undefined,
          identificacionChip: identificacionChip || undefined,
        }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorGuardado(cuerpo.mensaje);
        setGuardando(false);
        return;
      }

      const actualizada = (await respuesta.json()) as MascotaApi;
      setMascota(actualizada);
      setEditando(false);
      setGuardando(false);
    } catch {
      setErrorGuardado(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setGuardando(false);
    }
  }

  async function confirmarBaja() {
    const respuesta = await fetchConSesion(`/api/mascotas/${params.id}`, { method: 'DELETE' });
    if (respuesta.ok) {
      router.push('/mascotas');
    }
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <EstadoIlustrado
          imagenSrc="/animales/Error-Problema.png"
          alt="Mascota confundida ante un error"
          titulo="No pudimos mostrar esta mascota"
          descripcion={error}
          accion={
            <Link href="/mascotas" className="text-accent underline underline-offset-2">
              Volver a mis mascotas
            </Link>
          }
        />
      </main>
    );
  }

  if (!mascota) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <p className="text-sm text-text-muted">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="mb-6 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mascota.fotoUrl}
          alt={`Foto de ${mascota.nombre}`}
          className="h-20 w-20 shrink-0 rounded-md object-cover"
        />
        <div>
          <h1 className="font-display text-xl font-semibold text-text-primary">{mascota.nombre}</h1>
          <p className="text-sm text-text-muted">{mascota.especie}</p>
        </div>
      </div>

      {!editando ? (
        <>
          <Tarjeta className="mb-4 flex flex-col gap-1.5 text-sm">
            <p>
              <span className="text-text-muted">Raza:</span> {mascota.raza ?? 'No especificada'}
            </p>
            <p>
              <span className="text-text-muted">Edad aproximada:</span>{' '}
              {mascota.edadAproximada != null
                ? `${mascota.edadAproximada} años`
                : 'No especificada'}
            </p>
            <p>
              <span className="text-text-muted">Chip:</span>{' '}
              {mascota.identificacionChip ?? 'Sin chip registrado'}
            </p>
          </Tarjeta>

          <div className="flex flex-col gap-2">
            <Link href={`/mascotas/${mascota.id}/libreta`}>
              <Boton className="w-full">Ver libreta sanitaria</Boton>
            </Link>
            <Boton variante="secundaria" className="w-full" onClick={() => setEditando(true)}>
              Editar datos
            </Boton>
            {!confirmandoBaja ? (
              <Boton variante="texto" className="w-full" onClick={() => setConfirmandoBaja(true)}>
                Dar de baja
              </Boton>
            ) : (
              <Tarjeta className="flex flex-col gap-3 text-sm">
                <p className="flex items-center gap-1.5 text-danger">
                  <span aria-hidden="true">⚠️</span>
                  ¿Seguro que querés dar de baja a {mascota.nombre}? No vas a poder revertirlo desde
                  acá.
                </p>
                <div className="flex gap-2">
                  <Boton variante="alerta" onClick={confirmarBaja}>
                    Sí, dar de baja
                  </Boton>
                  <Boton variante="secundaria" onClick={() => setConfirmandoBaja(false)}>
                    Cancelar
                  </Boton>
                </div>
              </Tarjeta>
            )}
          </div>
        </>
      ) : (
        <form onSubmit={guardarCambios} noValidate className="flex flex-col gap-4">
          <CampoTexto
            id="nombre"
            label="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <CampoTexto
            id="raza"
            label="Raza (opcional)"
            value={raza}
            onChange={(e) => setRaza(e.target.value)}
          />
          <CampoTexto
            id="edadAproximada"
            label="Edad aproximada en años (opcional)"
            type="number"
            min={0}
            value={edadAproximada}
            onChange={(e) => setEdadAproximada(e.target.value)}
          />
          <CampoTexto
            id="identificacionChip"
            label="Número de chip (opcional)"
            value={identificacionChip}
            onChange={(e) => setIdentificacionChip(e.target.value)}
          />

          {errorGuardado ? (
            <p className="flex items-center gap-1.5 text-sm text-danger">
              <span aria-hidden="true">⚠️</span>
              {errorGuardado}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Boton type="submit" disabled={guardando || !nombre.trim()}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Boton>
            <Boton type="button" variante="secundaria" onClick={() => setEditando(false)}>
              Cancelar
            </Boton>
          </div>
        </form>
      )}
    </main>
  );
}
