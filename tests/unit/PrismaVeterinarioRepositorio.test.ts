/**
 * @jest-environment node
 */
import { PrismaVeterinarioRepositorio } from '@infraestructura/adaptadores/PrismaVeterinarioRepositorio';

const usuarioCreateMock = jest.fn();
const perfilVeterinarioCreateMock = jest.fn();
const verificacionCreateMock = jest.fn();
const transactionMock = jest.fn();

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

describe('PrismaVeterinarioRepositorio', () => {
  beforeEach(() => {
    usuarioCreateMock.mockReset();
    perfilVeterinarioCreateMock.mockReset();
    verificacionCreateMock.mockReset();
    transactionMock.mockReset();

    usuarioCreateMock.mockResolvedValue({ id: 'vet-1', email: 'vet@ejemplo.test', estadoVerificacion: 'pendiente' });
    perfilVeterinarioCreateMock.mockResolvedValue({
      matricula: 'MP-1001',
      colegioEmisor: 'Colegio de Veterinarios de la Provincia de Buenos Aires',
    });
    verificacionCreateMock.mockResolvedValue({});

    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        usuario: { create: usuarioCreateMock },
        perfilVeterinario: { create: perfilVeterinarioCreateMock },
        verificacion: { create: verificacionCreateMock },
      }),
    );
  });

  it('crea usuarios (rol_id=2, estado_verificacion=pendiente), perfiles_veterinario y verificaciones en una única transacción', async () => {
    const repo = new PrismaVeterinarioRepositorio();

    const perfil = await repo.crear({
      id: 'vet-1',
      email: 'vet@ejemplo.test',
      matricula: 'MP-1001',
      colegioEmisor: 'Colegio de Veterinarios de la Provincia de Buenos Aires',
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(usuarioCreateMock).toHaveBeenCalledWith({
      data: {
        id: 'vet-1',
        email: 'vet@ejemplo.test',
        passwordHash: 'gestionado_por_supabase_auth',
        rolId: 2,
        estadoVerificacion: 'pendiente',
      },
      select: { id: true, email: true, estadoVerificacion: true },
    });
    expect(perfilVeterinarioCreateMock).toHaveBeenCalledWith({
      data: {
        usuarioId: 'vet-1',
        matricula: 'MP-1001',
        colegioEmisor: 'Colegio de Veterinarios de la Provincia de Buenos Aires',
      },
      select: { matricula: true, colegioEmisor: true },
    });
    expect(verificacionCreateMock).toHaveBeenCalledWith({
      data: { usuarioId: 'vet-1', tipo: 'veterinario', estado: 'pendiente' },
    });

    expect(perfil).toEqual({
      usuarioId: 'vet-1',
      email: 'vet@ejemplo.test',
      matricula: 'MP-1001',
      colegioEmisor: 'Colegio de Veterinarios de la Provincia de Buenos Aires',
      estadoVerificacion: 'pendiente',
    });
  });

  it('propaga el error de la transacción sin capturarlo (el caso de uso decide el mapeo a PEA-AUTH-006)', async () => {
    transactionMock.mockRejectedValue(new Error('conflicto de unicidad simulado'));
    const repo = new PrismaVeterinarioRepositorio();

    await expect(
      repo.crear({ id: 'vet-1', email: 'vet@ejemplo.test', matricula: 'MP-1001', colegioEmisor: 'Colegio X' }),
    ).rejects.toThrow('conflicto de unicidad simulado');
  });
});
