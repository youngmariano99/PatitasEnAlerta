/**
 * @jest-environment node
 */
import { PrismaFichaAdopcionRepositorio } from '@infraestructura/adaptadores/PrismaFichaAdopcionRepositorio';
import type { DatosNuevaFichaAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    vitrinaAdopcion: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: {
    vitrinaAdopcion: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };
};

const municipioId = '11111111-1111-1111-1111-111111111111';
const fichaId = '22222222-2222-2222-2222-222222222222';
const CREATED_AT = new Date('2026-09-01T09:00:00.000Z');

const filaBase = {
  id: fichaId,
  municipioId,
  nombreAnimal: 'Luna',
  especie: 'perro',
  edadAproximada: null,
  tamano: null,
  temperamento: null,
  estadoSalud: null,
  requisitosAdopcion: null,
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/luna.jpg',
  estado: 'disponible',
  createdAt: CREATED_AT,
};

describe('PrismaFichaAdopcionRepositorio', () => {
  beforeEach(() => {
    prisma.vitrinaAdopcion.create.mockReset();
    prisma.vitrinaAdopcion.findFirst.mockReset();
    prisma.vitrinaAdopcion.update.mockReset();
    prisma.vitrinaAdopcion.findMany.mockReset();
    prisma.vitrinaAdopcion.count.mockReset();
  });

  it('crea la ficha sin declarar `estado` (nace en "disponible" por DEFAULT de columna)', async () => {
    prisma.vitrinaAdopcion.create.mockResolvedValue(filaBase);
    const datos: DatosNuevaFichaAdopcion = {
      municipioId,
      nombreAnimal: 'Luna',
      especie: 'perro',
      edadAproximada: null,
      tamano: null,
      temperamento: null,
      estadoSalud: null,
      requisitosAdopcion: null,
      fotoUrl: filaBase.fotoUrl,
    };
    const adapter = new PrismaFichaAdopcionRepositorio();

    const resultado = await adapter.crear(datos);

    expect(resultado.estado).toBe('disponible');
    const [{ data: datosEnviados }] = prisma.vitrinaAdopcion.create.mock.calls[0]!;
    expect(datosEnviados).not.toHaveProperty('estado');
  });

  it('buscarPorId filtra deletedAt IS NULL y devuelve null si no existe', async () => {
    prisma.vitrinaAdopcion.findFirst.mockResolvedValue(null);
    const adapter = new PrismaFichaAdopcionRepositorio();

    const resultado = await adapter.buscarPorId(fichaId);

    expect(resultado).toBeNull();
    expect(prisma.vitrinaAdopcion.findFirst).toHaveBeenCalledWith({
      where: { id: fichaId, deletedAt: null },
      select: expect.any(Object),
    });
  });

  it('darDeBaja hace un UPDATE de estado="baja", nunca un delete', async () => {
    prisma.vitrinaAdopcion.update.mockResolvedValue({ ...filaBase, estado: 'baja' });
    const adapter = new PrismaFichaAdopcionRepositorio();

    const resultado = await adapter.darDeBaja(fichaId);

    expect(resultado.estado).toBe('baja');
    expect(prisma.vitrinaAdopcion.update).toHaveBeenCalledWith({
      where: { id: fichaId },
      data: { estado: 'baja' },
      select: expect.any(Object),
    });
  });

  it('listarPorMunicipio filtra por municipioId y, si se declara, por estado', async () => {
    prisma.vitrinaAdopcion.findMany.mockResolvedValue([filaBase]);
    prisma.vitrinaAdopcion.count.mockResolvedValue(1);
    const adapter = new PrismaFichaAdopcionRepositorio();

    const resultado = await adapter.listarPorMunicipio({ municipioId, estado: 'disponible' }, 1, 50);

    expect(resultado.total).toBe(1);
    expect(resultado.items).toHaveLength(1);
    expect(prisma.vitrinaAdopcion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, municipioId, estado: 'disponible' } }),
    );
  });

  it('listarPorMunicipio sin filtro de estado devuelve todas las fichas propias (cualquier estado)', async () => {
    prisma.vitrinaAdopcion.findMany.mockResolvedValue([]);
    prisma.vitrinaAdopcion.count.mockResolvedValue(0);
    const adapter = new PrismaFichaAdopcionRepositorio();

    await adapter.listarPorMunicipio({ municipioId }, 1, 50);

    expect(prisma.vitrinaAdopcion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null, municipioId } }),
    );
  });
});
