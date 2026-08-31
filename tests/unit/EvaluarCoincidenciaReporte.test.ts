/**
 * @jest-environment node
 */
import { EvaluarCoincidenciaReporte } from '@aplicacion/casos-de-uso/reportes/EvaluarCoincidenciaReporte';
import type { ReporteCreado } from '@aplicacion/dtos/reportes/CrearReporteDto';
import type { IRepositorioReportes, ReporteActivoResumen } from '@dominio/puertos/IRepositorioReportes';
import type { DatosNotificacion, INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';

function crearFakes(coincidencias: ReporteActivoResumen[] = []) {
  const repositorioReportes: jest.Mocked<IRepositorioReportes> = {
    crear: jest.fn(),
    buscarPerdidosActivosPorZonaYEspecie: jest.fn().mockResolvedValue(coincidencias),
  };
  const repositorioNotificaciones: jest.Mocked<INotificacionesRepositorio> = {
    crear: jest.fn().mockResolvedValue(undefined),
  };
  return { repositorioReportes, repositorioNotificaciones };
}

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

describe('EvaluarCoincidenciaReporte', () => {
  it('no busca coincidencias si el reporte "encontrado" no tiene especie declarada', async () => {
    const { repositorioReportes, repositorioNotificaciones } = crearFakes();
    const servicio = new EvaluarCoincidenciaReporte(repositorioReportes, repositorioNotificaciones);

    await servicio.ejecutar({ ...reporteEncontrado, especie: null });

    expect(repositorioReportes.buscarPerdidosActivosPorZonaYEspecie).not.toHaveBeenCalled();
    expect(repositorioNotificaciones.crear).not.toHaveBeenCalled();
  });

  it('consulta zona (5km) y especie, excluyendo el propio reporte recién creado', async () => {
    const { repositorioReportes, repositorioNotificaciones } = crearFakes();
    const servicio = new EvaluarCoincidenciaReporte(repositorioReportes, repositorioNotificaciones);

    await servicio.ejecutar(reporteEncontrado);

    expect(repositorioReportes.buscarPerdidosActivosPorZonaYEspecie).toHaveBeenCalledWith({
      especie: 'perro',
      latitud: reporteEncontrado.latitud,
      longitud: reporteEncontrado.longitud,
      radioKm: 5,
      excluirReporteId: reporteEncontrado.id,
    });
  });

  it('notifica (tipo=reporte_coincidente) a cada dueño de un reporte "perdido" coincidente', async () => {
    const coincidencias: ReporteActivoResumen[] = [
      { id: 'perdido-1', reportadoPor: 'dueno-1' },
      { id: 'perdido-2', reportadoPor: 'dueno-2' },
    ];
    const { repositorioReportes, repositorioNotificaciones } = crearFakes(coincidencias);
    const servicio = new EvaluarCoincidenciaReporte(repositorioReportes, repositorioNotificaciones);

    await servicio.ejecutar(reporteEncontrado);

    expect(repositorioNotificaciones.crear).toHaveBeenCalledTimes(2);
    const llamadas = repositorioNotificaciones.crear.mock.calls.map((llamada) => llamada[0]) as DatosNotificacion[];
    expect(llamadas).toEqual([
      { usuarioId: 'dueno-1', tipo: 'reporte_coincidente', referenciaTabla: 'reportes', referenciaId: reporteEncontrado.id },
      { usuarioId: 'dueno-2', tipo: 'reporte_coincidente', referenciaTabla: 'reportes', referenciaId: reporteEncontrado.id },
    ]);
  });

  it('no notifica a nadie cuando no hay coincidencias', async () => {
    const { repositorioReportes, repositorioNotificaciones } = crearFakes([]);
    const servicio = new EvaluarCoincidenciaReporte(repositorioReportes, repositorioNotificaciones);

    await servicio.ejecutar(reporteEncontrado);

    expect(repositorioNotificaciones.crear).not.toHaveBeenCalled();
  });
});
