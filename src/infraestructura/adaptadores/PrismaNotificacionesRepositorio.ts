import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosNotificacion,
  INotificacionesRepositorio,
  NotificacionListada,
  PaginaNotificaciones,
} from '@dominio/puertos/INotificacionesRepositorio';

@injectable()
export class PrismaNotificacionesRepositorio implements INotificacionesRepositorio {
  async crear(datos: DatosNotificacion): Promise<void> {
    await prisma.notificacion.create({
      data: {
        usuarioId: datos.usuarioId,
        tipo: datos.tipo,
        referenciaTabla: datos.referenciaTabla,
        referenciaId: datos.referenciaId,
      },
    });
  }

  async listarPorUsuario(usuarioId: string, pagina: number, porPagina: number): Promise<PaginaNotificaciones> {
    const where = { usuarioId };

    const [filas, total, noLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: { id: true, tipo: true, referenciaTabla: true, referenciaId: true, leido: true, createdAt: true },
      }),
      prisma.notificacion.count({ where }),
      prisma.notificacion.count({ where: { usuarioId, leido: false } }),
    ]);

    const items: NotificacionListada[] = filas;
    return { items, total, pagina, porPagina, noLeidas };
  }

  async marcarComoLeida(id: string, usuarioId: string): Promise<boolean> {
    // updateMany (no update): con `usuarioId` en el WHERE, una notificación
    // ajena da count=0 en vez de lanzar — nunca hay que "buscar primero para
    // saber si es tuya" (esa carrera es justo lo que RepositorioProxy evita
    // en otras entidades).
    const resultado = await prisma.notificacion.updateMany({
      where: { id, usuarioId },
      data: { leido: true },
    });

    return resultado.count > 0;
  }
}
