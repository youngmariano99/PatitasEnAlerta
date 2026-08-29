/**
 * @jest-environment node
 */
import { PrismaMunicipioRepositorio } from '@infraestructura/adaptadores/PrismaMunicipioRepositorio';

const usuarioCreateMock = jest.fn();
const perfilMunicipioCreateMock = jest.fn();
const transactionMock = jest.fn();

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

describe('PrismaMunicipioRepositorio', () => {
  beforeEach(() => {
    usuarioCreateMock.mockReset();
    perfilMunicipioCreateMock.mockReset();
    transactionMock.mockReset();

    usuarioCreateMock.mockResolvedValue({
      id: 'municipio-1',
      email: 'municipio.pringles@ejemplo.test',
      estadoVerificacion: 'verificado',
    });
    perfilMunicipioCreateMock.mockResolvedValue({
      nombreInstitucional: 'Municipalidad de Coronel Pringles — Zoonosis',
    });

    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        usuario: { create: usuarioCreateMock },
        perfilMunicipio: { create: perfilMunicipioCreateMock },
      }),
    );
  });

  it('crea usuarios (rol_id=3, estado_verificacion=verificado) y perfiles_municipio en una única transacción', async () => {
    const repo = new PrismaMunicipioRepositorio();

    const perfil = await repo.crear({
      id: 'municipio-1',
      email: 'municipio.pringles@ejemplo.test',
      nombreInstitucional: 'Municipalidad de Coronel Pringles — Zoonosis',
    });

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(usuarioCreateMock).toHaveBeenCalledWith({
      data: {
        id: 'municipio-1',
        email: 'municipio.pringles@ejemplo.test',
        passwordHash: 'gestionado_por_supabase_auth',
        rolId: 3,
        estadoVerificacion: 'verificado',
      },
      select: { id: true, email: true, estadoVerificacion: true },
    });
    expect(perfilMunicipioCreateMock).toHaveBeenCalledWith({
      data: {
        usuarioId: 'municipio-1',
        nombreInstitucional: 'Municipalidad de Coronel Pringles — Zoonosis',
        verificadoEn: expect.any(Date),
      },
      select: { nombreInstitucional: true },
    });

    expect(perfil).toEqual({
      usuarioId: 'municipio-1',
      email: 'municipio.pringles@ejemplo.test',
      nombreInstitucional: 'Municipalidad de Coronel Pringles — Zoonosis',
      estadoVerificacion: 'verificado',
    });
  });

  it('propaga el error de la transacción sin capturarlo (el caso de uso decide el mapeo de errores)', async () => {
    transactionMock.mockRejectedValue(new Error('conflicto de unicidad simulado'));
    const repo = new PrismaMunicipioRepositorio();

    await expect(
      repo.crear({ id: 'municipio-1', email: 'municipio.pringles@ejemplo.test', nombreInstitucional: 'X' }),
    ).rejects.toThrow('conflicto de unicidad simulado');
  });
});
