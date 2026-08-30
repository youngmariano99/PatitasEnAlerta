/**
 * @jest-environment node
 */
import { CrearReporte } from '@aplicacion/casos-de-uso/reportes/CrearReporte';
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
  };
  const almacenamientoImagenes: jest.Mocked<IAlmacenamientoImagenes> = {
    esUrlDeImagenValida: jest.fn().mockReturnValue(opciones?.fotoValida ?? true),
  };
  const controlDeTasa: jest.Mocked<IControlDeTasa> = {
    permitir: jest.fn().mockResolvedValue(opciones?.permitirTasa ?? true),
  };
  return { repositorioReportes, almacenamientoImagenes, controlDeTasa };
}

const datosCrudosValidos = {
  tipo: 'perdido',
  descripcion: 'Se perdió cerca de la plaza.',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg',
  latitud: -37.9989,
  longitud: -61.3565,
};

describe('CrearReporte', () => {
  it('crea el reporte con estado inicial "reportado" y mascotaId=null cuando no se declara', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa);

    const resultado = await caso.ejecutar({ datosCrudos: datosCrudosValidos, reportadoPor: 'usuario-1' });

    expect(resultado.estado).toBe('reportado');
    expect(resultado.mascotaId).toBeNull();
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
    });
  });

  it('persiste mascotaId cuando se declara', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa);
    const mascotaId = '11111111-1111-1111-1111-111111111111';

    await caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, mascotaId }, reportadoPor: 'usuario-1' });

    expect(repositorioReportes.crear).toHaveBeenCalledWith(expect.objectContaining({ mascotaId }));
  });

  it('rechaza fail-fast (pipeline) sin categoría antes de tocar el repositorio', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa } = crearFakes();
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tipo: _tipo, ...sinTipo } = datosCrudosValidos;

    await expect(caso.ejecutar({ datosCrudos: sinTipo, reportadoPor: 'usuario-1' })).rejects.toBeInstanceOf(
      CategoriaReporteObligatoriaError,
    );
    expect(repositorioReportes.crear).not.toHaveBeenCalled();
  });

  it('rechaza una fotoUrl que no pertenece a nuestra cuenta de Cloudinary, sin persistir nada', async () => {
    const { repositorioReportes, almacenamientoImagenes, controlDeTasa } = crearFakes({ fotoValida: false });
    const caso = new CrearReporte(repositorioReportes, almacenamientoImagenes, controlDeTasa);

    await expect(caso.ejecutar({ datosCrudos: datosCrudosValidos, reportadoPor: 'usuario-1' })).rejects.toBeInstanceOf(
      FotoReporteObligatoriaError,
    );
    expect(repositorioReportes.crear).not.toHaveBeenCalled();
  });
});
