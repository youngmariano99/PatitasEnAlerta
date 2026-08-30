import { ZodError } from 'zod';
import { CrearReporteSchema, type ComandoCrearReporte } from '@aplicacion/dtos/reportes/CrearReporteDto';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import {
  CategoriaReporteObligatoriaError,
  FotoReporteObligatoriaError,
  GeolocalizacionNoDisponibleError,
  LimiteDeReportesExcedidoError,
} from '@dominio/errores/erroresReportes';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';

/** Datos compartidos por todos los eslabones de la cadena, además del comando en curso. */
export interface ContextoValidacionReporte {
  /** Payload crudo del body, todavía sin tipar — solo ValidadorEsquemaZod lo consume. */
  datosCrudos: unknown;
  /** Usuario autenticado que reporta, resuelto por el route handler desde la sesión. */
  reportadoPor: string;
}

/**
 * Chain of Responsibility (PLANIFICACION.md): cada eslabón valida un aspecto
 * independiente del alta de un reporte y decide si corta la cadena (lanzando
 * el ErrorDominio correspondiente, catálogo docs/ERRORS.md Módulo 2) o
 * delega en el siguiente. El orden lo fija `crearPipelineValidacionReporte`
 * más abajo — nunca la propia clase concreta, para poder reordenar o
 * insertar eslabones nuevos sin tocarlos.
 */
export abstract class ValidadorReporte {
  private siguiente: ValidadorReporte | null = null;

  enlazarCon(siguiente: ValidadorReporte): ValidadorReporte {
    this.siguiente = siguiente;
    return siguiente;
  }

  async manejar(contexto: ContextoValidacionReporte, entrada: unknown): Promise<ComandoCrearReporte> {
    const salida = await this.validar(contexto, entrada);
    if (this.siguiente) {
      return this.siguiente.manejar(contexto, salida);
    }
    return salida as ComandoCrearReporte;
  }

  protected abstract validar(contexto: ContextoValidacionReporte, entrada: unknown): Promise<unknown>;
}

/**
 * Primer eslabón: valida forma y tipos (Zod, fail-fast) y traduce el primer
 * issue a un código de negocio específico cuando el catálogo lo define
 * (PEA-REP-001 categoría, PEA-REP-002 foto, PEA-REP-003 ubicación); cualquier
 * otro campo inválido (ej. descripción vacía) cae en el genérico PEA-SIS-005.
 * Nunca invoca al siguiente eslabón si el esquema no es válido — cumple el
 * criterio de aceptación "PEA-REP-001 antes de invocar cualquier otra validación".
 */
export class ValidadorEsquemaZod extends ValidadorReporte {
  protected async validar(contexto: ContextoValidacionReporte, entrada: unknown): Promise<ComandoCrearReporte> {
    const resultado = CrearReporteSchema.safeParse(entrada);
    if (!resultado.success) {
      throw this.aErrorDeNegocio(resultado.error);
    }
    return { ...resultado.data, reportadoPor: contexto.reportadoPor };
  }

  private aErrorDeNegocio(error: ZodError) {
    const primerIssue = error.errors[0];
    switch (primerIssue?.path[0]) {
      case 'tipo':
        return new CategoriaReporteObligatoriaError();
      case 'fotoUrl':
        return new FotoReporteObligatoriaError();
      case 'latitud':
      case 'longitud':
        return new GeolocalizacionNoDisponibleError();
      default:
        return new PayloadInvalidoError(primerIssue?.message);
    }
  }
}

/**
 * Segundo eslabón: anti-spam (PEA-REP-004). Se ejecuta después del esquema
 * para no gastar cupo de rate limit en payloads inválidos, y antes de tocar
 * Cloudinary/geolocalización para no pagar ese costo si el usuario ya superó
 * el límite.
 */
export class ValidadorRateLimit extends ValidadorReporte {
  constructor(private readonly controlDeTasa: IControlDeTasa) {
    super();
  }

  protected async validar(contexto: ContextoValidacionReporte, entrada: unknown): Promise<unknown> {
    const permitido = await this.controlDeTasa.permitir(contexto.reportadoPor);
    if (!permitido) {
      throw new LimiteDeReportesExcedidoError();
    }
    return entrada;
  }
}

/**
 * Tercer eslabón: la `fotoUrl` recibida tiene que pertenecer a nuestra
 * cuenta de Cloudinary (mismo criterio que RegistrarMascota) — nunca se
 * persiste a ciegas una URL arbitraria armada a mano por un cliente que se
 * salteó la subida real.
 */
export class ValidadorContenidoImagen extends ValidadorReporte {
  constructor(private readonly almacenamientoImagenes: IAlmacenamientoImagenes) {
    super();
  }

  protected async validar(_contexto: ContextoValidacionReporte, entrada: unknown): Promise<unknown> {
    const comando = entrada as ComandoCrearReporte;
    if (!this.almacenamientoImagenes.esUrlDeImagenValida(comando.fotoUrl)) {
      throw new FotoReporteObligatoriaError();
    }
    return comando;
  }
}

const LATITUD_MINIMA = -90;
const LATITUD_MAXIMA = 90;
const LONGITUD_MINIMA = -180;
const LONGITUD_MAXIMA = 180;

/**
 * Último eslabón: verifica que la ubicación recibida (automática o elegida a
 * mano en el mapa Leaflet — ver app/reportes/nuevo/page.tsx) sea
 * geográficamente plausible. Rechaza fuera de rango y "null island" (0,0),
 * el valor típico de un fallback de geolocalización que falló silenciosamente
 * en vez de ofrecer la selección manual.
 */
export class ValidadorGeolocalizacion extends ValidadorReporte {
  protected async validar(_contexto: ContextoValidacionReporte, entrada: unknown): Promise<unknown> {
    const comando = entrada as ComandoCrearReporte;
    const { latitud, longitud } = comando;
    const dentroDeRango =
      latitud >= LATITUD_MINIMA && latitud <= LATITUD_MAXIMA && longitud >= LONGITUD_MINIMA && longitud <= LONGITUD_MAXIMA;
    const esNullIsland = latitud === 0 && longitud === 0;

    if (!dentroDeRango || esNullIsland) {
      throw new GeolocalizacionNoDisponibleError();
    }
    return comando;
  }
}

export interface DependenciasPipelineValidacionReporte {
  controlDeTasa: IControlDeTasa;
  almacenamientoImagenes: IAlmacenamientoImagenes;
}

/**
 * Arma la cadena en el orden exigido por el criterio de aceptación:
 * ValidadorEsquemaZod → ValidadorRateLimit → ValidadorContenidoImagen →
 * ValidadorGeolocalizacion. Punto único de composición — los casos de uso
 * nunca instancian ni enlazan los eslabones a mano.
 */
export function crearPipelineValidacionReporte(
  dependencias: DependenciasPipelineValidacionReporte,
): ValidadorReporte {
  const esquema = new ValidadorEsquemaZod();
  const rateLimit = new ValidadorRateLimit(dependencias.controlDeTasa);
  const contenidoImagen = new ValidadorContenidoImagen(dependencias.almacenamientoImagenes);
  const geolocalizacion = new ValidadorGeolocalizacion();

  esquema.enlazarCon(rateLimit).enlazarCon(contenidoImagen).enlazarCon(geolocalizacion);

  return esquema;
}
