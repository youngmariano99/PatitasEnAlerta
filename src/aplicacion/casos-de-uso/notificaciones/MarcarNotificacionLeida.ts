import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ComandoSchema = z.object({
  notificacionId: z.string().uuid('El identificador de la notificación no es válido.'),
  solicitanteId: z.string().uuid(),
});

export interface ComandoMarcarNotificacionLeida {
  notificacionId: string;
  solicitanteId: string;
}

export interface NotificacionMarcadaLeidaResultado {
  id: string;
  leido: true;
}

/**
 * Template Method (CasoDeUsoBase) — AC "puede marcarla como leída y esa
 * acción persiste en notificaciones.leido". `autorizar()` es un no-op:
 * verificar pertenencia con un `SELECT` aparte y recién después hacer el
 * `UPDATE` es una carrera (TOCTOU) — en vez de eso, la propiedad se exige
 * como parte del mismo UPDATE atómico en `persistir()`
 * (`IRepositorioNotificaciones.marcarComoLeida`, WHERE id=? AND usuario_id=?
 * en una sola sentencia). Si no afectó ninguna fila, "no existe" y "no es
 * tuya" se colapsan en el mismo PEA-SIS-002 — mismo criterio anti-enumeración
 * que RepositorioProxy.
 */
@injectable()
export class MarcarNotificacionLeida extends CasoDeUsoBase<ComandoMarcarNotificacionLeida, NotificacionMarcadaLeidaResultado> {
  constructor(@inject('INotificacionesRepositorio') private readonly repositorioNotificaciones: INotificacionesRepositorio) {
    super();
  }

  protected validar(input: ComandoMarcarNotificacionLeida): ComandoMarcarNotificacionLeida {
    return ComandoSchema.parse(input);
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver comentario de clase — la pertenencia se exige en persistir().
  }

  protected async persistir(dato: ComandoMarcarNotificacionLeida): Promise<NotificacionMarcadaLeidaResultado> {
    const marcada = await this.repositorioNotificaciones.marcarComoLeida(dato.notificacionId, dato.solicitanteId);
    if (!marcada) {
      throw new AccesoNoAutorizadoError();
    }

    return { id: dato.notificacionId, leido: true };
  }
}
