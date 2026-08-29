/**
 * @jest-environment node
 */
import { PrismaPerfilRepositorio } from '@infraestructura/adaptadores/PrismaPerfilRepositorio';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: { usuario: { findFirst: jest.fn() } },
}));

const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: { usuario: { findFirst: jest.Mock } };
};

describe('PrismaPerfilRepositorio', () => {
  beforeEach(() => {
    prisma.usuario.findFirst.mockReset();
  });

  it('mapea el perfil de un veterinario incluyendo verificado_en', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      id: 'vet-1',
      email: 'vet@ejemplo.test',
      estadoVerificacion: 'verificado',
      rol: { nombre: 'veterinario' },
      perfilVeterinario: { verificadoEn: new Date('2024-01-01T00:00:00.000Z') },
    });
    const repo = new PrismaPerfilRepositorio();

    const perfil = await repo.obtenerPerfilPropio('vet-1');

    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 'vet-1', deletedAt: null },
      select: {
        id: true,
        email: true,
        estadoVerificacion: true,
        rol: { select: { nombre: true } },
        perfilVeterinario: { select: { verificadoEn: true } },
      },
    });
    expect(perfil).toEqual({
      id: 'vet-1',
      email: 'vet@ejemplo.test',
      rol: 'veterinario',
      estadoVerificacion: 'verificado',
      verificadoEn: new Date('2024-01-01T00:00:00.000Z'),
    });
  });

  it('retorna verificadoEn=null para un dueño (sin perfilVeterinario)', async () => {
    prisma.usuario.findFirst.mockResolvedValue({
      id: 'dueno-1',
      email: 'ana@ejemplo.test',
      estadoVerificacion: 'no_requerido',
      rol: { nombre: 'dueño' },
      perfilVeterinario: null,
    });
    const repo = new PrismaPerfilRepositorio();

    const perfil = await repo.obtenerPerfilPropio('dueno-1');

    expect(perfil?.verificadoEn).toBeNull();
    expect(perfil?.rol).toBe('dueño');
  });

  it('retorna null si no hay un usuario activo con ese id', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);
    const repo = new PrismaPerfilRepositorio();

    await expect(repo.obtenerPerfilPropio('no-existe')).resolves.toBeNull();
  });
});
