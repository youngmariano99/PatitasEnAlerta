import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  IRepositorioVerificaciones,
  DatosResolverVerificacion,
} from '@dominio/puertos/IRepositorioVerificaciones';
import type {
  FilaVerificacionPendiente,
  PaginaVerificacionesPendientes,
  FilaHistorialVerificacion,
  PaginaHistorialVerificaciones,
  VerificacionResueltaResultado,
  TipoVerificacion,
  DecisionVerificacion,
} from '@dominio/entidades/Verificacion';
import { VerificacionYaResueltaError } from '@dominio/errores/erroresVerificaciones';

@injectable()
export class PrismaVerificacionesRepositorio implements IRepositorioVerificaciones {
  async listarPendientes(pagina: number, porPagina: number): Promise<PaginaVerificacionesPendientes> {
    const where = { estado: 'pendiente' };

    const [filas, total] = await Promise.all([
      prisma.verificacion.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: {
          id: true,
          usuarioId: true,
          tipo: true,
          createdAt: true,
          usuario: {
            select: {
              email: true,
              perfilVeterinario: { select: { matricula: true, colegioEmisor: true } },
              perfilMunicipio: { select: { nombreInstitucional: true } },
            },
          },
        },
      }),
      prisma.verificacion.count({ where }),
    ]);

    const items: FilaVerificacionPendiente[] = filas.map((fila) => ({
      id: fila.id,
      usuarioId: fila.usuarioId,
      tipo: fila.tipo as TipoVerificacion,
      email: fila.usuario.email,
      createdAt: fila.createdAt,
      matricula: fila.usuario.perfilVeterinario?.matricula ?? null,
      colegioEmisor: fila.usuario.perfilVeterinario?.colegioEmisor ?? null,
      nombreInstitucional: fila.usuario.perfilMunicipio?.nombreInstitucional ?? null,
    }));

    return { items, total, pagina, porPagina };
  }

  // Historial de auditoría (AUTH-09) — exclusivamente de lectura, ordenado
  // por resuelto_en descendente (la resolución más reciente primero, el
  // orden natural para revisar auditoría), a diferencia de listarPendientes
  // (created_at ascendente, orden de atención de una cola).
  async listarResueltas(pagina: number, porPagina: number): Promise<PaginaHistorialVerificaciones> {
    const where = { estado: { not: 'pendiente' } };

    const [filas, total] = await Promise.all([
      prisma.verificacion.findMany({
        where,
        orderBy: { resueltoEn: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: {
          id: true,
          usuarioId: true,
          tipo: true,
          estado: true,
          motivoRechazo: true,
          revisadoPor: true,
          resueltoEn: true,
          createdAt: true,
          usuario: {
            select: {
              email: true,
              perfilVeterinario: { select: { matricula: true, colegioEmisor: true } },
              perfilMunicipio: { select: { nombreInstitucional: true } },
            },
          },
        },
      }),
      prisma.verificacion.count({ where }),
    ]);

    const items: FilaHistorialVerificacion[] = filas.map((fila) => ({
      id: fila.id,
      usuarioId: fila.usuarioId,
      tipo: fila.tipo as TipoVerificacion,
      email: fila.usuario.email,
      estado: fila.estado as DecisionVerificacion,
      motivoRechazo: fila.motivoRechazo,
      revisadoPor: fila.revisadoPor,
      resueltoEn: fila.resueltoEn,
      createdAt: fila.createdAt,
      matricula: fila.usuario.perfilVeterinario?.matricula ?? null,
      colegioEmisor: fila.usuario.perfilVeterinario?.colegioEmisor ?? null,
      nombreInstitucional: fila.usuario.perfilMunicipio?.nombreInstitucional ?? null,
    }));

    return { items, total, pagina, porPagina };
  }

  async resolver(datos: DatosResolverVerificacion): Promise<VerificacionResueltaResultado> {
    return prisma.$transaction(async (tx) => {
      const verificacion = await tx.verificacion.findUnique({
        where: { id: datos.verificacionId },
        select: { id: true, usuarioId: true, tipo: true, estado: true },
      });

      // Nunca se sobreescribe una fila ya resuelta (verificación técnica del
      // ticket): sin esto, un doble click o dos administradores en carrera
      // pisarían revisado_por/resuelto_en del primero en llegar.
      if (!verificacion || verificacion.estado !== 'pendiente') {
        throw new VerificacionYaResueltaError();
      }

      await tx.verificacion.update({
        where: { id: verificacion.id },
        data: {
          estado: datos.decision,
          motivoRechazo: datos.motivoRechazo,
          revisadoPor: datos.administradorId,
          resueltoEn: new Date(),
        },
      });

      if (datos.decision === 'aprobado') {
        await tx.usuario.update({
          where: { id: verificacion.usuarioId },
          data: { estadoVerificacion: 'verificado' },
        });

        if (verificacion.tipo === 'veterinario') {
          await tx.perfilVeterinario.update({
            where: { usuarioId: verificacion.usuarioId },
            data: { verificadoEn: new Date() },
          });
        } else if (verificacion.tipo === 'municipio') {
          await tx.perfilMunicipio.update({
            where: { usuarioId: verificacion.usuarioId },
            data: { verificadoEn: new Date() },
          });
        }
      } else {
        await tx.usuario.update({
          where: { id: verificacion.usuarioId },
          data: { estadoVerificacion: 'rechazado' },
        });
      }

      return {
        verificacionId: verificacion.id,
        usuarioId: verificacion.usuarioId,
        tipo: verificacion.tipo as TipoVerificacion,
        estado: datos.decision,
      };
    });
  }
}
