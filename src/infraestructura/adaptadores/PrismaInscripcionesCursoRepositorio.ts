import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { IRepositorioInscripcionesCurso, InscripcionCurso } from '@dominio/puertos/IRepositorioInscripcionesCurso';

@injectable()
export class PrismaInscripcionesCursoRepositorio implements IRepositorioInscripcionesCurso {
  async crear(cursoId: string, usuarioId: string): Promise<InscripcionCurso> {
    return prisma.inscripcionCurso.create({
      data: { cursoId, usuarioId },
      select: { id: true, cursoId: true, usuarioId: true, inscritoEn: true },
    });
  }

  async darDeBaja(cursoId: string, usuarioId: string): Promise<boolean> {
    const resultado = await prisma.inscripcionCurso.deleteMany({ where: { cursoId, usuarioId } });
    return resultado.count > 0;
  }
}
