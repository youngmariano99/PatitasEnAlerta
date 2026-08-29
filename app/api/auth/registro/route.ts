import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, z } from 'zod';
import { container } from '@aplicacion/contenedor-di';
import { RegistrarUsuario } from '@aplicacion/casos-de-uso/auth/RegistrarUsuario';
import { RegistrarVeterinario } from '@aplicacion/casos-de-uso/auth/RegistrarVeterinario';
import type { RegistrarDuenoDto } from '@aplicacion/dtos/auth/RegistrarDuenoDto';
import type { RegistrarVeterinarioDto } from '@aplicacion/dtos/auth/RegistrarVeterinarioDto';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { logger } from '@infraestructura/logging/logger';

const RolSchema = z.enum(['dueño', 'veterinario']).catch('dueño');

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    const error = new PayloadInvalidoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  // /auth/registro es un único endpoint para dueño y veterinario (SITEMAP.md);
  // PerfilFormularioFactory decide qué campos pide el cliente, y este `rol`
  // decide qué caso de uso resuelve el server — nunca un tercer esquema
  // ad hoc acá, cada uno vuelve a validar con su propio schema Zod.
  const rol = RolSchema.parse((payload as { rol?: unknown } | null)?.rol);

  try {
    if (rol === 'veterinario') {
      const casoDeUso = container.resolve(RegistrarVeterinario);
      const resultado = await casoDeUso.ejecutar(payload as RegistrarVeterinarioDto);
      return NextResponse.json(resultado, { status: 201 });
    }

    const casoDeUso = container.resolve(RegistrarUsuario);
    // El cast es solo documental: RegistrarUsuario.validar() vuelve a
    // ejecutar RegistrarDuenoSchema.parse() sobre el payload crudo (fail-fast
    // real), así que un payload malformado nunca llega a autorizar/persistir.
    const resultado = await casoDeUso.ejecutar(payload as RegistrarDuenoDto);
    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      const primerError = error.errors[0]?.message;
      const errorNegocio = new PayloadInvalidoError(primerError);
      return respuestaDeError(errorNegocio.codigo, errorNegocio.message, errorNegocio.statusHttp);
    }
    if (error instanceof ErrorDominio) {
      return respuestaDeError(error.codigo, error.message, error.statusHttp);
    }

    logger.error({ err: error }, 'Error no controlado en POST /api/auth/registro');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
