'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { crearClienteSupabaseNavegador } from '@infraestructura/adaptadores/ClienteSupabaseNavegador';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';

const MENSAJE_ENLACE_INVALIDO = 'El enlace para recuperar tu contraseña venció o ya fue usado. Pedí uno nuevo.';

const NuevaPasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña tiene que tener al menos 8 caracteres.'),
});

type EstadoToken = 'validando' | 'valido' | 'invalido';

// Tiempo de gracia para que Supabase procese el token de la URL (evento
// PASSWORD_RECOVERY) antes de asumir que el enlace no es válido.
const ESPERA_VALIDACION_MS = 4000;

export default function PaginaNuevaPassword() {
  const [estadoToken, setEstadoToken] = useState<EstadoToken>('validando');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [tocado, setTocado] = useState<{ password: boolean; confirmacion: boolean }>({
    password: false,
    confirmacion: false,
  });
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const resueltoRef = useRef(false);

  useEffect(() => {
    const supabase = crearClienteSupabaseNavegador();

    const { data: suscripcion } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') {
        resueltoRef.current = true;
        setEstadoToken('valido');
      }
    });

    // Cubre la carrera con detectSessionInUrl: si la sesión de recuperación
    // ya se estableció antes de suscribirnos, no vamos a ver el evento.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !resueltoRef.current) {
        resueltoRef.current = true;
        setEstadoToken('valido');
      }
    });

    const idTimeout = setTimeout(() => {
      if (!resueltoRef.current) setEstadoToken('invalido');
    }, ESPERA_VALIDACION_MS);

    return () => {
      suscripcion.subscription.unsubscribe();
      clearTimeout(idTimeout);
    };
  }, []);

  const validacion = NuevaPasswordSchema.safeParse({ password });
  const errorPassword = tocado.password && !validacion.success ? validacion.error.flatten().fieldErrors.password?.[0] : undefined;
  const noCoinciden = tocado.confirmacion && confirmacion !== password;
  const formularioValido = validacion.success && confirmacion === password;

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTocado({ password: true, confirmacion: true });
    if (!formularioValido) return;

    setEnviando(true);
    const supabase = crearClienteSupabaseNavegador();
    // El token de un solo uso ya fue consumido por Supabase Auth al abrir
    // este link (quedó una sesión de recuperación activa); updateUser()
    // aplica el cambio sobre esa sesión — no hay lógica de expiración
    // propia acá, todo lo resuelve Supabase.
    const { error } = await supabase.auth.updateUser({ password });
    setEnviando(false);

    if (error) {
      setEstadoToken('invalido');
      return;
    }
    setExito(true);
  }

  if (estadoToken === 'validando') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-slate-50">
        <p className="text-sm text-slate-400">Validando tu enlace de recuperación…</p>
      </main>
    );
  }

  if (estadoToken === 'invalido') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12 text-slate-50">
        <h1 className="text-xl font-semibold">Enlace no disponible</h1>
        <p className="flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {MENSAJE_ENLACE_INVALIDO}
        </p>
        <Link href="/auth/recuperar-password" className="text-blue-500 underline underline-offset-2">
          Pedir un enlace nuevo
        </Link>
      </main>
    );
  }

  if (exito) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-12 text-slate-50">
        <h1 className="text-xl font-semibold">Contraseña actualizada</h1>
        <p className="text-slate-400">Ya podés iniciar sesión con tu nueva contraseña.</p>
        <Link href="/auth/login" className="text-blue-500 underline underline-offset-2">
          Ir a iniciar sesión
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Elegí tu nueva contraseña</h1>
      <p className="mb-6 text-sm text-slate-400">Tu enlace es válido — definí una contraseña nueva para tu cuenta.</p>

      <form onSubmit={manejarEnvio} noValidate className="flex flex-col gap-4">
        <CampoTexto
          id="password"
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          onBlur={() => setTocado((prev) => ({ ...prev, password: true }))}
          error={errorPassword}
          required
        />

        <CampoTexto
          id="confirmacion"
          label="Confirmá tu nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={confirmacion}
          onChange={(evento) => setConfirmacion(evento.target.value)}
          onBlur={() => setTocado((prev) => ({ ...prev, confirmacion: true }))}
          error={noCoinciden ? 'Las contraseñas no coinciden.' : undefined}
          required
        />

        <button
          type="submit"
          disabled={enviando}
          className="mt-2 h-11 min-h-[44px] rounded-md bg-blue-500 text-[15px] font-medium text-slate-50 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Guardando…' : 'Guardar nueva contraseña'}
        </button>
      </form>
    </main>
  );
}
