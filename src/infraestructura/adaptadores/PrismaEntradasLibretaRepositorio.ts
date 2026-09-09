import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosEntradaLibreta,
  EntradaLibretaPersistida,
  IRepositorioEntradasLibreta,
  PaginaEntradasLibreta,
  TipoEntradaLibreta,
} from '@dominio/puertos/IRepositorioEntradasLibreta';

const SELECT_ENTRADA = {
  id: true,
  mascotaId: true,
  veterinarioId: true,
  tipo: true,
  descripcion: true,
  fecha: true,
  createdAt: true,
} as const;

type FilaEntrada = {
  id: string;
  mascotaId: string;
  veterinarioId: string;
  tipo: string;
  descripcion: string;
  fecha: Date;
  createdAt: Date;
};

/** La columna es `DATE` (sin hora): Prisma la representa como `Date` a medianoche UTC. */
function fechaADate(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

function aEntrada(fila: FilaEntrada): EntradaLibretaPersistida {
  return {
    id: fila.id,
    mascotaId: fila.mascotaId,
    veterinarioId: fila.veterinarioId,
    tipo: fila.tipo as TipoEntradaLibreta,
    descripcion: fila.descripcion,
    fecha: fila.fecha.toISOString().slice(0, 10),
    createdAt: fila.createdAt,
  };
}

@injectable()
export class PrismaEntradasLibretaRepositorio implements IRepositorioEntradasLibreta {
  async crear(mascotaId: string, veterinarioId: string, datos: DatosEntradaLibreta): Promise<EntradaLibretaPersistida> {
    const fila = await prisma.entradaLibretaSanitaria.create({
      data: {
        mascotaId,
        veterinarioId,
        tipo: datos.tipo,
        descripcion: datos.descripcion,
        fecha: fechaADate(datos.fecha),
      },
      select: SELECT_ENTRADA,
    });
    return aEntrada(fila);
  }

  async listarPorMascota(mascotaId: string, pagina: number, porPagina: number): Promise<PaginaEntradasLibreta> {
    const where = { mascotaId, deletedAt: null };

    const [filas, total] = await Promise.all([
      prisma.entradaLibretaSanitaria.findMany({
        where,
        orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_ENTRADA,
      }),
      prisma.entradaLibretaSanitaria.count({ where }),
    ]);

    return { items: filas.map(aEntrada), total, pagina, porPagina };
  }
}
