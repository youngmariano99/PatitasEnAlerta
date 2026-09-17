/**
 * @jest-environment node
 */
import { RevocarHistorialCompartido } from '@aplicacion/casos-de-uso/veterinarios-avanzado/RevocarHistorialCompartido';
import type {
  HistorialCompartido,
  IRepositorioHistorialesCompartidos,
} from '@dominio/puertos/IRepositorioHistorialesCompartidos';
import { HistorialCompartidoNoEncontradoError } from '@dominio/errores/erroresVeterinariosAvanzados';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const historialId = '44444444-4444-4444-4444-444444444444';
const veterinarioOrigenId = '11111111-1111-1111-1111-111111111111';
const otroVeterinarioId = '22222222-2222-2222-2222-222222222222';

function crearHistorialActivo(): HistorialCompartido {
  return {
    id: historialId,
    mascotaId: '33333333-3333-3333-3333-333333333333',
    veterinarioOrigenId,
    veterinarioDestinoId: '55555555-5555-5555-5555-555555555555',
    autorizadoEn: new Date('2026-09-14T10:00:00.000Z'),
    revocadoEn: null,
  };
}

function crearFakes(opciones?: { historial?: HistorialCompartido | null }) {
  const historialActivo =
    opciones?.historial === undefined ? crearHistorialActivo() : opciones.historial;
  const historialRevocado: HistorialCompartido | null = historialActivo
    ? { ...historialActivo, revocadoEn: new Date('2026-09-14T12:00:00.000Z') }
    : null;

  const repositorioHistoriales: jest.Mocked<IRepositorioHistorialesCompartidos> = {
    crear: jest.fn(),
    obtenerActual: jest.fn().mockResolvedValue(historialActivo),
    listarPorOrigen: jest.fn(),
    revocar: jest.fn().mockResolvedValue(historialRevocado),
  };
  return { repositorioHistoriales, historialActivo, historialRevocado };
}

describe('RevocarHistorialCompartido', () => {
  it('Paso 2: revoca el historial activo, actualizando revocadoEn y preservando el registro', async () => {
    const { repositorioHistoriales, historialRevocado } = crearFakes();
    const caso = new RevocarHistorialCompartido(repositorioHistoriales);

    const resultado = await caso.ejecutar({ historialId, veterinarioOrigenId });

    expect(resultado.revocadoEn).toBe(historialRevocado!.revocadoEn!.toISOString());
    expect(repositorioHistoriales.revocar).toHaveBeenCalledWith(historialId, veterinarioOrigenId);
  });

  it('AC: rechaza con 403 / PEA-SIS-002 cuando quien invoca no es el veterinario origen', async () => {
    const { repositorioHistoriales } = crearFakes();
    const caso = new RevocarHistorialCompartido(repositorioHistoriales);

    await expect(
      caso.ejecutar({ historialId, veterinarioOrigenId: otroVeterinarioId }),
    ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioHistoriales.revocar).not.toHaveBeenCalled();
  });

  it('responde 404 / PEA-VETADV-006 si el historial no existe', async () => {
    const { repositorioHistoriales } = crearFakes({ historial: null });
    const caso = new RevocarHistorialCompartido(repositorioHistoriales);

    await expect(caso.ejecutar({ historialId, veterinarioOrigenId })).rejects.toBeInstanceOf(
      HistorialCompartidoNoEncontradoError,
    );
    expect(repositorioHistoriales.revocar).not.toHaveBeenCalled();
  });

  it('responde 404 / PEA-VETADV-006 si otra revocación concurrente ya lo revocó (repositorio devuelve null)', async () => {
    const { repositorioHistoriales } = crearFakes();
    repositorioHistoriales.revocar.mockResolvedValue(null);
    const caso = new RevocarHistorialCompartido(repositorioHistoriales);

    await expect(caso.ejecutar({ historialId, veterinarioOrigenId })).rejects.toBeInstanceOf(
      HistorialCompartidoNoEncontradoError,
    );
  });
});
