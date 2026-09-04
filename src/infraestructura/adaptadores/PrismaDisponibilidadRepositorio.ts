import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosDisponibilidad,
  FranjaDisponibilidadPersistida,
  IRepositorioDisponibilidad,
} from '@dominio/puertos/IRepositorioDisponibilidad';

const SELECT_DISPONIBILIDAD = {
  id: true,
  veterinarioId: true,
  diaSemana: true,
  horaInicio: true,
  horaFin: true,
  activo: true,
  createdAt: true,
} as const;

type FilaDisponibilidad = {
  id: string;
  veterinarioId: string;
  diaSemana: number;
  horaInicio: Date;
  horaFin: Date;
  activo: boolean;
  createdAt: Date;
};

/** La columna es `TIME` (sin fecha): Prisma la representa como `Date` sobre el epoch UTC — 1970-01-01 + la hora/minuto real. */
function horaAFecha(hora: string): Date {
  return new Date(`1970-01-01T${hora}:00.000Z`);
}

function fechaAHora(fecha: Date): string {
  return fecha.toISOString().slice(11, 16);
}

function aFranja(fila: FilaDisponibilidad): FranjaDisponibilidadPersistida {
  return {
    id: fila.id,
    veterinarioId: fila.veterinarioId,
    diaSemana: fila.diaSemana,
    horaInicio: fechaAHora(fila.horaInicio),
    horaFin: fechaAHora(fila.horaFin),
    activo: fila.activo,
    createdAt: fila.createdAt,
  };
}

@injectable()
export class PrismaDisponibilidadRepositorio implements IRepositorioDisponibilidad {
  async crear(veterinarioId: string, datos: DatosDisponibilidad): Promise<FranjaDisponibilidadPersistida> {
    const fila = await prisma.disponibilidadVeterinario.create({
      data: {
        veterinarioId,
        diaSemana: datos.diaSemana,
        horaInicio: horaAFecha(datos.horaInicio),
        horaFin: horaAFecha(datos.horaFin),
        activo: datos.activo,
      },
      select: SELECT_DISPONIBILIDAD,
    });
    return aFranja(fila);
  }

  async obtenerActual(veterinarioId: string, diaSemana: number): Promise<FranjaDisponibilidadPersistida | null> {
    const fila = await prisma.disponibilidadVeterinario.findFirst({
      where: { veterinarioId, diaSemana, deletedAt: null },
      select: SELECT_DISPONIBILIDAD,
    });
    return fila ? aFranja(fila) : null;
  }

  async actualizar(id: string, datos: DatosDisponibilidad): Promise<FranjaDisponibilidadPersistida> {
    const fila = await prisma.disponibilidadVeterinario.update({
      where: { id },
      data: {
        diaSemana: datos.diaSemana,
        horaInicio: horaAFecha(datos.horaInicio),
        horaFin: horaAFecha(datos.horaFin),
        activo: datos.activo,
      },
      select: SELECT_DISPONIBILIDAD,
    });
    return aFranja(fila);
  }

  async eliminar(id: string, veterinarioId: string): Promise<FranjaDisponibilidadPersistida | null> {
    const actual = await prisma.disponibilidadVeterinario.findFirst({
      where: { id, veterinarioId, deletedAt: null },
      select: SELECT_DISPONIBILIDAD,
    });
    if (!actual) return null;

    // updateMany (no update): el `WHERE veterinarioId=?` es la defensa
    // anti-IDOR — evita eliminar una franja de otro veterinario aun si
    // alguien adivina el id, sin necesitar una segunda consulta.
    const resultado = await prisma.disponibilidadVeterinario.updateMany({
      where: { id, veterinarioId, deletedAt: null },
      data: { deletedAt: new Date(), activo: false },
    });
    if (resultado.count === 0) return null;

    return aFranja({ ...actual, activo: false });
  }

  async listarPropias(veterinarioId: string): Promise<FranjaDisponibilidadPersistida[]> {
    const filas = await prisma.disponibilidadVeterinario.findMany({
      where: { veterinarioId, deletedAt: null },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
      select: SELECT_DISPONIBILIDAD,
    });
    return filas.map(aFranja);
  }

  async listarActivas(veterinarioId: string): Promise<FranjaDisponibilidadPersistida[]> {
    const filas = await prisma.disponibilidadVeterinario.findMany({
      where: { veterinarioId, activo: true, deletedAt: null },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
      select: SELECT_DISPONIBILIDAD,
    });
    return filas.map(aFranja);
  }
}
