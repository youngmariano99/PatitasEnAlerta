import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  ColaboracionActual,
  ColaboracionEstadoActualizado,
  HistorialEstadoColaboracionItem,
  IRepositorioColaboraciones,
} from '@dominio/puertos/IRepositorioColaboraciones';

@injectable()
export class PrismaColaboracionesRepositorio implements IRepositorioColaboraciones {
  async obtenerActual(colaboracionId: string): Promise<ColaboracionActual | null> {
    const colaboracion = await prisma.colaboracion.findFirst({
      where: { id: colaboracionId, deletedAt: null },
      select: { estado: true, stakeholderId: true, solicitudId: true },
    });
    if (!colaboracion) {
      return null;
    }

    // Dos consultas en vez de una relación Prisma entre Colaboracion y
    // SolicitudRecurso (que hubiera requerido modificar el modelo
    // SolicitudRecurso de un ticket previo, fuera del alcance de esta
    // actividad — ver docs/DECISIONES.md). La FK `solicitud_id` garantiza
    // que la solicitud existe: si esto lanzara, sería una violación de
    // integridad referencial, no un caso de negocio a manejar acá.
    const solicitud = await prisma.solicitudRecurso.findUniqueOrThrow({
      where: { id: colaboracion.solicitudId },
      select: { organizacionId: true },
    });

    return {
      estado: colaboracion.estado,
      organizacionId: solicitud.organizacionId,
      stakeholderId: colaboracion.stakeholderId,
    };
  }

  async actualizarEstado(colaboracionId: string, estadoNuevo: string, actualizadoPor: string): Promise<ColaboracionEstadoActualizado> {
    return prisma.$transaction(async (tx) => {
      // Re-lee el estado DENTRO de la transacción (no confía en el que
      // ActualizarEstadoColaboracionCommand.ts ya validó afuera) — mismo
      // criterio que PrismaReporteRepositorio.actualizarEstado.
      const actual = await tx.colaboracion.findFirstOrThrow({
        where: { id: colaboracionId, deletedAt: null },
        select: { estado: true },
      });

      await tx.colaboracion.update({ where: { id: colaboracionId }, data: { estado: estadoNuevo } });
      await tx.colaboracionHistorialEstado.create({
        data: {
          colaboracionId,
          estadoAnterior: actual.estado,
          estadoNuevo,
          usuarioId: actualizadoPor,
        },
      });

      return { id: colaboracionId, estado: estadoNuevo, estadoAnterior: actual.estado };
    });
  }

  async listarHistorialEstado(colaboracionId: string): Promise<HistorialEstadoColaboracionItem[]> {
    const filas = await prisma.colaboracionHistorialEstado.findMany({
      where: { colaboracionId },
      orderBy: { registradoEn: 'asc' },
      select: { id: true, estadoAnterior: true, estadoNuevo: true, usuarioId: true, registradoEn: true },
    });
    return filas;
  }
}
