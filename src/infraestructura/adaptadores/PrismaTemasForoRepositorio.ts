import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosTemaForo,
  IRepositorioTemasForo,
  PaginaTemasForo,
  RespuestaForo,
  TemaForo,
  TemaForoActual,
} from '@dominio/puertos/IRepositorioTemasForo';

const SELECT_TEMA = {
  id: true,
  creadoPor: true,
  titulo: true,
  contenido: true,
  createdAt: true,
} as const;

const SELECT_RESPUESTA = {
  id: true,
  temaId: true,
  usuarioId: true,
  contenido: true,
  createdAt: true,
} as const;

@injectable()
export class PrismaTemasForoRepositorio implements IRepositorioTemasForo {
  async crear(creadoPor: string, datos: DatosTemaForo): Promise<TemaForo> {
    return prisma.temaForo.create({
      data: { creadoPor, ...datos },
      select: SELECT_TEMA,
    });
  }

  async obtenerActual(id: string): Promise<TemaForoActual | null> {
    const tema = await prisma.temaForo.findUnique({
      where: { id },
      select: { id: true, creadoPor: true, deletedAt: true },
    });
    if (!tema) return null;
    return { id: tema.id, creadoPor: tema.creadoPor, moderado: tema.deletedAt !== null };
  }

  async actualizar(id: string, creadoPor: string, datos: DatosTemaForo): Promise<TemaForo | null> {
    const resultado = await prisma.temaForo.updateMany({
      where: { id, creadoPor, deletedAt: null },
      data: datos,
    });
    if (resultado.count === 0) return null;

    // `updateMany` no devuelve la fila actualizada — se vuelve a leer, mismo
    // criterio que `PrismaProductosComercioRepositorio.actualizar`.
    return prisma.temaForo.findUniqueOrThrow({ where: { id }, select: SELECT_TEMA });
  }

  async moderar(id: string): Promise<boolean> {
    const resultado = await prisma.temaForo.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return resultado.count > 0;
  }

  async listar(pagina: number, porPagina: number): Promise<PaginaTemasForo> {
    const where = { deletedAt: null };

    const [items, total] = await Promise.all([
      prisma.temaForo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_TEMA,
      }),
      prisma.temaForo.count({ where }),
    ]);

    return { items, total, pagina, porPagina };
  }

  async listarRespuestas(temaId: string): Promise<RespuestaForo[]> {
    // `ix_respuestas_tema` (docs/SCHEMA.md) cubre exactamente este filtro.
    return prisma.respuestaForo.findMany({
      where: { temaId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: SELECT_RESPUESTA,
    });
  }
}
