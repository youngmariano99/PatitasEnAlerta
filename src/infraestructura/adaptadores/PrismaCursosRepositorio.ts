import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  Curso,
  DatosCurso,
  IRepositorioCursos,
  PaginaCursos,
} from '@dominio/puertos/IRepositorioCursos';

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

  async listar(pagina: number, porPagina: number): Promise<PaginaCursos> {
    const [items, total] = await Promise.all([
      prisma.curso.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_CURSO,
      }),
      prisma.curso.count(),
    ]);
    return { items, total, pagina, porPagina };
  }
}
