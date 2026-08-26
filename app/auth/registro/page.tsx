'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { RegistrarDuenoSchema } from '@aplicacion/dtos/auth/RegistrarDuenoDto';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

type EstadoEnvio = 'inactivo' | 'enviando' | 'exito';

export default function PaginaRegistroDueno() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tocado, setTocado] = useState<{ email: boolean; password: boolean }>({
    email: false,
    password: false,
  });
  const [estado, setEstado] = useState<EstadoEnvio>('inactivo');
  const [errorEmailDuplicado, setErrorEmailDuplicado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const validacion = RegistrarDuenoSchema.safeParse({ email, password });
  const errores = validacion.success ? undefined : validacion.error.flatten().fieldErrors;
  const errorEmail = tocado.email ? errores?.email?.[0] : undefined;
  const errorPassword = tocado.password ? errores?.password?.[0] : undefined;
  const formularioValido = validacion.success;

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTocado({ email: true, password: true });
    if (!formularioValido) return;

    setEstado('enviando');
    setErrorEmailDuplicado(false);
    setErrorGeneral(null);

    try {
      const respuesta = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validacion.data),
      });

      if (respuesta.status === 201) {
        setEstado('exito');
        return;
      }

      const cuerpo = (await respuesta.json()) as RespuestaError;
      if (cuerpo.codigo === 'PEA-AUTH-001') {
        setErrorEmailDuplicado(true);
      } else {
        setErrorGeneral(cuerpo.mensaje);
      }
      setEstado('inactivo');
    } catch {
      setErrorGeneral('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      setEstado('inactivo');
    }
  }

  if (estado === 'exito') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12 text-slate-50">
        <h1 className="text-xl font-semibold">¡Cuenta creada!</h1>
        <p className="text-slate-400">
          Te enviamos un email para confirmar tu cuenta. Una vez confirmada, ya podés iniciar sesión.
        </p>
        <Link href="/auth/login" className="text-blue-500 underline underline-offset-2">
          Ir a iniciar sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Creá tu cuenta</h1>
      <p className="mb-6 text-sm text-slate-400">
        Registrate como dueño de mascota para reportar y llevar la libreta sanitaria en un solo lugar.
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
          onBlur={() => setTocado((prev) => ({ ...prev, email: true }))}
          error={errorEmail}
          required
        />

        <CampoTexto
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          ayuda="Usá al menos 8 caracteres. Nunca la compartimos ni la mostramos a nadie."
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          onBlur={() => setTocado((prev) => ({ ...prev, password: true }))}
          error={errorPassword}
          required
        />

        {errorEmailDuplicado ? (
          <div className="flex flex-col gap-2 rounded-md border border-red-500 bg-slate-800 p-3 text-sm">
            <p className="flex items-center gap-1.5 text-red-500">
              <span aria-hidden="true">⚠️</span>
              Ya existe una cuenta con ese email. ¿Querés iniciar sesión o recuperar tu contraseña?
            </p>
            <div className="flex gap-4">
              <Link href="/auth/login" className="text-blue-500 underline underline-offset-2">
                Iniciar sesión
              </Link>
              <Link href="/auth/recuperar-password" className="text-blue-500 underline underline-offset-2">
                Recuperar contraseña
              </Link>
            </div>
          </div>
        ) : null}

        {errorGeneral ? (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <span aria-hidden="true">⚠️</span>
            {errorGeneral}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!formularioValido || estado === 'enviando'}
          className="mt-2 h-11 min-h-[44px] rounded-md bg-blue-500 text-[15px] font-medium text-slate-50 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {estado === 'enviando' ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </main>
  );
}
