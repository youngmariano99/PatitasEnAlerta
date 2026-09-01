import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosNuevoTurno,
  IRepositorioTurnos,
  TurnoActual,
  TurnoGenerado,
  TurnoReservado,
} from '@dominio/puertos/IRepositorioTurnos';

const SELECT_TURNO = {
  id: true,
  proveedorTipo: true,
  proveedorId: true,
  eventoId: true,
  franjaInicio: true,
  franjaFin: true,
  estado: true,
} as const;

@injectable()
export class PrismaTurnoRepositorio implements IRepositorioTurnos {
  async contarDisponiblesPorEvento(eventoId: string): Promise<number> {
    return prisma.turno.count({ where: { eventoId, estado: 'disponible', deletedAt: null } });
  }

  async crearLote(turnos: DatosNuevoTurno[]): Promise<TurnoGenerado[]> {
    if (turnos.length === 0) return [];

    // Un `create` por turno dentro de una única transacción: `createMany`
    // no puede devolver las filas insertadas en esta versión de Prisma (sin
    // el preview feature `createManyAndReturn`), y GenerarTurnosEvento.ts sí
    // necesita esos ids/estado para el resultado que expone.
    return prisma.$transaction(
      turnos.map((turno) =>
        prisma.turno.create({
          data: {
            proveedorTipo: turno.proveedorTipo,
            proveedorId: turno.proveedorId,
            eventoId: turno.eventoId,
            franjaInicio: turno.franjaInicio,
            franjaFin: turno.franjaFin,
          },
          select: SELECT_TURNO,
        }),
      ),
    );
  }

  async obtenerActual(turnoId: string): Promise<TurnoActual | null> {
    const fila = await prisma.turno.findFirst({
      where: { id: turnoId, deletedAt: null },
      select: { id: true, estado: true, version: true },
    });
    return fila;
  }

  async reservar(turnoId: string, reservadoPor: string, versionEsperada: number): Promise<TurnoReservado | null> {
    // updateMany (no update): necesitamos el conteo de filas afectadas para
    // detectar la carrera (0 filas = alguien más ganó, docs/SCHEMA.md) sin
    // que Prisma lance una excepción por "registro no encontrado" — un
    // resultado de negocio esperado, no un error de sistema.
    const resultado = await prisma.turno.updateMany({
      where: { id: turnoId, estado: 'disponible', version: versionEsperada, deletedAt: null },
      data: { estado: 'reservado', reservadoPor, version: { increment: 1 } },
    });

    if (resultado.count === 0) return null;

    return { id: turnoId, estado: 'reservado', reservadoPor, version: versionEsperada + 1 };
  }
}
