import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { DatosNuevoEvento, IRepositorioEventos } from '@dominio/puertos/IRepositorioEventos';
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
}
