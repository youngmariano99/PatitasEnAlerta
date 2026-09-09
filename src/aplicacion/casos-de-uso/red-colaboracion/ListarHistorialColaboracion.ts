import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { HistorialEstadoColaboracionItem, IRepositorioColaboraciones } from '@dominio/puertos/IRepositorioColaboraciones';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { ColaboracionNoEncontradaError } from '@dominio/errores/erroresRedColaboracion';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_CON_ACCESO_TOTAL = 'administrador';

const ComandoSchema = z.object({
  colaboracionId: z.string().uuid('El identificador de la colaboración no es válido.'),
  solicitanteId: z.string().uuid(),
});

export interface ComandoListarHistorialColaboracion {
  colaboracionId: string;
  solicitanteId: string;
}

/**
 * "Vista de seguimiento de colaboraciones con historial persistente"
 * (Módulo 5, docs/REQUISITOS.md) — la línea de tiempo que muestra el hilo de
 * coordinación de una colaboración, alimentada por
 * ActualizarEstadoColaboracionCommand. `autorizar()` sigue la matriz de
 * docs/ROLES.md (Módulo 5): la organización dueña de la solicitud
 * (`RU(p, sobre sus solicitudes)`) y el stakeholder que la propuso
 * (`CR(p)`) acceden a su propio hilo; `administrador` accede a cualquiera
 * (`R(t)`); `municipio` no tiene ninguna columna sobre `colaboraciones` y
 * cae en el mismo PEA-SIS-002 que cualquier otro rol ajeno — mismo criterio
 * que ListarHistorialReporte.
 */
@injectable()
export class ListarHistorialColaboracion extends CasoDeUsoBase<ComandoListarHistorialColaboracion, HistorialEstadoColaboracionItem[]> {
  constructor(
    @inject('IRepositorioColaboraciones') private readonly repositorioColaboraciones: IRepositorioColaboraciones,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: ComandoListarHistorialColaboracion): ComandoListarHistorialColaboracion {
    return ComandoSchema.parse(input);
  }

  protected async autorizar(dato: ComandoListarHistorialColaboracion): Promise<void> {
    const actual = await this.repositorioColaboraciones.obtenerActual(dato.colaboracionId);
    if (!actual) {
      throw new ColaboracionNoEncontradaError();
    }
    if (actual.organizacionId === dato.solicitanteId || actual.stakeholderId === dato.solicitanteId) {
      return;
    }

    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.solicitanteId);
    if (!solicitante || solicitante.rol !== ROL_CON_ACCESO_TOTAL) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarHistorialColaboracion): Promise<HistorialEstadoColaboracionItem[]> {
    return this.repositorioColaboraciones.listarHistorialEstado(dato.colaboracionId);
  }
}
