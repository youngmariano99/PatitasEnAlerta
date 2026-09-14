import { NextResponse, type NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import { RecordatorioTurnoJob } from '@infraestructura/jobs/RecordatorioTurnoJob';
import { NoAutenticadoError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

function respuestaDeError(codigo: string, mensaje: string, statusHttp: number) {
  return NextResponse.json({ codigo, mensaje }, { status: statusHttp });
}

/**
 * Disparador externo de RecordatorioTurnoJob (Módulo 6, Paso 1) — ver
 * docs/SETUP.md Sección 7.2. `/api/webhooks/*` está EXCLUIDO del `matcher`
 * de `middleware.ts` (sin cookies de sesión de usuario: quien lo llama es
 * un scheduler externo, no una persona autenticada), así que este endpoint
 * es responsable de su propia autenticación: un secreto compartido en el
 * header `x-cron-secret`, comparado contra `CRON_JOBS_SECRET` (nunca
 * hardcodeado — ver `.env.example`). Se reutiliza el código transversal
 * `PEA-SIS-001` para el rechazo: no hay un código de catálogo específico
 * para "secreto de servicio inválido", y semánticamente es el mismo caso
 * ("no autenticado") aplicado a una llamada máquina-a-máquina en vez de a
 * una sesión de usuario.
 */
export async function POST(request: NextRequest) {
  const secretoConfigurado = process.env.CRON_JOBS_SECRET;
  const secretoRecibido = request.headers.get('x-cron-secret');

  if (!secretoConfigurado || secretoRecibido !== secretoConfigurado) {
    const error = new NoAutenticadoError();
    return respuestaDeError(error.codigo, error.message, error.statusHttp);
  }

  try {
    const job = container.resolve(RecordatorioTurnoJob);
    const resultado = await job.ejecutar();
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, 'Error no controlado en POST /api/webhooks/recordatorios-turnos');
    return respuestaDeError(
      'PEA-SIS-003',
      'Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos.',
      500,
    );
  }
}
