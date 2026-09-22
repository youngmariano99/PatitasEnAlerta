import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { FiltroZona } from '@dominio/puertos/IRepositorioReportes';
import type {
  DatosNuevaSolicitudRecurso,
  IRepositorioSolicitudesRecurso,
  PaginaSolicitudesVeterinarias,
  SolicitudActual,
} from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { DatosSolicitudRecurso } from '@dominio/entidades/SolicitudRecurso';
import { SolicitudRecurso } from '@dominio/entidades/SolicitudRecurso';

const SELECT_SOLICITUD = {
  id: true,
  organizacionId: true,
  tipo: true,
  descripcion: true,
  reporteId: true,
  estado: true,
  createdAt: true,
} as const;

const TIPO_ASISTENCIA_VETERINARIA = 'asistencia_veterinaria';
const ESTADO_ABIERTA = 'abierta';

// Misma aproximación de "km por grado de latitud" que
// PrismaDirectorioAliadosRepositorio.calcularRangoGeografico (docs/SCHEMA.md
// no define PostGIS/Haversine exacto para este alcance single-tenant). No se
// extrae a un módulo compartido para no modificar ese archivo fuera del
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
export class PrismaSolicitudesRecursoRepositorio implements IRepositorioSolicitudesRecurso {
  async crear(datos: DatosNuevaSolicitudRecurso): Promise<SolicitudRecurso> {
    const creada = await prisma.solicitudRecurso.create({
      data: {
        organizacionId: datos.organizacionId,
        tipo: datos.tipo,
        descripcion: datos.descripcion,
        reporteId: datos.reporteId,
      },
      select: SELECT_SOLICITUD,
    });

    const entidad: DatosSolicitudRecurso = {
      organizacionId: creada.organizacionId,
      tipo: creada.tipo,
      descripcion: creada.descripcion,
      reporteId: creada.reporteId,
      estado: creada.estado,
    };
    return SolicitudRecurso.reconstruir(creada.id, entidad, creada.createdAt);
  }

  async obtenerActual(solicitudId: string): Promise<SolicitudActual | null> {
    const solicitud = await prisma.solicitudRecurso.findFirst({
      where: { id: solicitudId, deletedAt: null },
      select: { estado: true, organizacionId: true },
    });
    return solicitud;
  }

  async listarAsistenciaVeterinariaAbiertas(
    zona: FiltroZona | undefined,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaSolicitudesVeterinarias> {
    // `solicitudes_recurso` no tiene columna de ubicación propia: la zona se
    // resuelve sobre la organización dueña (`usuarios.latitud`/`longitud`,
    // migración `agrega_ubicacion_a_usuarios`) — sin relación Prisma
    // SolicitudRecurso→Usuario (no existe hoy, ver docs/DECISIONES.md), así
    // que se resuelve en dos consultas secuenciales, mismo criterio que
    // PrismaColaboracionesRepositorio.
    let organizacionIds: string[] | undefined;
    if (zona) {
      const organizaciones = await prisma.usuario.findMany({
        where: { ...calcularRangoGeografico(zona), deletedAt: null },
        select: { id: true },
      });
      organizacionIds = organizaciones.map((o) => o.id);
      if (organizacionIds.length === 0) {
        return { items: [], total: 0, pagina, porPagina };
      }
    }

    const where = {
      tipo: TIPO_ASISTENCIA_VETERINARIA,
      estado: ESTADO_ABIERTA,
      deletedAt: null,
      ...(organizacionIds ? { organizacionId: { in: organizacionIds } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.solicitudRecurso.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_SOLICITUD,
      }),
      prisma.solicitudRecurso.count({ where }),
    ]);

    return { items, total, pagina, porPagina };
  }

  async listarAbiertas(pagina: number, porPagina: number): Promise<PaginaSolicitudesVeterinarias> {
    const where = { estado: ESTADO_ABIERTA, deletedAt: null };

    const [items, total] = await Promise.all([
      prisma.solicitudRecurso.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_SOLICITUD,
      }),
      prisma.solicitudRecurso.count({ where }),
    ]);

    return { items, total, pagina, porPagina };
  }
}
