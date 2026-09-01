/**
 * @jest-environment node
 */
import { PrismaEventoRepositorio } from '@infraestructura/adaptadores/PrismaEventoRepositorio';
import type { DatosNuevoEvento } from '@dominio/puertos/IRepositorioEventos';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: { evento: { create: jest.fn() } },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: { evento: { create: jest.Mock } };
};

const FECHA_FIJA = new Date('2026-09-10T12:00:00.000Z');
const CREATED_AT_FIJO = new Date('2026-09-01T09:00:00.000Z');

const datos: DatosNuevoEvento = {
  municipioId: 'municipio-1',
  titulo: 'Jornada de castración — Barrio Norte',
  tipo: 'castracion',
  direccion: 'Calle 25 N° 450',
  latitud: -37.9989,
  longitud: -61.3565,
  fecha: FECHA_FIJA,
  cuposTotales: 30,
  requisitos: 'Traer collar/bozal y DNI del tutor.',
};

describe('PrismaEventoRepositorio', () => {
  beforeEach(() => {
    prisma.evento.create.mockReset();
  });

  it('crea el evento y reconstruye la entidad con los datos devueltos por Prisma', async () => {
    prisma.evento.create.mockResolvedValue({
      id: 'evento-1',
      municipioId: datos.municipioId,
      titulo: datos.titulo,
      tipo: datos.tipo,
      direccion: datos.direccion,
      latitud: datos.latitud,
      longitud: datos.longitud,
      fecha: FECHA_FIJA,
      cuposTotales: datos.cuposTotales,
      requisitos: datos.requisitos,
      createdAt: CREATED_AT_FIJO,
    });

    const adapter = new PrismaEventoRepositorio();
    const resultado = await adapter.crear(datos);

    expect(prisma.evento.create).toHaveBeenCalledWith({
      data: {
        municipioId: datos.municipioId,
        titulo: datos.titulo,
        tipo: datos.tipo,
        direccion: datos.direccion,
        latitud: datos.latitud,
        longitud: datos.longitud,
        fecha: datos.fecha,
        cuposTotales: datos.cuposTotales,
        requisitos: datos.requisitos,
      },
      select: expect.objectContaining({ id: true, municipioId: true, fecha: true, cuposTotales: true }),
    });
    expect(resultado.id).toBe('evento-1');
    expect(resultado.municipioId).toBe(datos.municipioId);
    expect(resultado.fecha).toEqual(FECHA_FIJA);
    expect(resultado.cuposTotales).toBe(30);
    expect(resultado.createdAt).toEqual(CREATED_AT_FIJO);
  });

  it('persiste requisitos=null cuando no se declara', async () => {
    prisma.evento.create.mockResolvedValue({
      id: 'evento-2',
      ...datos,
      requisitos: null,
      createdAt: CREATED_AT_FIJO,
    });

    const adapter = new PrismaEventoRepositorio();
    const resultado = await adapter.crear({ ...datos, requisitos: null });

    expect(resultado.requisitos).toBeNull();
  });
});
