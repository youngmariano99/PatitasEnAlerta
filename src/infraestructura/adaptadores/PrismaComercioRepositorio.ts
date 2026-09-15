import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { Comercio, ComercioPropio, DatosComercio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import type { FiltroZona } from '@dominio/puertos/IRepositorioReportes';

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

const ESTADO_VERIFICADO = 'verificado';

// Misma aproximación de "km por grado de latitud" que
// PrismaDirectorioAliadosRepositorio.calcularRangoGeografico (docs/SCHEMA.md
// no define PostGIS/Haversine exacto para este alcance single-tenant). No se
// extrae a un módulo compartido para no modificar esos archivos fuera del
// alcance de esta actividad — ver docs/DECISIONES.md.
const KM_POR_GRADO_LATITUD = 111;

function calcularRangoGeografico(zona: FiltroZona) {
  const deltaLatitud = zona.radioKm / KM_POR_GRADO_LATITUD;
  const kmPorGradoLongitud = KM_POR_GRADO_LATITUD * Math.cos((zona.latitud * Math.PI) / 180);
  const deltaLongitud = kmPorGradoLongitud > 0.001 ? zona.radioKm / kmPorGradoLongitud : 1;

  return {
    latitud: { gte: zona.latitud - deltaLatitud, lte: zona.latitud + deltaLatitud },
    longitud: { gte: zona.longitud - deltaLongitud, lte: zona.longitud + deltaLongitud },
  };
}

@injectable()
export class PrismaComercioRepositorio implements IRepositorioComercios {
  async crear(usuarioId: string, datos: DatosComercio): Promise<Comercio> {
    return prisma.comercio.create({
      data: { usuarioId, ...datos },
      select: SELECT_COMERCIO,
    });
  }

  async obtenerPropio(usuarioId: string): Promise<ComercioPropio | null> {
    return prisma.comercio.findFirst({
      where: { usuarioId, deletedAt: null },
      select: { id: true, estadoVerificacion: true },
    });
  }

  async listarVerificados(zona?: FiltroZona, textoLibre?: string): Promise<Comercio[]> {
    return prisma.comercio.findMany({
      where: {
        deletedAt: null,
        estadoVerificacion: ESTADO_VERIFICADO,
        ...(zona ? calcularRangoGeografico(zona) : {}),
        // Búsqueda por texto libre (Paso 1): siempre vía el filtro `contains`
        // de Prisma (parametrizado por el driver, nunca concatenado como
        // texto en la sentencia SQL), jamás `$queryRaw`.
        ...(textoLibre
          ? {
              OR: [
                { nombreComercio: { contains: textoLibre, mode: 'insensitive' as const } },
                { tipoComercio: { contains: textoLibre, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: SELECT_COMERCIO,
    });
  }
}
