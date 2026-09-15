import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  CompletarCuestionarioAdoptanteSchema,
  type ComandoCompletarCuestionarioAdoptante,
  type CuestionarioAdoptanteDto,
} from '@aplicacion/dtos/adopcion-compatibilidad/CuestionarioAdoptanteDto';
import type { CuestionarioAdoptante } from '@dominio/entidades/CuestionarioAdoptante';
import type { IRepositorioCuestionariosAdoptante } from '@dominio/puertos/IRepositorioCuestionariosAdoptante';

/** Payload crudo del formulario + quién completa, resuelto por el route handler desde la sesión. */
export interface EntradaCompletarCuestionarioAdoptante {
  datosCrudos: unknown;
  usuarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Cuestionario de estilo de
 * vida del adoptante" (Módulo 9, Post-MVP). `autorizar()` es un no-op real:
 * cualquier usuario autenticado completa su PROPIO cuestionario
 * (docs/ROLES.md, "dueño (adoptante): CRUD(p)" — sin restricción de rol
 * adicional), y el AC "solo puede acceder al propio" se cumple por
 * construcción: `usuarioId` sale siempre de la sesión (nunca de un `id` en
 * el body/URL), así que este caso de uso no tiene forma de tocar el
 * cuestionario de otro adoptante aunque quisiera.
 *
 * `persistir()` resuelve un upsert (Paso 1: "insertando/actualizando... con
 * `usuario_id = usuario_actual()`") — mismo patrón que
 * `ConfigurarDisponibilidad`: busca el cuestionario propio existente vía
 * `obtenerPropio` y actualiza si ya hay uno, o crea si es la primera vez.
 * Todos los campos son opcionales (permite guardar avance parcial,
 * docs/ERRORS.md PEA-ADOP-001) — la validación de "completo" vive en
 * `esCuestionarioCompleto` (`@dominio/entidades/CuestionarioAdoptante`),
 * consumida por el futuro caso de uso que solicite sugerencias de
 * compatibilidad (Paso 3, fuera de alcance de esta actividad: requiere el
 * algoritmo `EstrategiaMatchAdopcion`, todavía no implementado).
 */
@injectable()
export class CompletarCuestionarioAdoptante extends CasoDeUsoBase<
  EntradaCompletarCuestionarioAdoptante,
  CuestionarioAdoptanteDto,
  ComandoCompletarCuestionarioAdoptante
> {
  constructor(
    @inject('IRepositorioCuestionariosAdoptante') private readonly repositorioCuestionarios: IRepositorioCuestionariosAdoptante,
  ) {
    super();
  }

  protected validar(input: EntradaCompletarCuestionarioAdoptante): ComandoCompletarCuestionarioAdoptante {
    const datos = CompletarCuestionarioAdoptanteSchema.parse(input.datosCrudos);
    return { ...datos, usuarioId: input.usuarioId };
  }

  protected async autorizar(): Promise<void> {
    // Sin restricción de rol: cualquier usuario autenticado completa su
    // propio cuestionario (docs/ROLES.md, Módulo 9).
  }

  protected async persistir(dato: ComandoCompletarCuestionarioAdoptante): Promise<CuestionarioAdoptanteDto> {
    const datosCuestionario = {
      horasSoloEstimadas: dato.horasSoloEstimadas,
      presenciaNinos: dato.presenciaNinos,
      espacioDisponible: dato.espacioDisponible,
      experienciaPrevia: dato.experienciaPrevia,
    };

    const existente = await this.repositorioCuestionarios.obtenerPropio(dato.usuarioId);
    const cuestionario = existente
      ? await this.repositorioCuestionarios.actualizar(existente.id, datosCuestionario)
      : await this.repositorioCuestionarios.crear(dato.usuarioId, datosCuestionario);

    return this.aDto(cuestionario);
  }

  private aDto(cuestionario: CuestionarioAdoptante): CuestionarioAdoptanteDto {
    return {
      id: cuestionario.id,
      usuarioId: cuestionario.usuarioId,
      horasSoloEstimadas: cuestionario.horasSoloEstimadas,
      presenciaNinos: cuestionario.presenciaNinos,
      espacioDisponible: cuestionario.espacioDisponible,
      experienciaPrevia: cuestionario.experienciaPrevia,
      createdAt: cuestionario.createdAt.toISOString(),
      updatedAt: cuestionario.updatedAt.toISOString(),
    };
  }
}
