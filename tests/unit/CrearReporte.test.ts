/**
 * @jest-environment node
 */
import { CrearReporte } from '@aplicacion/casos-de-uso/reportes/CrearReporte';
import type { EvaluarCoincidenciaReporte } from '@aplicacion/casos-de-uso/reportes/EvaluarCoincidenciaReporte';
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
  };
  const almacenamientoImagenes: jest.Mocked<IAlmacenamientoImagenes> = {
    esUrlDeImagenValida: jest.fn().mockReturnValue(opciones?.fotoValida ?? true),
  };
  const controlDeTasa: jest.Mocked<IControlDeTasa> = {
    permitir: jest.fn().mockResolvedValue(opciones?.permitirTasa ?? true),
  };
  const evaluarCoincidencia = {
    ejecutar: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<Pick<EvaluarCoincidenciaReporte, 'ejecutar'>> as jest.Mocked<EvaluarCoincidenciaReporte>;
  return { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia };
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
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

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
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);
    const mascotaId = '11111111-1111-1111-1111-111111111111';

    await caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, mascotaId, especie: 'perro' }, reportadoPor: 'usuario-1' });

    expect(repositorioReportes.crear).toHaveBeenCalledWith(expect.objectContaining({ mascotaId, especie: 'perro' }));
  });

  it('rechaza fail-fast (pipeline) sin categoría antes de tocar el repositorio', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tipo: _tipo, ...sinTipo } = datosCrudosValidos;

    await expect(caso.ejecutar({ datosCrudos: sinTipo, reportadoPor: 'usuario-1' })).rejects.toBeInstanceOf(
      CategoriaReporteObligatoriaError,
    );
    expect(repositorioReportes.crear).not.toHaveBeenCalled();
  });

  it('rechaza una fotoUrl que no pertenece a nuestra cuenta de Cloudinary, sin persistir nada', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes({
      fotoValida: false,
    });
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

    await expect(caso.ejecutar({ datosCrudos: datosCrudosValidos, reportadoPor: 'usuario-1' })).rejects.toBeInstanceOf(
      FotoReporteObligatoriaError,
    );
    expect(repositorioReportes.crear).not.toHaveBeenCalled();
  });

  it('reutiliza el mismo caso de uso para tipo=\'encontrado\' sin exigir mascotaId', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

    const resultado = await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'encontrado', especie: 'perro' },
      reportadoPor: 'vecino-sin-mascotas',
    });

    expect(resultado.tipo).toBe('encontrado');
    expect(resultado.mascotaId).toBeNull();
  });

  it('dispara EvaluarCoincidenciaReporte tras persistir un reporte "encontrado"', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

    const resultado = await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'encontrado', especie: 'perro' },
      reportadoPor: 'usuario-1',
    });

    expect(evaluarCoincidencia.ejecutar).toHaveBeenCalledWith(resultado);
  });

  it('NO dispara EvaluarCoincidenciaReporte para un reporte "perdido"', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

    await caso.ejecutar({ datosCrudos: datosCrudosValidos, reportadoPor: 'usuario-1' });

    expect(evaluarCoincidencia.ejecutar).not.toHaveBeenCalled();
  });

  it('no falla la creación del reporte si la evaluación de coincidencias rechaza (no bloqueante)', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    evaluarCoincidencia.ejecutar.mockRejectedValue(new Error('el job de coincidencias está caído'));
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, tipo: 'encontrado', especie: 'perro' }, reportadoPor: 'usuario-1' }),
    ).resolves.toMatchObject({ tipo: 'encontrado', estado: 'reportado' });
  });

  it('reutiliza el mismo caso de uso para tipo=\'problematica\' con subtipo válido (REP-03)', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

    const resultado = await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'problematica', subtipo: 'animal_suelto' },
      reportadoPor: 'usuario-1',
    });

    expect(resultado.tipo).toBe('problematica');
    expect(resultado.subtipo).toBe('animal_suelto');
    expect(resultado.estado).toBe('reportado');
  });

  it('fuerza mascotaId=null en un reporte "problematica" aunque el cliente declare uno', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);
    const mascotaId = '11111111-1111-1111-1111-111111111111';

    const resultado = await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'problematica', subtipo: 'foco_sanitario', mascotaId },
      reportadoPor: 'usuario-1',
    });

    expect(resultado.mascotaId).toBeNull();
    expect(repositorioReportes.crear).toHaveBeenCalledWith(expect.objectContaining({ mascotaId: null }));
  });

  it('persiste subtipo=null para \'perdido\'/\'encontrado\' aunque el cliente lo declare', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

    await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, subtipo: 'animal_suelto' },
      reportadoPor: 'usuario-1',
    });

    expect(repositorioReportes.crear).toHaveBeenCalledWith(expect.objectContaining({ subtipo: null }));
  });

  it('rechaza fail-fast (pipeline) un reporte "problematica" sin subtipo, sin persistir nada', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, tipo: 'problematica' }, reportadoPor: 'usuario-1' }),
    ).rejects.toBeInstanceOf(CategoriaReporteObligatoriaError);
    expect(repositorioReportes.crear).not.toHaveBeenCalled();
  });

  it('NO dispara EvaluarCoincidenciaReporte para un reporte "problematica"', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa, evaluarCoincidencia);

    await caso.ejecutar({
      datosCrudos: { ...datosCrudosValidos, tipo: 'problematica', subtipo: 'accidente_vial' },
      reportadoPor: 'usuario-1',
    });

    expect(evaluarCoincidencia.ejecutar).not.toHaveBeenCalled();
  });
});
