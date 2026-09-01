import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosNuevoTurno,
  IRepositorioTurnos,
  PaginaTurnosPropios,
  TurnoActual,
  TurnoCancelado,
  TurnoGenerado,
  TurnoPropio,
  TurnoReprogramado,
  TurnoReservado,
} from '@dominio/puertos/IRepositorioTurnos';

/** Señal interna para forzar el rollback de `reprogramar` — nunca escapa del propio método (ver el `catch` al final). */
class PasoDeReprogramacionFallidoError extends Error {}

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
      select: { id: true, estado: true, version: true, reservadoPor: true, proveedorId: true },
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

  async listarPropios(reservadoPor: string, pagina: number, porPagina: number): Promise<PaginaTurnosPropios> {
    const where = { reservadoPor, deletedAt: null };

    const [filas, total] = await Promise.all([
      prisma.turno.findMany({
        where,
        orderBy: { franjaInicio: 'asc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: {
          id: true,
          proveedorTipo: true,
          proveedorId: true,
          eventoId: true,
          franjaInicio: true,
          franjaFin: true,
          estado: true,
          evento: { select: { titulo: true } },
        },
      }),
      prisma.turno.count({ where }),
    ]);

    const items: TurnoPropio[] = filas.map((fila) => ({
      id: fila.id,
      proveedorTipo: fila.proveedorTipo,
      proveedorId: fila.proveedorId,
      eventoId: fila.eventoId,
      eventoTitulo: fila.evento?.titulo ?? null,
      franjaInicio: fila.franjaInicio,
      franjaFin: fila.franjaFin,
      estado: fila.estado,
    }));

    return { items, total, pagina, porPagina };
  }

  async cancelar(turnoId: string, versionEsperada: number): Promise<TurnoCancelado | null> {
    const actual = await prisma.turno.findFirst({
      where: { id: turnoId, deletedAt: null },
      select: { reservadoPor: true, proveedorId: true },
    });
    if (!actual) return null;

    // `reservado_por` deliberadamente ausente de `data`: se conserva tal
    // cual (ver TurnoCancelado en el puerto) — nunca se limpia a `null`.
    const resultado = await prisma.turno.updateMany({
      where: { id: turnoId, estado: 'reservado', version: versionEsperada, deletedAt: null },
      data: { estado: 'cancelado', version: { increment: 1 } },
    });

    if (resultado.count === 0) return null;

    return {
      id: turnoId,
      estado: 'cancelado',
      reservadoPor: actual.reservadoPor,
      proveedorId: actual.proveedorId,
      version: versionEsperada + 1,
    };
  }

  async reprogramar(
    turnoActualId: string,
    turnoNuevoId: string,
    usuarioId: string,
    versionActualEsperada: number,
    versionNuevaEsperada: number,
  ): Promise<TurnoReprogramado | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        const actual = await tx.turno.findFirst({
          where: { id: turnoActualId, deletedAt: null },
          select: { reservadoPor: true, proveedorId: true },
        });
        if (!actual) throw new PasoDeReprogramacionFallidoError();

        const cancelacion = await tx.turno.updateMany({
          where: { id: turnoActualId, estado: 'reservado', version: versionActualEsperada, deletedAt: null },
          data: { estado: 'cancelado', version: { increment: 1 } },
        });
        if (cancelacion.count === 0) throw new PasoDeReprogramacionFallidoError();

        const reserva = await tx.turno.updateMany({
          where: { id: turnoNuevoId, estado: 'disponible', version: versionNuevaEsperada, deletedAt: null },
          data: { estado: 'reservado', reservadoPor: usuarioId, version: { increment: 1 } },
        });
        // Si este paso falla, lanzar acá revierte TAMBIÉN la cancelación de
        // arriba (misma transacción) — el turno actual nunca queda
        // cancelado sin que el nuevo haya quedado reservado (Paso 2,
        // "todo o nada").
        if (reserva.count === 0) throw new PasoDeReprogramacionFallidoError();

        return {
          turnoCancelado: {
            id: turnoActualId,
            estado: 'cancelado',
            reservadoPor: actual.reservadoPor,
            proveedorId: actual.proveedorId,
            version: versionActualEsperada + 1,
          },
          turnoReservado: {
            id: turnoNuevoId,
            estado: 'reservado',
            reservadoPor: usuarioId,
            version: versionNuevaEsperada + 1,
          },
        };
      });
    } catch (error) {
      if (error instanceof PasoDeReprogramacionFallidoError) return null;
      throw error;
    }
  }
}
