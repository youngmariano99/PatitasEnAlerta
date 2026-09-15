import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { Comercio, DatosComercio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';

const SELECT_COMERCIO = {
  id: true,
  usuarioId: true,
  nombreComercio: true,
  tipoComercio: true,
  direccion: true,
  latitud: true,
  longitud: true,
  estadoVerificacion: true,
  createdAt: true,
} as const;

@injectable()
export class PrismaComercioRepositorio implements IRepositorioComercios {
  async crear(usuarioId: string, datos: DatosComercio): Promise<Comercio> {
    return prisma.comercio.create({
      data: { usuarioId, ...datos },
      select: SELECT_COMERCIO,
    });
  }
}
