import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { Prisma } from '@prisma/client';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ParametrosInscripcionSchema,
  type ComandoInscripcionCurso,
  type InscripcionCursoDto,
} from '@aplicacion/dtos/foros-cursos/InscripcionCursoDto';
import type { IRepositorioInscripcionesCurso } from '@dominio/puertos/IRepositorioInscripcionesCurso';
import { TemaForoNoEncontradoError, YaInscriptoEnCursoError } from '@dominio/errores/erroresForosCursos';

/** Payload crudo (solo `cursoId`, del path) + quién se inscribe, resuelto por el route handler desde la sesión. */
export interface EntradaInscribirseCurso {
  datosCrudos: unknown;
  usuarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Inscripción a cursos" (Módulo
 * 8, Paso 1: INSERT en `inscripciones_curso`). `autorizar()` es un no-op
 * real: docs/ROLES.md (Módulo 8) da `CRD(p)` sobre `inscripciones_curso` a
 * "Cualquier autenticado", sin restricción de rol — mismo criterio que
 * `CrearTemaForo`.
 *
 * `persistir()` es el único punto de verdad: intenta el INSERT directo, sin
 * ningún chequeo previo de "¿ya estoy inscripto?" ni "¿existe el curso?" —
 * el Paso 2 del ticket pide explícitamente CAPTURAR la violación del índice
 * único (`ux_inscripcion_curso_usuario`, P2002 de Prisma) en vez de
 * prevenirla con una consulta extra, y una violación de la FK hacia
 * `cursos` (P2003) se traduce al mismo código ya catalogado para "curso
 * inexistente" (PEA-FORO-002) — nunca se deja escapar el error crudo de
 * Prisma hacia el cliente (CLAUDE.md, NFR de Trazabilidad: "mensajes al
 * cliente... sin texto interno expuesto").
 */
@injectable()
export class InscribirseCurso extends CasoDeUsoBase<EntradaInscribirseCurso, InscripcionCursoDto, ComandoInscripcionCurso> {
  constructor(@inject('IRepositorioInscripcionesCurso') private readonly repositorioInscripciones: IRepositorioInscripcionesCurso) {
    super();
  }

  protected validar(input: EntradaInscribirseCurso): ComandoInscripcionCurso {
    const datos = ParametrosInscripcionSchema.parse(input.datosCrudos);
    return { ...datos, usuarioId: input.usuarioId };
  }

  protected async autorizar(): Promise<void> {
    // Sin restricción de rol: cualquier usuario autenticado puede
    // inscribirse a un curso (docs/ROLES.md, Módulo 8).
  }

  protected async persistir(dato: ComandoInscripcionCurso): Promise<InscripcionCursoDto> {
    try {
      const inscripcion = await this.repositorioInscripciones.crear(dato.cursoId, dato.usuarioId);
      return {
        id: inscripcion.id,
        cursoId: inscripcion.cursoId,
        usuarioId: inscripcion.usuarioId,
        inscritoEn: inscripcion.inscritoEn.toISOString(),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new YaInscriptoEnCursoError();
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new TemaForoNoEncontradoError();
      }
      throw error;
    }
  }
}
