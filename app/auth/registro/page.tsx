'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  PerfilFormularioFactory,
  type RolFormularioPerfil,
} from '@aplicacion/fabricas/PerfilFormularioFactory';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

type EstadoEnvio = 'inactivo' | 'enviando' | 'exito';
type RolAutoservicio = Extract<RolFormularioPerfil, 'dueño' | 'veterinario'>;

const ETIQUETAS_ROL: Record<RolAutoservicio, string> = {
  dueño: 'Dueño de mascota',
  veterinario: 'Veterinario/a',
};

const MENSAJE_MATRICULA_DUPLICADA =
  'Ya existe una matrícula registrada con esos datos para este colegio. Verificá el número ingresado.';

export default function PaginaRegistro() {
  const [rol, setRol] = useState<RolAutoservicio>('dueño');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [matricula, setMatricula] = useState('');
  const [colegioEmisor, setColegioEmisor] = useState('');
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [estado, setEstado] = useState<EstadoEnvio>('inactivo');
  const [errorEmailDuplicado, setErrorEmailDuplicado] = useState(false);
  const [errorMatriculaDuplicada, setErrorMatriculaDuplicada] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  // PerfilFormularioFactory (Abstract Factory, AUTH-02): cada rol expone su
  // propio esquema Zod — acá NO hay un único formulario con condicionales de
  // validación, el rol elegido decide qué "producto" (esquema) se usa.
  const datosFormulario =
    rol === 'veterinario' ? { email, password, matricula, colegioEmisor } : { email, password };
  const validacion = PerfilFormularioFactory.crear(rol).safeParse(datosFormulario);
  const errores = validacion.success ? undefined : validacion.error.flatten().fieldErrors;
  const errorDe = (campo: string) => (tocado[campo] ? errores?.[campo]?.[0] : undefined);
  const formularioValido = validacion.success;

  function marcarTocado(campo: string) {
    setTocado((prev) => ({ ...prev, [campo]: true }));
  }

  function cambiarRol(nuevoRol: RolAutoservicio) {
    setRol(nuevoRol);
    setErrorEmailDuplicado(false);
    setErrorMatriculaDuplicada(false);
    setErrorGeneral(null);
  }

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setTocado(
      rol === 'veterinario'
        ? { email: true, password: true, matricula: true, colegioEmisor: true }
        : { email: true, password: true },
    );
    if (!formularioValido) return;

    setEstado('enviando');
    setErrorEmailDuplicado(false);
    setErrorMatriculaDuplicada(false);
    setErrorGeneral(null);

    try {
      const respuesta = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validacion.data, rol }),
      });

      if (respuesta.status === 201) {
        setEstado('exito');
        return;
      }

      const cuerpo = (await respuesta.json()) as RespuestaError;
      if (cuerpo.codigo === 'PEA-AUTH-001') {
        setErrorEmailDuplicado(true);
      } else if (cuerpo.codigo === 'PEA-AUTH-006') {
        setErrorMatriculaDuplicada(true);
      } else {
        setErrorGeneral(cuerpo.mensaje);
      }
      setEstado('inactivo');
    } catch {
      setErrorGeneral(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setEstado('inactivo');
    }
  }

  if (estado === 'exito') {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <EstadoIlustrado
          imagenSrc="/animales/Éxito-Confirmación.png"
          alt="Mascotas de Patitas en Alerta festejando"
          titulo="¡Cuenta creada!"
          descripcion={
            rol === 'veterinario'
              ? 'Te enviamos un email para confirmar tu cuenta. Tu matrícula queda en revisión — te avisamos cuando quede verificada.'
              : 'Te enviamos un email para confirmar tu cuenta. Una vez confirmada, ya podés iniciar sesión.'
          }
          accion={
            <Link href="/auth/login" className="text-accent underline underline-offset-2">
              Ir a iniciar sesión
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12 text-text-primary">
      <EncabezadoIlustrado
        imagenSrc="/animales/Registro.png"
        alt="Mascota de Patitas en Alerta dando la bienvenida"
        titulo="Creá tu cuenta"
        descripcion="Elegí tu perfil para mostrarte los datos que necesitamos."
      />
      <div className="mb-6" />

      <div role="radiogroup" aria-label="Tipo de cuenta" className="mb-6 grid grid-cols-2 gap-2">
        {(Object.keys(ETIQUETAS_ROL) as RolAutoservicio[]).map((opcion) => (
          <button
            key={opcion}
            type="button"
            role="radio"
            aria-checked={rol === opcion}
            onClick={() => cambiarRol(opcion)}
            className={`h-11 min-h-[44px] rounded-md border text-[15px] font-medium transition-colors ${
              rol === opcion
                ? 'border-accent bg-accent text-base'
                : 'border-surface2 bg-surface1 text-text-primary hover:border-text-muted'
            }`}
          >
            {ETIQUETAS_ROL[opcion]}
          </button>
        ))}
      </div>

      <form onSubmit={manejarEnvio} noValidate className="flex flex-col gap-4">
        <CampoTexto
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="juan.perez@ejemplo.com"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          onBlur={() => marcarTocado('email')}
          error={errorDe('email')}
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
          onBlur={() => marcarTocado('password')}
          error={errorDe('password')}
          required
        />

        {rol === 'veterinario' ? (
          <>
            <CampoTexto
              id="matricula"
              label="Matrícula profesional"
              placeholder="MP-1234"
              ayuda="Tu cuenta queda en revisión hasta que verifiquemos la matrícula."
              value={matricula}
              onChange={(evento) => setMatricula(evento.target.value)}
              onBlur={() => marcarTocado('matricula')}
              error={
                errorDe('matricula') ??
                (errorMatriculaDuplicada ? MENSAJE_MATRICULA_DUPLICADA : undefined)
              }
              required
            />

            <CampoTexto
              id="colegioEmisor"
              label="Colegio que emitió tu matrícula"
              placeholder="Colegio de Veterinarios de la Provincia de Buenos Aires"
              value={colegioEmisor}
              onChange={(evento) => setColegioEmisor(evento.target.value)}
              onBlur={() => marcarTocado('colegioEmisor')}
              error={
                errorDe('colegioEmisor') ??
                (errorMatriculaDuplicada ? MENSAJE_MATRICULA_DUPLICADA : undefined)
              }
              required
            />
          </>
        ) : null}

        {errorEmailDuplicado ? (
          <div className="flex flex-col gap-2 rounded-md border border-danger bg-surface1 p-3 text-sm">
            <p className="flex items-center gap-1.5 text-danger">
              <span aria-hidden="true">⚠️</span>
              Ya existe una cuenta con ese email. ¿Querés iniciar sesión o recuperar tu contraseña?
            </p>
            <div className="flex gap-4">
              <Link href="/auth/login" className="text-accent underline underline-offset-2">
                Iniciar sesión
              </Link>
              <Link
                href="/auth/recuperar-password"
                className="text-accent underline underline-offset-2"
              >
                Recuperar contraseña
              </Link>
            </div>
          </div>
        ) : null}

        {errorGeneral ? (
          <p className="flex items-center gap-1.5 text-sm text-danger">
            <span aria-hidden="true">⚠️</span>
            {errorGeneral}
          </p>
        ) : null}

        <Boton
          type="submit"
          disabled={!formularioValido || estado === 'enviando'}
          className="mt-2 w-full"
        >
          {estado === 'enviando' ? 'Creando cuenta…' : 'Crear cuenta'}
        </Boton>
      </form>
    </main>
  );
}
