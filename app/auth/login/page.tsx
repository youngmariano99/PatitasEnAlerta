'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { crearClienteSupabaseNavegador } from '@infraestructura/adaptadores/ClienteSupabaseNavegador';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';

const MENSAJE_CREDENCIALES_INVALIDAS =
  'Email o contraseña incorrectos. Revisá los datos e intentá de nuevo.';
const MENSAJE_CONEXION =
  'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.';

function RUTA_SEGURA_O_PANEL(redirectTo: string | null): string {
  // Nunca redirigir fuera del propio sitio (anti open-redirect): solo se
  // acepta una ruta relativa que empiece con "/".
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    return redirectTo;
  }
  return '/panel';
}

function ContenidoPaginaLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const supabase = crearClienteSupabaseNavegador();
      const { error: errorSupabase } = await supabase.auth.signInWithPassword({ email, password });

      if (errorSupabase) {
        setError(MENSAJE_CREDENCIALES_INVALIDAS);
        setEnviando(false);
        return;
      }

      router.push(RUTA_SEGURA_O_PANEL(searchParams.get('redirectTo')));
    } catch {
      setError(MENSAJE_CONEXION);
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <EncabezadoIlustrado
        imagenSrc="/animales/Login-Bienvenida.png"
        alt="Mascotas de Patitas en Alerta dando la bienvenida"
        titulo="Iniciá sesión"
        descripcion="Ingresá con el email y la contraseña de tu cuenta."
      />
      <div className="mb-6" />

      <form onSubmit={manejarEnvio} noValidate className="flex flex-col gap-4">
        <CampoTexto
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="juan.perez@ejemplo.com"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          required
        />

        <CampoTexto
          id="password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(evento) => setPassword(evento.target.value)}
          required
        />

        {error ? (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <span aria-hidden="true">⚠️</span>
            {error}
          </p>
        ) : null}

        <Boton type="submit" disabled={enviando || !email || !password} className="mt-2 w-full">
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </Boton>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <Link href="/auth/recuperar-password" className="text-accent underline underline-offset-2">
          Olvidé mi contraseña
        </Link>
        <p className="text-text-muted">
          ¿No tenés cuenta?{' '}
          <Link href="/auth/registro" className="text-accent underline underline-offset-2">
            Creá una acá
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function PaginaLogin() {
  return (
    <Suspense fallback={null}>
      <ContenidoPaginaLogin />
    </Suspense>
  );
}
