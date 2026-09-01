import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  CriteriosCoincidenciaReporte,
  DatosNuevoReporte,
  FiltrosListadoReportes,
  FiltroZona,
  IRepositorioReportes,
  PaginaReportes,
  ReporteActivoResumen,
  ReporteListado,
} from '@dominio/puertos/IRepositorioReportes';
import type { DatosReporte } from '@dominio/entidades/Reporte';
import { ESTADOS_REPORTE_ACTIVOS, Reporte } from '@dominio/entidades/Reporte';

const SELECT_REPORTE = {
  id: true,
  tipo: true,
  subtipo: true,
  reportadoPor: true,
  mascotaId: true,
  descripcion: true,
  fotoUrl: true,
  latitud: true,
  longitud: true,
  especie: true,
  estado: true,
  createdAt: true,
} as const;

// Público (ListarReportes): sin `reportadoPor`/`mascotaId` — no forman parte
// de lo que la tabla/mapa público necesita mostrar (ver ReporteListado).
const SELECT_REPORTE_LISTADO = {
  id: true,
  tipo: true,
  subtipo: true,
  descripcion: true,
  fotoUrl: true,
  latitud: true,
  longitud: true,
  especie: true,
  estado: true,
  createdAt: true,
} as const;

type FilaReporte = {
  id: string;
  tipo: string;
  subtipo: string | null;
  reportadoPor: string;
  mascotaId: string | null;
  descripcion: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  especie: string | null;
  estado: string;
  createdAt: Date;
};

function aEntidad(fila: FilaReporte): Reporte {
  const datos: DatosReporte = {
    tipo: fila.tipo,
    subtipo: fila.subtipo,
    reportadoPor: fila.reportadoPor,
    mascotaId: fila.mascotaId,
    descripcion: fila.descripcion,
    fotoUrl: fila.fotoUrl,
    latitud: fila.latitud,
    longitud: fila.longitud,
    especie: fila.especie,
    estado: fila.estado,
  };
  return Reporte.reconstruir(fila.id, datos, fila.createdAt);
}

// Aproximación estándar de "km por grado de latitud" — suficiente para la
// "regla simple" de coincidencia del MVP (docs/PLANIFICACION.md, REP-U-06)
// y para el filtro de zona del listado público (ListarReportes); una
// precisión mayor (Haversine exacto, PostGIS) queda para si el matching
// semántico post-MVP la termina necesitando.
const KM_POR_GRADO_LATITUD = 111;

function calcularRangoGeografico(zona: FiltroZona) {
  const deltaLatitud = zona.radioKm / KM_POR_GRADO_LATITUD;
  const kmPorGradoLongitud = KM_POR_GRADO_LATITUD * Math.cos((zona.latitud * Math.PI) / 180);
  // Cerca de los polos kmPorGradoLongitud tiende a 0 — en ese caso, un grado
  // entero de longitud sigue siendo un rango razonable (fuera del alcance
  // real single-tenant del proyecto, pero evita una división por ~0 que
  // dispararía un rango absurdamente amplio).
  const deltaLongitud = kmPorGradoLongitud > 0.001 ? zona.radioKm / kmPorGradoLongitud : 1;

  return {
    latitud: { gte: zona.latitud - deltaLatitud, lte: zona.latitud + deltaLatitud },
    longitud: { gte: zona.longitud - deltaLongitud, lte: zona.longitud + deltaLongitud },
  };
}

@injectable()
export class PrismaReporteRepositorio implements IRepositorioReportes {
  async crear(datos: DatosNuevoReporte): Promise<Reporte> {
    const creado = await prisma.reporte.create({
      data: {
        tipo: datos.tipo,
        subtipo: datos.subtipo,
        reportadoPor: datos.reportadoPor,
        mascotaId: datos.mascotaId,
        descripcion: datos.descripcion,
        fotoUrl: datos.fotoUrl,
        latitud: datos.latitud,
        longitud: datos.longitud,
        especie: datos.especie,
        // `estado` no se envía: la columna nace en 'reportado' por DEFAULT
        // (docs/SCHEMA.md) — este repositorio nunca decide el estado inicial.
      },
      select: SELECT_REPORTE,
    });

    return aEntidad(creado);
  }

  async buscarPerdidosActivosPorZonaYEspecie(criterios: CriteriosCoincidenciaReporte): Promise<ReporteActivoResumen[]> {
    const filas = await prisma.reporte.findMany({
      where: {
        tipo: 'perdido',
        estado: { in: [...ESTADOS_REPORTE_ACTIVOS] },
        especie: { equals: criterios.especie, mode: 'insensitive' },
        ...calcularRangoGeografico(criterios),
        id: { not: criterios.excluirReporteId },
        deletedAt: null,
      },
      select: { id: true, reportadoPor: true },
    });

    return filas;
  }

  async listar(filtros: FiltrosListadoReportes, pagina: number, porPagina: number): Promise<PaginaReportes> {
    const where = {
      deletedAt: null,
      // Sin `estado` explícito: solo los activos — "Listado y mapa de
      // reportes activos" es el nombre de esta historia. Un `estado`
      // puntual (incluidos 'resuelto'/'cerrado') lo reemplaza por completo.
      estado: filtros.estado ?? { in: [...ESTADOS_REPORTE_ACTIVOS] },
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.zona ? calcularRangoGeografico(filtros.zona) : {}),
    };

    const [filas, total] = await Promise.all([
      prisma.reporte.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_REPORTE_LISTADO,
      }),
      prisma.reporte.count({ where }),
    ]);

    const items: ReporteListado[] = filas;
    return { items, total, pagina, porPagina };
  }
}
