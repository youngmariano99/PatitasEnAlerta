import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { ParametrosInscripcionSchema, type ComandoInscripcionCurso } from '@aplicacion/dtos/foros-cursos/InscripcionCursoDto';
import type { IRepositorioInscripcionesCurso } from '@dominio/puertos/IRepositorioInscripcionesCurso';
import { TemaForoNoEncontradoError } from '@dominio/errores/erroresForosCursos';

/** Payload crudo (solo `cursoId`, del path) + quién se da de baja, resuelto por el route handler desde la sesión. */
export interface EntradaDarDeBajaInscripcionCurso {
  datosCrudos: unknown;
  usuarioId: string;
}

export interface InscripcionCursoDadaDeBaja {
  cursoId: string;
}

/**
 * Template Method (CasoDeUsoBase) — baja de la inscripción propia a un curso
 * (Módulo 8, Paso 3: "endpoint de baja de inscripción propia controlado por
 * el usuario"). `cursoId` sale del path, `usuarioId` de la sesión — el DELETE
 * queda condicionado a `cursoId + usuarioId` en el propio repositorio, así
 * que este caso de uso no tiene forma de afectar la inscripción de otro
 * usuario aunque quisiera (control exclusivo, sin necesitar un chequeo de
 * pertenencia aparte).
 */
@injectable()
export class DarDeBajaInscripcionCurso extends CasoDeUsoBase<
  EntradaDarDeBajaInscripcionCurso,
  InscripcionCursoDadaDeBaja,
  ComandoInscripcionCurso
> {
  constructor(@inject('IRepositorioInscripcionesCurso') private readonly repositorioInscripciones: IRepositorioInscripcionesCurso) {
    super();
  }

  protected validar(input: EntradaDarDeBajaInscripcionCurso): ComandoInscripcionCurso {
    const datos = ParametrosInscripcionSchema.parse(input.datosCrudos);
    return { ...datos, usuarioId: input.usuarioId };
  }

  protected async autorizar(): Promise<void> {
    // Sin restricción de rol: cualquier usuario autenticado puede dar de
    // baja su propia inscripción (docs/ROLES.md, Módulo 8).
  }

  protected async persistir(dato: ComandoInscripcionCurso): Promise<InscripcionCursoDadaDeBaja> {
    const dadaDeBaja = await this.repositorioInscripciones.darDeBaja(dato.cursoId, dato.usuarioId);
    if (!dadaDeBaja) {
      // Reutiliza el mismo código que "curso inexistente" (PEA-FORO-002,
      // docs/ERRORS.md): no había ninguna inscripción propia activa para
      // ese curso, exista o no el curso en sí — anti-enumeración, mismo
      // criterio que el resto de los "no encontrado" de este proyecto.
      throw new TemaForoNoEncontradoError();
    }
    return { cursoId: dato.cursoId };
  }
}
