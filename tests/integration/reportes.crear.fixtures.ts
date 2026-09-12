import { NextRequest } from 'next/server';
import type {
  CriteriosCoincidenciaReporte,
  DatosNuevoReporte,
  FiltrosListadoReportes,
  IRepositorioReportes,
  PaginaReportes,
  ReporteActivoResumen,
} from '@dominio/puertos/IRepositorioReportes';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import type { IControlDeTasaConReintento, ResultadoControlDeTasa } from '@dominio/puertos/IControlDeTasaConReintento';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { DatosNotificacion, INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import type { DatosReporte } from '@dominio/entidades/Reporte';
import { Reporte } from '@dominio/entidades/Reporte';

/**
 * Fakes y helpers de request/autenticación compartidos entre
 * reportes.crear.test.ts (validación base, rate limit, coincidencia
 * perdido/encontrado) y reportes.crear.problematica.test.ts (subtipo de
 * 'problematica') — separados en dos archivos de test para respetar el
 * límite de 300 líneas por archivo (CLAUDE.md) sin duplicar esta base común.
 * Sin describe/it acá: Jest no lo toma como suite propia.
 */
export class RepositorioReportesFalso implements IRepositorioReportes {
  public creados: DatosNuevoReporte[] = [];
  public llamadasBusquedaCoincidencias: CriteriosCoincidenciaReporte[] = [];
  public coincidenciasARetornar: ReporteActivoResumen[] = [];

  async crear(datos: DatosNuevoReporte): Promise<Reporte> {
    this.creados.push(datos);
    const entidad: DatosReporte = { ...datos, estado: 'reportado' };
    return Reporte.reconstruir(`reporte-${this.creados.length}`, entidad, new Date('2026-08-01T12:00:00.000Z'));
  }

  async buscarPerdidosActivosPorZonaYEspecie(criterios: CriteriosCoincidenciaReporte): Promise<ReporteActivoResumen[]> {
    this.llamadasBusquedaCoincidencias.push(criterios);
    return this.coincidenciasARetornar;
  }

  async listar(_filtros: FiltrosListadoReportes, _pagina: number, _porPagina: number): Promise<PaginaReportes> {
    throw new Error('no usado en este test — ver tests/integration/reportes.listar.test.ts');
  }

  async obtenerEstadoActual(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async actualizarEstado(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async obtenerPropietario(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarHistorialEstado(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async buscarPorSimilitudSemantica(): Promise<never[]> {
    throw new Error('no usado en este test');
  }
}

export class NotificacionesRepositorioFalso implements INotificacionesRepositorio {
  public creadas: DatosNotificacion[] = [];

  async crear(datos: DatosNotificacion): Promise<void> {
    this.creadas.push(datos);
  }

  async listarPorUsuario(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async marcarComoLeida(): Promise<boolean> {
    throw new Error('no usado en este test');
  }
}

export class AlmacenamientoImagenesFalso implements IAlmacenamientoImagenes {
  public subidaPorElUsuario = true;

  esUrlDeImagenValida(url: string): boolean {
    return url.startsWith('https://res.cloudinary.com/patitas-en-alerta/');
  }

  async fueSubidaPor(): Promise<boolean> {
    return this.subidaPorElUsuario;
  }
}

export class ControlDeTasaFalso implements IControlDeTasa {
  public permitido = true;

  async permitir(): Promise<boolean> {
    return this.permitido;
  }
}

const MAXIMO_ANTI_SATURACION_POR_HORA = 5;

/**
 * Simula la ventana deslizante real de UpstashControlDeTasaAntiSaturacion
 * (5/hora) contando intentos por identificador, sin depender de Redis real.
 */
export class ControlDeTasaAntiSaturacionFalso implements IControlDeTasaConReintento {
  private intentosPorUsuario = new Map<string, number>();
  public reintentarEnSegundos = 3600;

  async evaluar(identificador: string): Promise<ResultadoControlDeTasa> {
    const intentos = (this.intentosPorUsuario.get(identificador) ?? 0) + 1;
    this.intentosPorUsuario.set(identificador, intentos);
    const permitido = intentos <= MAXIMO_ANTI_SATURACION_POR_HORA;
    return { permitido, reintentarEnSegundos: permitido ? 0 : this.reintentarEnSegundos };
  }
}

export class RepositorioPerfilFalso implements IRepositorioPerfil {
  public estadoVerificacion = 'no_requerido';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'usuario@ejemplo.test', rol: 'dueño', estadoVerificacion: this.estadoVerificacion, verificadoEn: null };
  }
}

export function autenticarComo(getUserMock: jest.Mock, usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

export function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/reportes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export const fotoValida = 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg';
export const reporteValido = {
  tipo: 'perdido',
  descripcion: 'Se perdió cerca de la plaza, responde a su nombre.',
  fotoUrl: fotoValida,
  latitud: -37.9989,
  longitud: -61.3565,
};
