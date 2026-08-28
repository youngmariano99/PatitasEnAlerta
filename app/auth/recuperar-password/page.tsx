'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { RecuperarPasswordSchema } from '@aplicacion/dtos/auth/RecuperarPasswordDto';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';

const MENSAJE_EXITO =
  'Si existe una cuenta con ese email, te enviamos instrucciones para recuperar tu contraseña. Revisá tu bandeja de entrada (y la carpeta de spam).';

type EstadoEnvio = 'inactivo' | 'enviando' | 'enviado';

export default function PaginaRecuperarPassword() {
  const [email, setEmail] = useState('');
  const [tocado, setTocado] = useState(false);
  const [estado, setEstado] = useState<EstadoEnvio>('inactivo');
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const validacion = RecuperarPasswordSchema.safeParse({ email });
  const errorEmail = tocado && !validacion.success ? validacion.error.flatten().fieldErrors.email?.[0] : undefined;

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTocado(true);
    if (!validacion.success) return;

    setEstado('enviando');
    setErrorGeneral(null);

    try {
      const respuesta = await fetch('/api/auth/recuperar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validacion.data),
      });

      if (respuesta.status === 400) {
        const cuerpo = (await respuesta.json()) as { mensaje: string };
        setErrorGeneral(cuerpo.mensaje);
        setEstado('inactivo');
        return;
      }

      // Cualquier otra respuesta (siempre 200 con el mismo mensaje, por
      // diseño anti-enumeración) muestra la misma pantalla de éxito.
      setEstado('enviado');
    } catch {
      setErrorGeneral('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      setEstado('inactivo');
    }
  }

  if (estado === 'enviado') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12 text-slate-50">
        <h1 className="text-xl font-semibold">Revisá tu email</h1>
        <p className="text-slate-400">{MENSAJE_EXITO}</p>
        <Link href="/auth/login" className="text-blue-500 underline underline-offset-2">
          Volver a iniciar sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Recuperar contraseña</h1>
      <p className="mb-6 text-sm text-slate-400">
        Ingresá el email con el que te registraste y te enviamos instrucciones para elegir una nueva contraseña.
      </p>

      <form onSubmit={manejarEnvio} noValidate className="flex flex-col gap-4">
        <CampoTexto
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="juan.perez@ejemplo.com"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          onBlur={() => setTocado(true)}
          error={errorEmail}
          required
        />

        {errorGeneral ? (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <span aria-hidden="true">⚠️</span>
            {errorGeneral}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={estado === 'enviando'}
          className="mt-2 h-11 min-h-[44px] rounded-md bg-blue-500 text-[15px] font-medium text-slate-50 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {estado === 'enviando' ? 'Enviando…' : 'Enviar instrucciones'}
        </button>
      </form>
    </main>
  );
}
