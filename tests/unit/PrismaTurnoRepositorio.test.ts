/**
 * @jest-environment node
 */
import { PrismaTurnoRepositorio } from '@infraestructura/adaptadores/PrismaTurnoRepositorio';
import type { DatosNuevoTurno } from '@dominio/puertos/IRepositorioTurnos';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    turno: { count: jest.fn(), create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    turno: { count: jest.Mock; create: jest.Mock; findFirst: jest.Mock; updateMany: jest.Mock; findMany: jest.Mock };
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
    prisma.turno.findMany.mockReset();
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
    it('devuelve id/estado/version/reservadoPor/proveedorId filtrando por deletedAt: null', async () => {
      prisma.turno.findFirst.mockResolvedValue({
        id: turnoId,
        estado: 'disponible',
        version: 3,
        reservadoPor: null,
        proveedorId: municipioId,
      });
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.obtenerActual(turnoId);

      expect(resultado).toEqual({
        id: turnoId,
        estado: 'disponible',
        version: 3,
        reservadoPor: null,
        proveedorId: municipioId,
      });
      expect(prisma.turno.findFirst).toHaveBeenCalledWith({
        where: { id: turnoId, deletedAt: null },
        select: { id: true, estado: true, version: true, reservadoPor: true, proveedorId: true },
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

  describe('listarPropios', () => {
    it('AC (Paso 1): filtra exclusivamente por reservado_por, no soft-deleted, ordenado por franja_inicio ascendente', async () => {
      const filaCruda = {
        id: turnoId,
        proveedorTipo: 'municipio',
        proveedorId: municipioId,
        eventoId,
        franjaInicio: new Date('2026-09-05T13:00:00.000Z'),
        franjaFin: new Date('2026-09-05T13:20:00.000Z'),
        estado: 'reservado',
        evento: { titulo: 'Jornada de castración — Barrio Norte' },
      };
      prisma.turno.findMany.mockResolvedValue([filaCruda]);
      prisma.turno.count.mockResolvedValue(1);
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.listarPropios(reservadoPor, 1, 50);

      expect(prisma.turno.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reservadoPor, deletedAt: null },
          orderBy: { franjaInicio: 'asc' },
          skip: 0,
          take: 50,
        }),
      );
      expect(prisma.turno.count).toHaveBeenCalledWith({ where: { reservadoPor, deletedAt: null } });
      expect(resultado).toEqual({
        items: [
          {
            id: turnoId,
            proveedorTipo: 'municipio',
            proveedorId: municipioId,
            eventoId,
            eventoTitulo: 'Jornada de castración — Barrio Norte',
            franjaInicio: filaCruda.franjaInicio,
            franjaFin: filaCruda.franjaFin,
            estado: 'reservado',
          },
        ],
        total: 1,
        pagina: 1,
        porPagina: 50,
      });
    });

    it('devuelve eventoTitulo null para un turno sin evento asociado (proveedor veterinario)', async () => {
      prisma.turno.findMany.mockResolvedValue([
        {
          id: turnoId,
          proveedorTipo: 'veterinario',
          proveedorId: 'vet-1',
          eventoId: null,
          franjaInicio: new Date('2026-09-10T10:00:00.000Z'),
          franjaFin: new Date('2026-09-10T10:30:00.000Z'),
          estado: 'reservado',
          evento: null,
        },
      ]);
      prisma.turno.count.mockResolvedValue(1);
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.listarPropios(reservadoPor, 1, 50);

      expect(resultado.items[0]!.eventoTitulo).toBeNull();
    });

    it('respeta la paginación (skip/take) según pagina/porPagina', async () => {
      prisma.turno.findMany.mockResolvedValue([]);
      prisma.turno.count.mockResolvedValue(0);
      const adapter = new PrismaTurnoRepositorio();

      await adapter.listarPropios(reservadoPor, 3, 20);

      expect(prisma.turno.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
    });
  });

  describe('cancelar', () => {
    it('AC (Paso 1): ejecuta el UPDATE condicionado por id/estado="reservado"/version, conservando reservadoPor', async () => {
      prisma.turno.findFirst.mockResolvedValue({ reservadoPor, proveedorId: municipioId });
      prisma.turno.updateMany.mockResolvedValue({ count: 1 });
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.cancelar(turnoId, 3);

      expect(prisma.turno.updateMany).toHaveBeenCalledWith({
        where: { id: turnoId, estado: 'reservado', version: 3, deletedAt: null },
        data: { estado: 'cancelado', version: { increment: 1 } },
      });
      // `reservadoPor` deliberadamente ausente de `data` (Realtime "Mis turnos").
      expect(prisma.turno.updateMany.mock.calls[0]![0].data).not.toHaveProperty('reservadoPor');
      expect(resultado).toEqual({ id: turnoId, estado: 'cancelado', reservadoPor, proveedorId: municipioId, version: 4 });
    });

    it('devuelve null si el turno no existe', async () => {
      prisma.turno.findFirst.mockResolvedValue(null);
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.cancelar(turnoId, 3);

      expect(resultado).toBeNull();
      expect(prisma.turno.updateMany).not.toHaveBeenCalled();
    });

    it('AC/Paso 4: devuelve null cuando 0 filas fueron afectadas (ya cancelado, o carrera perdida)', async () => {
      prisma.turno.findFirst.mockResolvedValue({ reservadoPor, proveedorId: municipioId });
      prisma.turno.updateMany.mockResolvedValue({ count: 0 });
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.cancelar(turnoId, 3);

      expect(resultado).toBeNull();
    });
  });

  describe('reprogramar', () => {
    const turnoNuevoId = '55555555-5555-5555-5555-555555555555';

    function crearTxMock() {
      return { turno: { findFirst: jest.fn(), updateMany: jest.fn() } };
    }

    it('AC (Paso 2): cancela el turno actual y reserva el nuevo dentro de la misma transacción Prisma', async () => {
      const tx = crearTxMock();
      tx.turno.findFirst.mockResolvedValue({ reservadoPor, proveedorId: municipioId });
      tx.turno.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.reprogramar(turnoId, turnoNuevoId, reservadoPor, 3, 0);

      expect(tx.turno.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: turnoId, estado: 'reservado', version: 3, deletedAt: null },
        data: { estado: 'cancelado', version: { increment: 1 } },
      });
      expect(tx.turno.updateMany).toHaveBeenNthCalledWith(2, {
        where: { id: turnoNuevoId, estado: 'disponible', version: 0, deletedAt: null },
        data: { estado: 'reservado', reservadoPor, version: { increment: 1 } },
      });
      expect(resultado).toEqual({
        turnoCancelado: { id: turnoId, estado: 'cancelado', reservadoPor, proveedorId: municipioId, version: 4 },
        turnoReservado: { id: turnoNuevoId, estado: 'reservado', reservadoPor, version: 1 },
      });
    });

    it('AC ("todo o nada"): si la reserva del turno nuevo falla, revierte también la cancelación del actual (transacción completa)', async () => {
      const tx = crearTxMock();
      tx.turno.findFirst.mockResolvedValue({ reservadoPor, proveedorId: municipioId });
      tx.turno.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.reprogramar(turnoId, turnoNuevoId, reservadoPor, 3, 0);

      expect(resultado).toBeNull();
      // Ambos pasos SÍ se intentaron dentro de la misma transacción — Prisma
      // revierte el primer UPDATE porque el callback termina lanzando.
      expect(tx.turno.updateMany).toHaveBeenCalledTimes(2);
    });

    it('devuelve null si el turno actual no puede cancelarse (0 filas), sin intentar la reserva del nuevo', async () => {
      const tx = crearTxMock();
      tx.turno.findFirst.mockResolvedValue({ reservadoPor, proveedorId: municipioId });
      tx.turno.updateMany.mockResolvedValueOnce({ count: 0 });
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.reprogramar(turnoId, turnoNuevoId, reservadoPor, 3, 0);

      expect(resultado).toBeNull();
      expect(tx.turno.updateMany).toHaveBeenCalledTimes(1);
    });

    it('devuelve null si el turno actual no existe', async () => {
      const tx = crearTxMock();
      tx.turno.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(tx));
      const adapter = new PrismaTurnoRepositorio();

      const resultado = await adapter.reprogramar(turnoId, turnoNuevoId, reservadoPor, 3, 0);

      expect(resultado).toBeNull();
      expect(tx.turno.updateMany).not.toHaveBeenCalled();
    });
  });
});
