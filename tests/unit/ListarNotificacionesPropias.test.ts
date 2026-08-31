/**
 * @jest-environment node
 */
import { ListarNotificacionesPropias } from '@aplicacion/casos-de-uso/notificaciones/ListarNotificacionesPropias';
import type { INotificacionesRepositorio, PaginaNotificaciones } from '@dominio/puertos/INotificacionesRepositorio';

function crearFakes(pagina: PaginaNotificaciones) {
  const repositorioNotificaciones: jest.Mocked<INotificacionesRepositorio> = {
    crear: jest.fn(),
    listarPorUsuario: jest.fn().mockResolvedValue(pagina),
    marcarComoLeida: jest.fn(),
  };
  return { repositorioNotificaciones };
}

const paginaVacia: PaginaNotificaciones = { items: [], total: 0, pagina: 1, porPagina: 50, noLeidas: 0 };

describe('ListarNotificacionesPropias', () => {
  it('delega en el repositorio con el usuarioId del solicitante', async () => {
    const { repositorioNotificaciones } = crearFakes(paginaVacia);
    const caso = new ListarNotificacionesPropias(repositorioNotificaciones);

    await caso.ejecutar({ solicitanteId: 'usuario-1', pagina: 1, porPagina: 50 });

    expect(repositorioNotificaciones.listarPorUsuario).toHaveBeenCalledWith('usuario-1', 1, 50);
  });

  it('aplica el tope de 50 por página aunque se pida más', async () => {
    const { repositorioNotificaciones } = crearFakes(paginaVacia);
    const caso = new ListarNotificacionesPropias(repositorioNotificaciones);

    await caso.ejecutar({ solicitanteId: 'usuario-1', pagina: 1, porPagina: 500 });

    expect(repositorioNotificaciones.listarPorUsuario).toHaveBeenCalledWith('usuario-1', 1, 50);
  });

  it('nunca pide una página menor a 1', async () => {
    const { repositorioNotificaciones } = crearFakes(paginaVacia);
    const caso = new ListarNotificacionesPropias(repositorioNotificaciones);

    await caso.ejecutar({ solicitanteId: 'usuario-1', pagina: -5, porPagina: 50 });

    expect(repositorioNotificaciones.listarPorUsuario).toHaveBeenCalledWith('usuario-1', 1, 50);
  });

  it('devuelve la página (incluido noLeidas) tal como la entrega el repositorio', async () => {
    const pagina: PaginaNotificaciones = {
      items: [
        {
          id: 'notif-1',
          tipo: 'reporte_coincidente',
          referenciaTabla: 'reportes',
          referenciaId: 'reporte-1',
          leido: false,
          createdAt: new Date('2026-08-01T12:00:00.000Z'),
        },
      ],
      total: 1,
      pagina: 1,
      porPagina: 50,
      noLeidas: 1,
    };
    const { repositorioNotificaciones } = crearFakes(pagina);
    const caso = new ListarNotificacionesPropias(repositorioNotificaciones);

    const resultado = await caso.ejecutar({ solicitanteId: 'usuario-1', pagina: 1, porPagina: 50 });

    expect(resultado).toEqual(pagina);
  });

  it('no exige ninguna verificación de rol (autorizar es no-op) — cualquier usuario autenticado ve su propia bandeja', async () => {
    const { repositorioNotificaciones } = crearFakes(paginaVacia);
    const caso = new ListarNotificacionesPropias(repositorioNotificaciones);

    await expect(caso.ejecutar({ solicitanteId: 'usuario-1', pagina: 1, porPagina: 50 })).resolves.toEqual(paginaVacia);
  });
});
