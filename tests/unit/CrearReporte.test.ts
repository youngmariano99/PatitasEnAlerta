/**
 * @jest-environment node
 */
import { CrearReporte } from '@aplicacion/casos-de-uso/reportes/CrearReporte';
import type { DetectarCoincidenciaReporteJob } from '@infraestructura/jobs/DetectarCoincidenciaReporteJob';
import type { DatosNuevoReporte, IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import type { DatosReporte } from '@dominio/entidades/Reporte';
import { Reporte } from '@dominio/entidades/Reporte';
import { CategoriaReporteObligatoriaError, FotoReporteObligatoriaError } from '@dominio/errores/erroresReportes';

const FECHA_FIJA = new Date('2026-08-01T12:00:00.000Z');

function crearFakes(opciones?: { permitirTasa?: boolean; fotoValida?: boolean }) {
  const repositorioReportes: jest.Mocked<IRepositorioReportes> = {
    crear: jest.fn().mockImplementation(async (datos: DatosNuevoReporte) => {
      const entidad: DatosReporte = { ...datos, estado: 'reportado' };
      return Reporte.reconstruir('reporte-1', entidad, FECHA_FIJA);
    }),
    buscarPerdidosActivosPorZonaYEspecie: jest.fn().mockResolvedValue([]),
    listar: jest.fn(),
    obtenerEstadoActual: jest.fn(),
    actualizarEstado: jest.fn(),
    obtenerPropietario: jest.fn(),
    listarHistorialEstado: jest.fn(),
  };
  const almacenamientoImagenes: jest.Mocked<IAlmacenamientoImagenes> = {
    esUrlDeImagenValida: jest.fn().mockReturnValue(opciones?.fotoValida ?? true),
    fueSubidaPor: jest.fn().mockResolvedValue(true),
  };
  const controlDeTasa: jest.Mocked<IControlDeTasa> = {
    permitir: jest.fn().mockResolvedValue(opciones?.permitirTasa ?? true),
  };
  // `programar` es síncrono y no devuelve nada (fire-and-forget real) — ver
  // DetectarCoincidenciaReporteJob.ts. El fake refleja exactamente eso.
  const detectarCoincidenciaJob = {
    programar: jest.fn(),
  } as jest.Mocked<Pick<DetectarCoincidenciaReporteJob, 'programar'>> as jest.Mocked<DetectarCoincidenciaReporteJob>;
  return { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob };
}

const datosCrudosValidos = {
  tipo: 'perdido',
  descripcion: 'Se perdió cerca de la plaza.',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg',
  latitud: -37.9989,
  longitud: -61.3565,
};

describe('CrearReporte', () => {
  it('crea el reporte con estado inicial "reportado" y mascotaId/especie=null cuando no se declaran', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);

    const resultado = await caso.ejecutar({ datosCrudos: datosCrudosValidos, reportadoPor: 'usuario-1' });

    expect(resultado.estado).toBe('reportado');
    expect(resultado.mascotaId).toBeNull();
    expect(resultado.especie).toBeNull();
    expect(resultado.reportadoPor).toBe('usuario-1');
    expect(repositorioReportes.crear).toHaveBeenCalledWith({
      tipo: 'perdido',
      subtipo: null,
      reportadoPor: 'usuario-1',
      mascotaId: null,
      descripcion: datosCrudosValidos.descripcion,
      fotoUrl: datosCrudosValidos.fotoUrl,
      latitud: datosCrudosValidos.latitud,
      longitud: datosCrudosValidos.longitud,
      especie: null,
    });
  });

  it('persiste mascotaId y especie cuando se declaran', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);
    const mascotaId = '11111111-1111-1111-1111-111111111111';

    await caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, mascotaId, especie: 'perro' }, reportadoPor: 'usuario-1' });

    expect(repositorioReportes.crear).toHaveBeenCalledWith(expect.objectContaining({ mascotaId, especie: 'perro' }));
  });

  it('rechaza fail-fast (pipeline) sin categoría antes de tocar el repositorio', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tipo: _tipo, ...sinTipo } = datosCrudosValidos;

    await expect(caso.ejecutar({ datosCrudos: sinTipo, reportadoPor: 'usuario-1' })).rejects.toBeInstanceOf(
      CategoriaReporteObligatoriaError,
    );
    expect(repositorioReportes.crear).not.toHaveBeenCalled();
  });

  it('rechaza una fotoUrl que no pertenece a nuestra cuenta de Cloudinary, sin persistir nada', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes({
      fotoValida: false,
    });
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);

    await expect(caso.ejecutar({ datosCrudos: datosCrudosValidos, reportadoPor: 'usuario-1' })).rejects.toBeInstanceOf(
      FotoReporteObligatoriaError,
    );
    expect(repositorioReportes.crear).not.toHaveBeenCalled();
  });

  it('reutiliza el mismo caso de uso para tipo=\'encontrado\' sin exigir mascotaId', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);

    const resultado = await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'encontrado', especie: 'perro' },
      reportadoPor: 'vecino-sin-mascotas',
    });

    expect(resultado.tipo).toBe('encontrado');
    expect(resultado.mascotaId).toBeNull();
  });

  it('programa DetectarCoincidenciaReporteJob tras persistir un reporte "encontrado", sin esperarlo', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);

    const resultado = await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'encontrado', especie: 'perro' },
      reportadoPor: 'usuario-1',
    });

    expect(detectarCoincidenciaJob.programar).toHaveBeenCalledWith(resultado);
    // `programar` no devuelve una Promise — si CrearReporte lo esperara,
    // TypeScript ya lo hubiera rechazado en tiempo de compilación (el fake
    // tipa `programar(): void`), pero se deja explícito acá también.
    expect(detectarCoincidenciaJob.programar).toHaveReturnedWith(undefined);
  });

  it('NO programa DetectarCoincidenciaReporteJob para un reporte "perdido"', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);

    await caso.ejecutar({ datosCrudos: datosCrudosValidos, reportadoPor: 'usuario-1' });

    expect(detectarCoincidenciaJob.programar).not.toHaveBeenCalled();
  });

  it('reutiliza el mismo caso de uso para tipo=\'problematica\' con subtipo válido (REP-03)', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);

    const resultado = await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'problematica', subtipo: 'animal_suelto' },
      reportadoPor: 'usuario-1',
    });

    expect(resultado.tipo).toBe('problematica');
    expect(resultado.subtipo).toBe('animal_suelto');
    expect(resultado.estado).toBe('reportado');
  });

  it('fuerza mascotaId=null en un reporte "problematica" aunque el cliente declare uno', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);
    const mascotaId = '11111111-1111-1111-1111-111111111111';

    const resultado = await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'problematica', subtipo: 'foco_sanitario', mascotaId },
      reportadoPor: 'usuario-1',
    });

    expect(resultado.mascotaId).toBeNull();
    expect(repositorioReportes.crear).toHaveBeenCalledWith(expect.objectContaining({ mascotaId: null }));
  });

  it('persiste subtipo=null para \'perdido\'/\'encontrado\' aunque el cliente lo declare', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);

    await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, subtipo: 'animal_suelto' },
      reportadoPor: 'usuario-1',
    });

    expect(repositorioReportes.crear).toHaveBeenCalledWith(expect.objectContaining({ subtipo: null }));
  });

  it('rechaza fail-fast (pipeline) un reporte "problematica" sin subtipo, sin persistir nada', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, tipo: 'problematica' }, reportadoPor: 'usuario-1' }),
    ).rejects.toBeInstanceOf(CategoriaReporteObligatoriaError);
    expect(repositorioReportes.crear).not.toHaveBeenCalled();
  });

  it('NO programa DetectarCoincidenciaReporteJob para un reporte "problematica"', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, detectarCoincidenciaJob);

    await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'problematica', subtipo: 'accidente_vial' },
      reportadoPor: 'usuario-1',
    });

    expect(detectarCoincidenciaJob.programar).not.toHaveBeenCalled();
  });
});
