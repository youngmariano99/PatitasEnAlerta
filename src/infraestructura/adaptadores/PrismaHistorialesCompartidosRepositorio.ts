import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosCompartirHistorial,
  HistorialCompartido,
  IRepositorioHistorialesCompartidos,
} from '@dominio/puertos/IRepositorioHistorialesCompartidos';

const SELECT_HISTORIAL = {
  id: true,
  mascotaId: true,
  veterinarioOrigenId: true,
  veterinarioDestinoId: true,
  autorizadoEn: true,
  revocadoEn: true,
} as const;

@injectable()
export class PrismaHistorialesCompartidosRepositorio implements IRepositorioHistorialesCompartidos {
  async crear(datos: DatosCompartirHistorial): Promise<HistorialCompartido> {
    return prisma.historialCompartido.create({
      data: datos,
      select: SELECT_HISTORIAL,
    });
  }

  async obtenerActual(id: string): Promise<HistorialCompartido | null> {
    return prisma.historialCompartido.findUnique({
      where: { id },
      select: SELECT_HISTORIAL,
    });
  }

  async revocar(id: string, veterinarioOrigenId: string): Promise<HistorialCompartido | null> {
    const actual = await prisma.historialCompartido.findFirst({
      where: { id, veterinarioOrigenId, revocadoEn: null },
      select: SELECT_HISTORIAL,
    });
    if (!actual) return null;

    const revocadoEn = new Date();
    // updateMany (no update): repite el WHERE de la lectura anterior como
    // defensa ante una carrera (dos revocaciones concurrentes) — mismo
    // criterio que PrismaAutorizacionesLibretaRepositorio.revocar.
    const resultado = await prisma.historialCompartido.updateMany({
      where: { id, veterinarioOrigenId, revocadoEn: null },
      data: { revocadoEn },
    });
    if (resultado.count === 0) return null;

    return { ...actual, revocadoEn };
  }
}
