import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { DatosNuevaSolicitudRecurso, IRepositorioSolicitudesRecurso } from '@dominio/puertos/IRepositorioSolicitudesRecurso';
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
}
