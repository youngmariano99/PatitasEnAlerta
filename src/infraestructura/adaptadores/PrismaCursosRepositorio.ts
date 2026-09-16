import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { Curso, DatosCurso, IRepositorioCursos } from '@dominio/puertos/IRepositorioCursos';

const SELECT_CURSO = {
  id: true,
  publicadoPor: true,
  titulo: true,
  descripcion: true,
  contenidoUrl: true,
  createdAt: true,
} as const;

@injectable()
export class PrismaCursosRepositorio implements IRepositorioCursos {
  async crear(publicadoPor: string, datos: DatosCurso): Promise<Curso> {
    return prisma.curso.create({
      data: { publicadoPor, ...datos },
      select: SELECT_CURSO,
    });
  }
}
