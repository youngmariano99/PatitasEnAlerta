/**
 * @jest-environment node
 */
import { PrismaVerificacionesRepositorio } from '@infraestructura/adaptadores/PrismaVerificacionesRepositorio';
import { VerificacionYaResueltaError } from '@dominio/errores/erroresVerificaciones';

const verificacionFindManyMock = jest.fn();
const verificacionCountMock = jest.fn();
const verificacionFindUniqueMock = jest.fn();
const verificacionUpdateMock = jest.fn();
const usuarioUpdateMock = jest.fn();
const perfilVeterinarioUpdateMock = jest.fn();
const perfilMunicipioUpdateMock = jest.fn();
const transactionMock = jest.fn();

jest.mock('@infraestructura/adaptadores/prisma-client', () => ({
  prisma: {
    verificacion: {
      findMany: (...args: unknown[]) => verificacionFindManyMock(...args),
      count: (...args: unknown[]) => verificacionCountMock(...args),
    },
    $transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

describe('PrismaVerificacionesRepositorio', () => {
  beforeEach(() => {
    verificacionFindManyMock.mockReset();
    verificacionCountMock.mockReset();
    verificacionFindUniqueMock.mockReset();
    verificacionUpdateMock.mockReset();
    usuarioUpdateMock.mockReset();
    perfilVeterinarioUpdateMock.mockReset();
    perfilMunicipioUpdateMock.mockReset();
    transactionMock.mockReset();
    transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        verificacion: { findUnique: verificacionFindUniqueMock, update: verificacionUpdateMock },
        usuario: { update: usuarioUpdateMock },
        perfilVeterinario: { update: perfilVeterinarioUpdateMock },
        perfilMunicipio: { update: perfilMunicipioUpdateMock },
      }),
    );
  });

  describe('listarPendientes', () => {
    it('pagina, ordena por created_at ascendente y filtra estado=pendiente', async () => {
      verificacionFindManyMock.mockResolvedValue([
        {
          id: 'v1',
          usuarioId: 'vet-1',
          tipo: 'veterinario',
          createdAt: new Date('2024-01-01'),
          usuario: { email: 'vet1@ejemplo.test', perfilVeterinario: { matricula: 'MP-1', colegioEmisor: 'Colegio X' }, perfilMunicipio: null },
        },
      ]);
      verificacionCountMock.mockResolvedValue(1);
      const repo = new PrismaVerificacionesRepositorio();

      const pagina = await repo.listarPendientes(1, 50);

      expect(verificacionFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { estado: 'pendiente' },
          orderBy: { createdAt: 'asc' },
          skip: 0,
          take: 50,
        }),
      );
      expect(pagina).toEqual({
        items: [
          {
            id: 'v1',
            usuarioId: 'vet-1',
            tipo: 'veterinario',
            email: 'vet1@ejemplo.test',
            createdAt: new Date('2024-01-01'),
            matricula: 'MP-1',
            colegioEmisor: 'Colegio X',
            nombreInstitucional: null,
          },
        ],
        total: 1,
        pagina: 1,
        porPagina: 50,
      });
    });

    it('calcula el offset a partir de la página pedida', async () => {
      verificacionFindManyMock.mockResolvedValue([]);
      verificacionCountMock.mockResolvedValue(0);
      const repo = new PrismaVerificacionesRepositorio();

      await repo.listarPendientes(3, 20);

      expect(verificacionFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
    });
  });

  describe('listarResueltas', () => {
    it('pagina, ordena por resuelto_en descendente y filtra estado <> pendiente (veterinario)', async () => {
      verificacionFindManyMock.mockResolvedValue([
        {
          id: 'v1',
          usuarioId: 'vet-1',
          tipo: 'veterinario',
          estado: 'aprobado',
          motivoRechazo: null,
          revisadoPor: 'admin-1',
          resueltoEn: new Date('2024-02-01'),
          createdAt: new Date('2024-01-01'),
          usuario: { email: 'vet1@ejemplo.test', perfilVeterinario: { matricula: 'MP-1', colegioEmisor: 'Colegio X' }, perfilMunicipio: null },
        },
      ]);
      verificacionCountMock.mockResolvedValue(1);
      const repo = new PrismaVerificacionesRepositorio();

      const pagina = await repo.listarResueltas(1, 50);

      expect(verificacionFindManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { estado: { not: 'pendiente' } },
          orderBy: { resueltoEn: 'desc' },
          skip: 0,
          take: 50,
        }),
      );
      expect(pagina).toEqual({
        items: [
          {
            id: 'v1',
            usuarioId: 'vet-1',
            tipo: 'veterinario',
            email: 'vet1@ejemplo.test',
            estado: 'aprobado',
            motivoRechazo: null,
            revisadoPor: 'admin-1',
            resueltoEn: new Date('2024-02-01'),
            createdAt: new Date('2024-01-01'),
            matricula: 'MP-1',
            colegioEmisor: 'Colegio X',
            nombreInstitucional: null,
          },
        ],
        total: 1,
        pagina: 1,
        porPagina: 50,
      });
    });

    it('mapea una fila rechazada de un municipio, incluyendo el motivo de rechazo', async () => {
      verificacionFindManyMock.mockResolvedValue([
        {
          id: 'v2',
          usuarioId: 'municipio-1',
          tipo: 'municipio',
          estado: 'rechazado',
          motivoRechazo: 'Documentación incompleta',
          revisadoPor: 'admin-2',
          resueltoEn: new Date('2024-03-01'),
          createdAt: new Date('2024-02-15'),
          usuario: { email: 'municipio1@ejemplo.test', perfilVeterinario: null, perfilMunicipio: { nombreInstitucional: 'Municipio de Pringles' } },
        },
      ]);
      verificacionCountMock.mockResolvedValue(1);
      const repo = new PrismaVerificacionesRepositorio();

      const pagina = await repo.listarResueltas(1, 50);

      expect(pagina.items[0]).toEqual({
        id: 'v2',
        usuarioId: 'municipio-1',
        tipo: 'municipio',
        email: 'municipio1@ejemplo.test',
        estado: 'rechazado',
        motivoRechazo: 'Documentación incompleta',
        revisadoPor: 'admin-2',
        resueltoEn: new Date('2024-03-01'),
        createdAt: new Date('2024-02-15'),
        matricula: null,
        colegioEmisor: null,
        nombreInstitucional: 'Municipio de Pringles',
      });
    });

    it('calcula el offset a partir de la página pedida', async () => {
      verificacionFindManyMock.mockResolvedValue([]);
      verificacionCountMock.mockResolvedValue(0);
      const repo = new PrismaVerificacionesRepositorio();

      await repo.listarResueltas(3, 20);

      expect(verificacionFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ skip: 40, take: 20 }));
    });
  });

  describe('resolver', () => {
    it('rechaza (PEA-AUTH-013) si la verificación ya no está pendiente, sin tocar usuarios/perfiles', async () => {
      verificacionFindUniqueMock.mockResolvedValue({ id: 'v1', usuarioId: 'vet-1', tipo: 'veterinario', estado: 'aprobado' });
      const repo = new PrismaVerificacionesRepositorio();

      await expect(
        repo.resolver({ verificacionId: 'v1', administradorId: 'admin-1', decision: 'aprobado', motivoRechazo: null }),
      ).rejects.toBeInstanceOf(VerificacionYaResueltaError);
      expect(verificacionUpdateMock).not.toHaveBeenCalled();
      expect(usuarioUpdateMock).not.toHaveBeenCalled();
    });

    it('rechaza (PEA-AUTH-013) si la verificación no existe', async () => {
      verificacionFindUniqueMock.mockResolvedValue(null);
      const repo = new PrismaVerificacionesRepositorio();

      await expect(
        repo.resolver({ verificacionId: 'inexistente', administradorId: 'admin-1', decision: 'aprobado', motivoRechazo: null }),
      ).rejects.toBeInstanceOf(VerificacionYaResueltaError);
    });

    it('al aprobar un veterinario: actualiza la verificación, usuarios.estado_verificacion y perfiles_veterinario.verificado_en', async () => {
      verificacionFindUniqueMock.mockResolvedValue({ id: 'v1', usuarioId: 'vet-1', tipo: 'veterinario', estado: 'pendiente' });
      const repo = new PrismaVerificacionesRepositorio();

      const resultado = await repo.resolver({
        verificacionId: 'v1',
        administradorId: 'admin-1',
        decision: 'aprobado',
        motivoRechazo: null,
      });

      expect(verificacionUpdateMock).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { estado: 'aprobado', motivoRechazo: null, revisadoPor: 'admin-1', resueltoEn: expect.any(Date) },
      });
      expect(usuarioUpdateMock).toHaveBeenCalledWith({ where: { id: 'vet-1' }, data: { estadoVerificacion: 'verificado' } });
      expect(perfilVeterinarioUpdateMock).toHaveBeenCalledWith({
        where: { usuarioId: 'vet-1' },
        data: { verificadoEn: expect.any(Date) },
      });
      expect(perfilMunicipioUpdateMock).not.toHaveBeenCalled();
      expect(resultado).toEqual({ verificacionId: 'v1', usuarioId: 'vet-1', tipo: 'veterinario', estado: 'aprobado' });
    });

    it('al aprobar un municipio: actualiza perfiles_municipio.verificado_en, no perfiles_veterinario', async () => {
      verificacionFindUniqueMock.mockResolvedValue({ id: 'v2', usuarioId: 'municipio-1', tipo: 'municipio', estado: 'pendiente' });
      const repo = new PrismaVerificacionesRepositorio();

      await repo.resolver({ verificacionId: 'v2', administradorId: 'admin-1', decision: 'aprobado', motivoRechazo: null });

      expect(perfilMunicipioUpdateMock).toHaveBeenCalledWith({
        where: { usuarioId: 'municipio-1' },
        data: { verificadoEn: expect.any(Date) },
      });
      expect(perfilVeterinarioUpdateMock).not.toHaveBeenCalled();
    });

    it('al rechazar: actualiza usuarios.estado_verificacion=rechazado y guarda el motivo, sin tocar el perfil', async () => {
      verificacionFindUniqueMock.mockResolvedValue({ id: 'v1', usuarioId: 'vet-1', tipo: 'veterinario', estado: 'pendiente' });
      const repo = new PrismaVerificacionesRepositorio();

      await repo.resolver({
        verificacionId: 'v1',
        administradorId: 'admin-1',
        decision: 'rechazado',
        motivoRechazo: 'Matrícula no encontrada',
      });

      expect(verificacionUpdateMock).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { estado: 'rechazado', motivoRechazo: 'Matrícula no encontrada', revisadoPor: 'admin-1', resueltoEn: expect.any(Date) },
      });
      expect(usuarioUpdateMock).toHaveBeenCalledWith({ where: { id: 'vet-1' }, data: { estadoVerificacion: 'rechazado' } });
      expect(perfilVeterinarioUpdateMock).not.toHaveBeenCalled();
    });
  });
});
