import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { INotificacionesRepositorio, DatosNotificacion } from '@dominio/puertos/INotificacionesRepositorio';

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
}
