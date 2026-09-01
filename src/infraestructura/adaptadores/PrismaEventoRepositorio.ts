import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosNuevoEvento,
  EventoListado,
  FiltrosListadoEventos,
  IRepositorioEventos,
  PaginaEventos,
} from '@dominio/puertos/IRepositorioEventos';
import type { DatosEvento } from '@dominio/entidades/Evento';
import { Evento } from '@dominio/entidades/Evento';

const SELECT_EVENTO = {
  id: true,
  municipioId: true,
  titulo: true,
  tipo: true,
  direccion: true,
  latitud: true,
  longitud: true,
  fecha: true,
  cuposTotales: true,
  requisitos: true,
  createdAt: true,
} as const;

const SELECT_EVENTO_LISTADO = {
  id: true,
  municipioId: true,
  titulo: true,
  tipo: true,
  direccion: true,
  latitud: true,
  longitud: true,
  fecha: true,
  cuposTotales: true,
  requisitos: true,
} as const;

@injectable()
export class PrismaEventoRepositorio implements IRepositorioEventos {
  async crear(datos: DatosNuevoEvento): Promise<Evento> {
    const creado = await prisma.evento.create({
      data: {
        municipioId: datos.municipioId,
        titulo: datos.titulo,
        tipo: datos.tipo,
        direccion: datos.direccion,
        latitud: datos.latitud,
        longitud: datos.longitud,
        fecha: datos.fecha,
        cuposTotales: datos.cuposTotales,
        requisitos: datos.requisitos,
      },
      select: SELECT_EVENTO,
    });

    const entidad: DatosEvento = {
      municipioId: creado.municipioId,
      titulo: creado.titulo,
      tipo: creado.tipo,
      direccion: creado.direccion,
      latitud: creado.latitud,
      longitud: creado.longitud,
      fecha: creado.fecha,
      cuposTotales: creado.cuposTotales,
      requisitos: creado.requisitos,
    };
    return Evento.reconstruir(creado.id, entidad, creado.createdAt);
  }

  async listar(filtros: FiltrosListadoEventos, pagina: number, porPagina: number): Promise<PaginaEventos> {
    const where = {
      deletedAt: null,
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.fechaDesde || filtros.fechaHasta
        ? { fecha: { gte: filtros.fechaDesde, lte: filtros.fechaHasta } }
        : {}),
    };

    const [filas, total] = await Promise.all([
      prisma.evento.findMany({
        where,
        orderBy: { fecha: 'asc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_EVENTO_LISTADO,
      }),
      prisma.evento.count({ where }),
    ]);

    const items: EventoListado[] = filas;
    return { items, total, pagina, porPagina };
  }
}
