/**
 * @jest-environment node
 */
import { DetectarCoincidenciaReporteJob } from '@infraestructura/jobs/DetectarCoincidenciaReporteJob';
import type { EvaluarCoincidenciaReporte } from '@aplicacion/casos-de-uso/reportes/EvaluarCoincidenciaReporte';
import type { ReporteCreado } from '@aplicacion/dtos/reportes/CrearReporteDto';

const reporteEncontrado: ReporteCreado = {
  id: 'reporte-encontrado-1',
  tipo: 'encontrado',
  subtipo: null,
  reportadoPor: 'vecino-1',
  mascotaId: null,
  descripcion: 'Encontré un perro cerca de la plaza.',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/encontrado.jpg',
  latitud: -37.9989,
  longitud: -61.3565,
  especie: 'perro',
  estado: 'reportado',
  createdAt: '2026-08-01T12:00:00.000Z',
};

function crearFakeEvaluador(): jest.Mocked<Pick<EvaluarCoincidenciaReporte, 'ejecutar'>> {
  return { ejecutar: jest.fn() };
}

describe('DetectarCoincidenciaReporteJob', () => {
  it('programar() invoca EvaluarCoincidenciaReporte.ejecutar() con el reporte', () => {
    const evaluador = crearFakeEvaluador();
    evaluador.ejecutar.mockResolvedValue(undefined);
    const job = new DetectarCoincidenciaReporteJob(evaluador as unknown as EvaluarCoincidenciaReporte);

    job.programar(reporteEncontrado);

    expect(evaluador.ejecutar).toHaveBeenCalledWith(reporteEncontrado);
  });

  it('programar() no devuelve una Promise — es fire-and-forget real, nunca hay que esperarlo', () => {
    const evaluador = crearFakeEvaluador();
    evaluador.ejecutar.mockResolvedValue(undefined);
    const job = new DetectarCoincidenciaReporteJob(evaluador as unknown as EvaluarCoincidenciaReporte);

    const resultado = job.programar(reporteEncontrado);

    expect(resultado).toBeUndefined();
  });

  it('un rechazo de EvaluarCoincidenciaReporte nunca se propaga como una excepción no controlada', async () => {
    const evaluador = crearFakeEvaluador();
    evaluador.ejecutar.mockRejectedValue(new Error('la tabla reportes no responde'));
    const job = new DetectarCoincidenciaReporteJob(evaluador as unknown as EvaluarCoincidenciaReporte);

    expect(() => job.programar(reporteEncontrado)).not.toThrow();
    // Deja que el `.catch()` interno del job procese el rechazo antes de
    // terminar el test — si no estuviera manejado, Jest lo reportaría como
    // una unhandled rejection.
    await new Promise((resolve) => setImmediate(resolve));
  });
});
