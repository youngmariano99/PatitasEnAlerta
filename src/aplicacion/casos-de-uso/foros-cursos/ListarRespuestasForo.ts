import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioTemasForo, RespuestaForo } from '@dominio/puertos/IRepositorioTemasForo';

const ComandoSchema = z.object({ temaId: z.string().uuid('El identificador del tema no es válido.') });

export interface ComandoListarRespuestasForo {
  temaId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Consulta del foro de bienestar
 * animal" (Módulo 8, Paso 2: respuestas de un tema filtradas por `tema_id`,
 * vía `ix_respuestas_tema`, para cualquier usuario autenticado). Sin
 * verificación de existencia del tema: un `temaId` que no matchea ninguna
 * fila simplemente devuelve una lista vacía (mismo resultado que un tema sin
 * respuestas todavía) — no hay ninguna diferencia observable entre "tema sin
 * respuestas" y "tema inexistente" que amerite distinguir un 404 acá, y
 * agregarlo sería una validación que ningún AC de este ticket pide (Sección
 * 7, simplicidad por defecto).
 */
@injectable()
export class ListarRespuestasForo extends CasoDeUsoBase<ComandoListarRespuestasForo, RespuestaForo[]> {
  constructor(@inject('IRepositorioTemasForo') private readonly repositorioTemas: IRepositorioTemasForo) {
    super();
  }

  protected validar(input: ComandoListarRespuestasForo): ComandoListarRespuestasForo {
    return ComandoSchema.parse(input);
  }

  protected async autorizar(): Promise<void> {
    // Sin restricción de rol: cualquier usuario autenticado puede consultar
    // las respuestas de un tema (docs/ROLES.md, Módulo 8).
  }

  protected async persistir(dato: ComandoListarRespuestasForo): Promise<RespuestaForo[]> {
    return this.repositorioTemas.listarRespuestas(dato.temaId);
  }
}
