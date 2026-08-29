import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import type { IRepositorioVerificaciones } from '@dominio/puertos/IRepositorioVerificaciones';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import type { VerificacionResueltaResultado, DecisionVerificacion } from '@dominio/entidades/Verificacion';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { logger } from '@infraestructura/logging/logger';

const ROL_ADMINISTRADOR = 'administrador';

const DecisionVerificacionSchema = z.object({
  verificacionId: z.string().uuid('El identificador de la verificación no es válido.'),
  decision: z.enum(['aprobado', 'rechazado'], { required_error: 'Elegí si aprobás o rechazás la verificación.' }),
  motivoRechazo: z
    .string()
    .trim()
    .max(500, 'El motivo no puede superar los 500 caracteres.')
    .optional(),
});

export interface ComandoResolverVerificacion {
  verificacionId: string;
  decision: DecisionVerificacion;
  motivoRechazo?: string;
  /** Quien invoca el comando — resuelto por el route handler desde la sesión, nunca del body. */
  administradorId: string;
}

/**
 * Patrón Command (PLANIFICACION.md Sección 4.2): cada resolución de
 * verificación es un comando auditable — el propio Template Method
 * (CasoDeUsoBase) ya provee ese registro completo (validar → autorizar →
 * persistir → publicarEvento), acá aplicado a la mutación "aprobar/rechazar"
 * en vez de un alta.
 *
 * validar (Zod, fail-fast — exige motivoRechazo cuando decision='rechazado')
 * → autorizar (rol_actual() === 'administrador') → persistir (transacción
 * verificación + usuarios.estado_verificacion + verificado_en del perfil) →
 * publicarEvento (Observer: notifica al usuario afectado, sin acoplar el
 * paso de persistencia — ver INotificacionesRepositorio).
 */
@injectable()
export class ResolverVerificacionCommand extends CasoDeUsoBase<ComandoResolverVerificacion, VerificacionResueltaResultado> {
  constructor(
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
    @inject('IRepositorioVerificaciones') private readonly repositorioVerificaciones: IRepositorioVerificaciones,
    @inject('INotificacionesRepositorio') private readonly repositorioNotificaciones: INotificacionesRepositorio,
  ) {
    super();
  }

  protected validar(input: ComandoResolverVerificacion): ComandoResolverVerificacion {
    const datos = DecisionVerificacionSchema.parse(input);
    if (datos.decision === 'rechazado' && !datos.motivoRechazo) {
      throw new PayloadInvalidoError('Ingresá el motivo del rechazo.');
    }
    return { ...datos, administradorId: input.administradorId };
  }

  protected async autorizar(dato: ComandoResolverVerificacion): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.administradorId);
    if (!solicitante || solicitante.rol !== ROL_ADMINISTRADOR) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoResolverVerificacion): Promise<VerificacionResueltaResultado> {
    return this.repositorioVerificaciones.resolver({
      verificacionId: dato.verificacionId,
      administradorId: dato.administradorId,
      decision: dato.decision,
      motivoRechazo: dato.motivoRechazo ?? null,
    });
  }

  protected override async publicarEvento(resultado: VerificacionResueltaResultado): Promise<void> {
    // No debe hacer fallar una resolución ya confirmada: un problema al
    // notificar es un incidente aparte, nunca un motivo para que el
    // Administrador vea un error sobre una acción que en realidad sí
    // se aplicó (evento VerificacionResuelta desacoplado del paso anterior).
    try {
      await this.repositorioNotificaciones.crear({
        usuarioId: resultado.usuarioId,
        tipo: 'verificacion_resuelta',
        referenciaTabla: 'verificaciones',
        referenciaId: resultado.verificacionId,
      });
    } catch (error) {
      logger.error({ err: error, resultado }, 'No se pudo publicar la notificación de VerificacionResuelta');
    }
  }
}
