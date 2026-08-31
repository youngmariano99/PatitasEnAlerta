/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { MarcarNotificacionLeida } from '@aplicacion/casos-de-uso/notificaciones/MarcarNotificacionLeida';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

function crearFakes(marcada = true) {
  const repositorioNotificaciones: jest.Mocked<INotificacionesRepositorio> = {
    crear: jest.fn(),
    listarPorUsuario: jest.fn(),
    marcarComoLeida: jest.fn().mockResolvedValue(marcada),
  };
  return { repositorioNotificaciones };
}

const notificacionId = '11111111-1111-1111-1111-111111111111';
const solicitanteId = '22222222-2222-2222-2222-222222222222';

describe('MarcarNotificacionLeida', () => {
  it('marca como leída y persiste vía el UPDATE atómico del repositorio (id + usuarioId juntos)', async () => {
    const { repositorioNotificaciones } = crearFakes(true);
    const caso = new MarcarNotificacionLeida(repositorioNotificaciones);

    const resultado = await caso.ejecutar({ notificacionId, solicitanteId });

    expect(repositorioNotificaciones.marcarComoLeida).toHaveBeenCalledWith(notificacionId, solicitanteId);
    expect(resultado).toEqual({ id: notificacionId, leido: true });
  });

  it('rechaza con PEA-SIS-002 (anti-enumeración) cuando el repositorio no afectó ninguna fila', async () => {
    const { repositorioNotificaciones } = crearFakes(false);
    const caso = new MarcarNotificacionLeida(repositorioNotificaciones);

    await expect(caso.ejecutar({ notificacionId, solicitanteId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
  });

  it('no distingue en el mensaje si la notificación no existe o si es de otro usuario (mismo error en ambos casos)', async () => {
    const { repositorioNotificaciones } = crearFakes(false);
    const caso = new MarcarNotificacionLeida(repositorioNotificaciones);

    try {
      await caso.ejecutar({ notificacionId, solicitanteId });
      fail('debía rechazar');
    } catch (error) {
      expect(error).toBeInstanceOf(AccesoNoAutorizadoError);
      expect((error as AccesoNoAutorizadoError).codigo).toBe('PEA-SIS-002');
    }
  });

  it('rechaza fail-fast un id que no es un UUID válido, sin tocar el repositorio', async () => {
    const { repositorioNotificaciones } = crearFakes();
    const caso = new MarcarNotificacionLeida(repositorioNotificaciones);

    await expect(
      caso.ejecutar({ notificacionId: 'no-es-un-uuid', solicitanteId }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repositorioNotificaciones.marcarComoLeida).not.toHaveBeenCalled();
  });
});
