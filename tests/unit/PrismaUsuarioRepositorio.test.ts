/**
 * @jest-environment node
 */
import { PrismaUsuarioRepositorio } from '@infraestructura/adaptadores/PrismaUsuarioRepositorio';
import { Usuario } from '@dominio/entidades/Usuario';

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    usuario: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = jest.requireMock('@infraestructura/adaptadores/prisma-client') as {
  prisma: { usuario: { findFirst: jest.Mock; create: jest.Mock } };
};

describe('PrismaUsuarioRepositorio', () => {
  beforeEach(() => {
    prisma.usuario.findFirst.mockReset();
    prisma.usuario.create.mockReset();
  });

  it('existePorEmailActivo devuelve true si Prisma encuentra un usuario activo', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 'u1' });
    const repo = new PrismaUsuarioRepositorio();

    await expect(repo.existePorEmailActivo('ana@ejemplo.test')).resolves.toBe(true);
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { email: 'ana@ejemplo.test', deletedAt: null },
      select: { id: true },
    });
  });

  it('existePorEmailActivo devuelve false si Prisma no encuentra nada', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);
    const repo = new PrismaUsuarioRepositorio();

    await expect(repo.existePorEmailActivo('nadie@ejemplo.test')).resolves.toBe(false);
  });

  it('crear persiste el usuario con un marcador de credencial (nunca la contraseña real) y retorna la entidad', async () => {
    prisma.usuario.create.mockResolvedValue({ id: 'u2', email: 'ana@ejemplo.test', rolId: 1 });
    const repo = new PrismaUsuarioRepositorio();
    const usuario = Usuario.registrarDueño('u2', 'ana@ejemplo.test');

    const creado = await repo.crear(usuario);

    expect(prisma.usuario.create).toHaveBeenCalledWith({
      data: {
        id: 'u2',
        email: 'ana@ejemplo.test',
        passwordHash: 'gestionado_por_supabase_auth',
        rolId: 1,
      },
      select: { id: true, email: true, rolId: true },
    });
    expect(creado).toEqual({ id: 'u2', email: 'ana@ejemplo.test', rolId: 1 });
  });
});
