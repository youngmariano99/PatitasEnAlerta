import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  ColaboracionActual,
  ColaboracionEstadoActualizado,
  ColaboracionPropuesta,
  DatosNuevaColaboracion,
  HistorialEstadoColaboracionItem,
  IRepositorioColaboraciones,
  MetricasColaboracionPropias,
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

  async existePropuestaDe(solicitudId: string, stakeholderId: string): Promise<boolean> {
    const existente = await prisma.colaboracion.findFirst({
      where: { solicitudId, stakeholderId, deletedAt: null },
      select: { id: true },
    });
    return existente !== null;
  }

  async crear(datos: DatosNuevaColaboracion): Promise<ColaboracionPropuesta> {
    const creada = await prisma.colaboracion.create({
      data: { solicitudId: datos.solicitudId, stakeholderId: datos.stakeholderId },
      select: { id: true, solicitudId: true, stakeholderId: true, estado: true, createdAt: true },
    });

    // Misma resolución en dos consultas secuenciales que obtenerActual() de
    // acá arriba — sin relación Prisma Colaboracion→SolicitudRecurso
    // (docs/DECISIONES.md, decisión "Vista de seguimiento de colaboraciones").
    const solicitud = await prisma.solicitudRecurso.findUniqueOrThrow({
      where: { id: creada.solicitudId },
      select: { organizacionId: true },
    });

    return {
      id: creada.id,
      solicitudId: creada.solicitudId,
      stakeholderId: creada.stakeholderId,
      organizacionId: solicitud.organizacionId,
      estado: creada.estado,
      createdAt: creada.createdAt,
    };
  }

  async obtenerMetricasPropias(stakeholderId: string): Promise<MetricasColaboracionPropias> {
    // Filtro por stakeholder_id SIEMPRE presente en el WHERE — verificación
    // técnica del ticket "Métricas personales de contribución": nunca hay
    // forma de que esta consulta devuelva filas de otro usuario.
    const completadas = await prisma.colaboracion.findMany({
      where: { stakeholderId, estado: 'completada', deletedAt: null },
      select: { solicitudId: true },
    });
    if (completadas.length === 0) {
      return { totalCompletadas: 0, porTipo: {} };
    }

    // Mismo criterio de dos consultas secuenciales que obtenerActual()/crear()
    // de acá arriba — sin relación Prisma Colaboracion→SolicitudRecurso.
    const solicitudes = await prisma.solicitudRecurso.findMany({
      where: { id: { in: completadas.map((c) => c.solicitudId) } },
      select: { id: true, tipo: true },
    });
    const tipoPorSolicitud = new Map(solicitudes.map((s) => [s.id, s.tipo]));

    const porTipo: Record<string, number> = {};
    for (const { solicitudId } of completadas) {
      const tipo = tipoPorSolicitud.get(solicitudId) ?? 'desconocido';
      porTipo[tipo] = (porTipo[tipo] ?? 0) + 1;
    }

    return { totalCompletadas: completadas.length, porTipo };
  }
}
