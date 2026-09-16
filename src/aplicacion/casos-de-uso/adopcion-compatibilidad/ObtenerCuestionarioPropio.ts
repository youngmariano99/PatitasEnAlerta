import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { CuestionarioAdoptanteDto } from '@aplicacion/dtos/adopcion-compatibilidad/CuestionarioAdoptanteDto';
import type { IRepositorioCuestionariosAdoptante } from '@dominio/puertos/IRepositorioCuestionariosAdoptante';
import { CuestionarioNoEncontradoError } from '@dominio/errores/erroresAdopcionCompatibilidad';

export interface ComandoObtenerCuestionarioPropio {
  usuarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — consulta del cuestionario propio (AC
 * explícito del ticket: "cuando consulta... solo puede acceder al propio,
 * nunca al de otro adoptante"). Sin `id` de por medio: `usuarioId` sale
 * siempre de la sesión, así que este caso de uso no tiene forma de exponer
 * el cuestionario de otro adoptante aunque quisiera — mismo criterio que
 * `ObtenerPerfilPropio`.
 */
@injectable()
export class ObtenerCuestionarioPropio extends CasoDeUsoBase<
  ComandoObtenerCuestionarioPropio,
  CuestionarioAdoptanteDto
> {
  constructor(
    @inject('IRepositorioCuestionariosAdoptante')
    private readonly repositorioCuestionarios: IRepositorioCuestionariosAdoptante,
  ) {
    super();
  }

  protected validar(input: ComandoObtenerCuestionarioPropio): ComandoObtenerCuestionarioPropio {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // Sin restricción de rol: cualquier usuario autenticado puede consultar
    // su propio cuestionario.
  }

  protected async persistir(
    dato: ComandoObtenerCuestionarioPropio,
  ): Promise<CuestionarioAdoptanteDto> {
    const cuestionario = await this.repositorioCuestionarios.obtenerPropio(dato.usuarioId);
    if (!cuestionario) {
      throw new CuestionarioNoEncontradoError();
    }

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
