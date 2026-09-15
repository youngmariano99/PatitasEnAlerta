import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { CuestionarioAdoptante, DatosCuestionarioAdoptante } from '@dominio/entidades/CuestionarioAdoptante';
import type { IRepositorioCuestionariosAdoptante } from '@dominio/puertos/IRepositorioCuestionariosAdoptante';

const SELECT_CUESTIONARIO = {
  id: true,
  usuarioId: true,
  horasSoloEstimadas: true,
  presenciaNinos: true,
  espacioDisponible: true,
  experienciaPrevia: true,
  createdAt: true,
  updatedAt: true,
} as const;

@injectable()
export class PrismaCuestionarioAdoptanteRepositorio implements IRepositorioCuestionariosAdoptante {
  async obtenerPropio(usuarioId: string): Promise<CuestionarioAdoptante | null> {
    return prisma.cuestionarioAdoptante.findFirst({
      where: { usuarioId, deletedAt: null },
      select: SELECT_CUESTIONARIO,
    });
  }

  async crear(usuarioId: string, datos: DatosCuestionarioAdoptante): Promise<CuestionarioAdoptante> {
    return prisma.cuestionarioAdoptante.create({
      data: { usuarioId, ...datos },
      select: SELECT_CUESTIONARIO,
    });
  }

  async actualizar(id: string, datos: DatosCuestionarioAdoptante): Promise<CuestionarioAdoptante> {
    return prisma.cuestionarioAdoptante.update({
      where: { id },
      data: datos,
      select: SELECT_CUESTIONARIO,
    });
  }
}
