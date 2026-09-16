/**
 * @jest-environment node
 */
import { PrismaHistorialesCompartidosRepositorio } from '@infraestructura/adaptadores/PrismaHistorialesCompartidosRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    historialCompartido: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    historialCompartido: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
  };
};

const historialId = '44444444-4444-4444-4444-444444444444';
const veterinarioOrigenId = '11111111-1111-1111-1111-111111111111';
const veterinarioDestinoId = '22222222-2222-2222-2222-222222222222';
const mascotaId = '33333333-3333-3333-3333-333333333333';

const filaBase = {
  id: historialId,
  mascotaId,
  veterinarioOrigenId,
  veterinarioDestinoId,
  autorizadoEn: new Date('2026-09-14T10:00:00.000Z'),
  revocadoEn: null,
};

describe('PrismaHistorialesCompartidosRepositorio', () => {
  beforeEach(() => {
    prisma.historialCompartido.create.mockReset();
    prisma.historialCompartido.findUnique.mockReset();
    prisma.historialCompartido.findFirst.mockReset();
    prisma.historialCompartido.updateMany.mockReset();
  });

  it('Paso 1: crea la fila con los tres ids del comando', async () => {
    prisma.historialCompartido.create.mockResolvedValue(filaBase);
    const repo = new PrismaHistorialesCompartidosRepositorio();

    const resultado = await repo.crear({ mascotaId, veterinarioOrigenId, veterinarioDestinoId });

    expect(prisma.historialCompartido.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { mascotaId, veterinarioOrigenId, veterinarioDestinoId } }),
    );
    expect(resultado).toEqual(filaBase);
  });

  it('obtenerActual devuelve null si el id no existe', async () => {
    prisma.historialCompartido.findUnique.mockResolvedValue(null);
    const repo = new PrismaHistorialesCompartidosRepositorio();

    expect(await repo.obtenerActual(historialId)).toBeNull();
  });

  it('Paso 2: revocar marca revocadoEn condicionado a id + veterinarioOrigenId + revocadoEn IS NULL', async () => {
    prisma.historialCompartido.findFirst.mockResolvedValue(filaBase);
    prisma.historialCompartido.updateMany.mockResolvedValue({ count: 1 });
    const repo = new PrismaHistorialesCompartidosRepositorio();

    const resultado = await repo.revocar(historialId, veterinarioOrigenId);

    expect(prisma.historialCompartido.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: historialId, veterinarioOrigenId, revocadoEn: null } }),
    );
    expect(prisma.historialCompartido.updateMany).toHaveBeenCalledWith({
      where: { id: historialId, veterinarioOrigenId, revocadoEn: null },
      data: { revocadoEn: expect.any(Date) },
    });
    expect(resultado?.revocadoEn).toBeInstanceOf(Date);
  });

  it('revocar devuelve null si no hay ninguna fila vigente con ese id y ese origen', async () => {
    prisma.historialCompartido.findFirst.mockResolvedValue(null);
    const repo = new PrismaHistorialesCompartidosRepositorio();

    expect(await repo.revocar(historialId, veterinarioOrigenId)).toBeNull();
    expect(prisma.historialCompartido.updateMany).not.toHaveBeenCalled();
  });

  it('AC (carrera): revocar devuelve null si otra revocación concurrente ya afectó la fila entre la lectura y el UPDATE', async () => {
    prisma.historialCompartido.findFirst.mockResolvedValue(filaBase);
    prisma.historialCompartido.updateMany.mockResolvedValue({ count: 0 });
    const repo = new PrismaHistorialesCompartidosRepositorio();

    expect(await repo.revocar(historialId, veterinarioOrigenId)).toBeNull();
  });
});
