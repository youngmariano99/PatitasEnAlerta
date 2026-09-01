/**
 * @jest-environment node
 */
import { PrismaTurnoRepositorio } from '@infraestructura/adaptadores/PrismaTurnoRepositorio';
import type { DatosNuevoTurno } from '@dominio/puertos/IRepositorioTurnos';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    turno: { count: jest.fn(), create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    turno: { count: jest.Mock; create: jest.Mock; findFirst: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
};

const eventoId = '11111111-1111-1111-1111-111111111111';
const municipioId = '22222222-2222-2222-2222-222222222222';
const turnoId = '33333333-3333-3333-3333-333333333333';
const reservadoPor = '44444444-4444-4444-4444-444444444444';

describe('PrismaTurnoRepositorio', () => {
  beforeEach(() => {
    prisma.turno.count.mockReset();
    prisma.turno.create.mockReset();
    prisma.turno.findFirst.mockReset();
    prisma.turno.updateMany.mockReset();
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

  describe('obtenerActual', () => {
    it('devuelve id/estado/version filtrando por deletedAt: null', async () => {
      prisma.turno.findFirst.mockResolvedValue({ id: turnoId, estado: 'disponible', version: 3 });
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.obtenerActual(turnoId);

      expect(resultado).toEqual({ id: turnoId, estado: 'disponible', version: 3 });
      expect(prisma.turno.findFirst).toHaveBeenCalledWith({
        where: { id: turnoId, deletedAt: null },
        select: { id: true, estado: true, version: true },
      });
    });

    it('devuelve null si no existe o está soft-deleted', async () => {
      prisma.turno.findFirst.mockResolvedValue(null);
      const adapter = new PrismaTurnoRepositorio();

      await expect(adapter.obtenerActual(turnoId)).resolves.toBeNull();
    });
  });

  describe('reservar', () => {
    it('AC (Paso 1): ejecuta el UPDATE condicionado por id/estado="disponible"/version, incrementando version', async () => {
      prisma.turno.updateMany.mockResolvedValue({ count: 1 });
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.reservar(turnoId, reservadoPor, 3);

      expect(prisma.turno.updateMany).toHaveBeenCalledWith({
        where: { id: turnoId, estado: 'disponible', version: 3, deletedAt: null },
        data: { estado: 'reservado', reservadoPor, version: { increment: 1 } },
      });
      expect(resultado).toEqual({ id: turnoId, estado: 'reservado', reservadoPor, version: 4 });
    });

    it('AC (Paso 2): devuelve null cuando 0 filas fueron afectadas (ya reservado/cancelado o carrera perdida)', async () => {
      prisma.turno.updateMany.mockResolvedValue({ count: 0 });
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.reservar(turnoId, reservadoPor, 3);

      expect(resultado).toBeNull();
    });
  });
});
