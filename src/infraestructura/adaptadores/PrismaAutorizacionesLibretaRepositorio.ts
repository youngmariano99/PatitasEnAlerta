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
}
