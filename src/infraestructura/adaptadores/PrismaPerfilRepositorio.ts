import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

@injectable()
export class PrismaPerfilRepositorio implements IRepositorioPerfil {
  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    const fila = await prisma.usuario.findFirst({
      where: { id: usuarioId, deletedAt: null },
      select: {
        id: true,
        email: true,
        estadoVerificacion: true,
        rol: { select: { nombre: true } },
        perfilVeterinario: { select: { verificadoEn: true } },
      },
    });

    if (!fila) return null;

    return {
      id: fila.id,
      email: fila.email,
      rol: fila.rol.nombre,
      estadoVerificacion: fila.estadoVerificacion,
      verificadoEn: fila.perfilVeterinario?.verificadoEn ?? null,
    };
  }
}
