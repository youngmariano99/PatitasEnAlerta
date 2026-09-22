/**
 * @jest-environment node
 */
import { ListarHistorialesCompartidos } from '@aplicacion/casos-de-uso/veterinarios-avanzado/ListarHistorialesCompartidos';
import type {
  HistorialCompartido,
  IRepositorioHistorialesCompartidos,
} from '@dominio/puertos/IRepositorioHistorialesCompartidos';

describe('ListarHistorialesCompartidos', () => {
  it('mapea los historiales del veterinario origen a DTO', async () => {
    const historial: HistorialCompartido = {
      id: 'hist-1',
      mascotaId: 'mascota-1',
      veterinarioOrigenId: 'vet-1',
      veterinarioDestinoId: 'vet-2',
      autorizadoEn: new Date('2026-09-14T10:00:00.000Z'),
      revocadoEn: null,
    };
    const repositorioHistoriales: jest.Mocked<IRepositorioHistorialesCompartidos> = {
      crear: jest.fn(),
      obtenerActual: jest.fn(),
      listarPorOrigen: jest.fn().mockResolvedValue([historial]),
      revocar: jest.fn(),
    };
    const caso = new ListarHistorialesCompartidos(repositorioHistoriales);

    const resultado = await caso.ejecutar({ veterinarioOrigenId: 'vet-1' });

    expect(repositorioHistoriales.listarPorOrigen).toHaveBeenCalledWith('vet-1');
    expect(resultado).toEqual([
      {
        id: 'hist-1',
        mascotaId: 'mascota-1',
        veterinarioOrigenId: 'vet-1',
        veterinarioDestinoId: 'vet-2',
        autorizadoEn: '2026-09-14T10:00:00.000Z',
        revocadoEn: null,
      },
    ]);
  });
});
