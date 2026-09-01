/**
 * @jest-environment node
 */
import { PrismaTurnoRepositorio } from '@infraestructura/adaptadores/PrismaTurnoRepositorio';
import type { DatosNuevoTurno } from '@dominio/puertos/IRepositorioTurnos';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    turno: { count: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    turno: { count: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
};

const eventoId = '11111111-1111-1111-1111-111111111111';
const municipioId = '22222222-2222-2222-2222-222222222222';

describe('PrismaTurnoRepositorio', () => {
  beforeEach(() => {
    prisma.turno.count.mockReset();
    prisma.turno.create.mockReset();
    prisma.$transaction.mockReset();
  });

  describe('contarDisponiblesPorEvento', () => {
    it('cuenta solo turnos estado="disponible" y no soft-deleted, del evento indicado', async () => {
      prisma.turno.count.mockResolvedValue(7);
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.contarDisponiblesPorEvento(eventoId);

      expect(resultado).toBe(7);
      expect(prisma.turno.count).toHaveBeenCalledWith({
        where: { eventoId, estado: 'disponible', deletedAt: null },
      });
    });
  });

  describe('crearLote', () => {
    it('no llama a $transaction y devuelve [] con un lote vacío', async () => {
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.crearLote([]);

      expect(resultado).toEqual([]);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('crea un turno por cada elemento del lote dentro de una única transacción', async () => {
      const turnos: DatosNuevoTurno[] = [
        {
          proveedorTipo: 'municipio',
          proveedorId: municipioId,
          eventoId,
          franjaInicio: new Date('2026-10-01T09:00:00.000Z'),
          franjaFin: new Date('2026-10-01T09:20:00.000Z'),
        },
        {
          proveedorTipo: 'municipio',
          proveedorId: municipioId,
          eventoId,
          franjaInicio: new Date('2026-10-01T09:20:00.000Z'),
          franjaFin: new Date('2026-10-01T09:40:00.000Z'),
        },
      ];
      prisma.$transaction.mockImplementation(async (operaciones: unknown[]) => operaciones);

      const adapter = new PrismaTurnoRepositorio();
      await adapter.crearLote(turnos);

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
      expect(prisma.turno.create).toHaveBeenCalledTimes(2);
      expect(prisma.turno.create).toHaveBeenCalledWith({
        data: {
          proveedorTipo: 'municipio',
          proveedorId: municipioId,
          eventoId,
          franjaInicio: turnos[0]!.franjaInicio,
          franjaFin: turnos[0]!.franjaFin,
        },
        select: expect.objectContaining({ id: true, estado: true }),
      });
    });
  });
});
