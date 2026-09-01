import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { DatosNuevoTurno, IRepositorioTurnos, TurnoGenerado } from '@dominio/puertos/IRepositorioTurnos';

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
}
