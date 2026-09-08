import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  AutorizacionLibretaPersistida,
  IRepositorioAutorizacionesLibreta,
} from '@dominio/puertos/IRepositorioAutorizacionesLibreta';

const SELECT_AUTORIZACION = {
  id: true,
  mascotaId: true,
  veterinarioId: true,
  otorgadaEn: true,
  revocadaEn: true,
} as const;

@injectable()
export class PrismaAutorizacionesLibretaRepositorio implements IRepositorioAutorizacionesLibreta {
  async obtenerActual(mascotaId: string, veterinarioId: string): Promise<AutorizacionLibretaPersistida | null> {
    // Sin filtro `revocadaEn: null`: el caso de uso necesita distinguir
    // "nunca autorizado" (null acá) de "autorización revocada" (fila con
    // `revocadaEn` no nulo) para elegir entre PEA-VET-003 y PEA-VET-004 —
    // `orderBy otorgadaEn desc` trae siempre el estado más reciente entre el
    // par (mascotaId, veterinarioId), aunque haya habido ciclos previos de
    // autorización/revocación.
    return prisma.autorizacionLibreta.findFirst({
      where: { mascotaId, veterinarioId },
      orderBy: { otorgadaEn: 'desc' },
      select: SELECT_AUTORIZACION,
    });
  }

  async crear(mascotaId: string, veterinarioId: string): Promise<AutorizacionLibretaPersistida> {
    return prisma.autorizacionLibreta.create({
      data: { mascotaId, veterinarioId },
      select: SELECT_AUTORIZACION,
    });
  }

  async revocar(mascotaId: string, veterinarioId: string): Promise<AutorizacionLibretaPersistida | null> {
    const actual = await prisma.autorizacionLibreta.findFirst({
      where: { mascotaId, veterinarioId, revocadaEn: null },
      select: SELECT_AUTORIZACION,
    });
    if (!actual) return null;

    const revocadaEn = new Date();
    // updateMany (no update): repite el `WHERE revocadaEn IS NULL` de la
    // lectura anterior como defensa ante una carrera (dos revocaciones
    // concurrentes del mismo par) — si otra ya la revocó entremedio, `count`
    // da 0 y esta llamada devuelve `null` en vez de pisar el `revocadaEn`
    // ya escrito, mismo criterio que `PrismaDisponibilidadRepositorio.eliminar`.
    const resultado = await prisma.autorizacionLibreta.updateMany({
      where: { mascotaId, veterinarioId, revocadaEn: null },
      data: { revocadaEn },
    });
    if (resultado.count === 0) return null;

    return { ...actual, revocadaEn };
  }

  async listarPorMascota(mascotaId: string): Promise<AutorizacionLibretaPersistida[]> {
    return prisma.autorizacionLibreta.findMany({
      where: { mascotaId },
      orderBy: { otorgadaEn: 'desc' },
      select: SELECT_AUTORIZACION,
    });
  }
}
