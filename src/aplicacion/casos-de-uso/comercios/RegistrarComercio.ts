import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import type { ZodError } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  DatosComercioSchema,
  type ComandoRegistrarComercio,
  type ComercioDto,
} from '@aplicacion/dtos/comercios/RegistrarComercioDto';
import type { Comercio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';
import { ComercioTipoInvalidoError } from '@dominio/errores/erroresComercios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_AUTORIZADO = 'comerciante';

/** Payload crudo del formulario + quién registra, resuelto por el route handler desde la sesión. */
export interface EntradaRegistrarComercio {
  datosCrudos: unknown;
  usuarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Registro de comercio en la
 * plataforma" (Módulo 7, Paso 2: alta restringida a rol `comerciante`,
 * Paso 3: `tipo_comercio` inválido corta con PEA-COM-002 en vez del genérico
 * PEA-SIS-005). `validar()` usa `safeParse` (no `.parse`) para poder
 * distinguir el issue en `tipoComercio` de cualquier otro campo inválido —
 * mismo criterio que `ValidadorEsquemaZod` en `ValidacionReporte.ts`, sin
 * necesitar un pipeline completo porque acá hay un único campo con código
 * propio en el catálogo.
 *
 * `persistir()` siempre inserta con `usuario_id = usuarioId` de la sesión,
 * nunca del body, y jamás fija `estado_verificacion` — nace en 'pendiente'
 * por el `DEFAULT` de la columna (docs/SCHEMA.md), hasta la revisión del
 * Administrador (AC explícito del ticket).
 */
@injectable()
export class RegistrarComercio extends CasoDeUsoBase<EntradaRegistrarComercio, ComercioDto, ComandoRegistrarComercio> {
  constructor(
    @inject('IRepositorioComercios') private readonly repositorioComercios: IRepositorioComercios,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaRegistrarComercio): ComandoRegistrarComercio {
    const resultado = DatosComercioSchema.safeParse(input.datosCrudos);
    if (!resultado.success) {
      throw this.aErrorDeNegocio(resultado.error);
    }
    return { ...resultado.data, usuarioId: input.usuarioId };
  }

  private aErrorDeNegocio(error: ZodError) {
    const primerIssue = error.errors[0];
    if (primerIssue?.path[0] === 'tipoComercio') {
      return new ComercioTipoInvalidoError();
    }
    return new PayloadInvalidoError(primerIssue?.message);
  }

  protected async autorizar(dato: ComandoRegistrarComercio): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.usuarioId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoRegistrarComercio): Promise<ComercioDto> {
    const comercio = await this.repositorioComercios.crear(dato.usuarioId, {
      nombreComercio: dato.nombreComercio,
      tipoComercio: dato.tipoComercio,
      direccion: dato.direccion,
      latitud: dato.latitud,
      longitud: dato.longitud,
    });

    return this.aDto(comercio);
  }

  private aDto(comercio: Comercio): ComercioDto {
    return {
      id: comercio.id,
      usuarioId: comercio.usuarioId,
      nombreComercio: comercio.nombreComercio,
      tipoComercio: comercio.tipoComercio,
      direccion: comercio.direccion,
      latitud: comercio.latitud,
      longitud: comercio.longitud,
      estadoVerificacion: comercio.estadoVerificacion,
      createdAt: comercio.createdAt.toISOString(),
    };
  }
}
