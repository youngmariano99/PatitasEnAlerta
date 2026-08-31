/**
 * @jest-environment node
 *
 * Job de coincidencia zona/especie y generación de notificación (Módulo 2):
 * crea un par 'perdido'/'encontrado' end-to-end vía POST /api/reportes (dos
 * veces) y verifica que DetectarCoincidenciaReporteJob — disparado sin
 * bloquear la respuesta HTTP de la segunda request — termine insertando la
 * notificación para el dueño del reporte 'perdido'. El fake de
 * IRepositorioReportes filtra de verdad (especie + radio geográfico) en vez
 * de devolver un resultado fijo, para ejercitar el criterio real de
 * coincidencia, no solo el cableado.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
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
import { ESTADOS_REPORTE_ACTIVOS, Reporte } from '@dominio/entidades/Reporte';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { POST } from '@app/api/reportes/route';

const KM_POR_GRADO_LATITUD = 111;

function distanciaAproximadaKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const deltaLat = (lat1 - lat2) * KM_POR_GRADO_LATITUD;
  const deltaLon = (lon1 - lon2) * KM_POR_GRADO_LATITUD * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(deltaLat * deltaLat + deltaLon * deltaLon);
}

/** Filtra de verdad (tipo/estado/especie/radio) sobre lo que se creó — no un resultado fijo. */
class RepositorioReportesEnMemoria implements IRepositorioReportes {
  private reportes: Array<DatosNuevoReporte & { id: string; estado: string }> = [];
  private contador = 0;

  async crear(datos: DatosNuevoReporte): Promise<Reporte> {
    this.contador += 1;
    const id = `reporte-${this.contador}`;
    this.reportes.push({ ...datos, id, estado: 'reportado' });
    const entidad: DatosReporte = { ...datos, estado: 'reportado' };
    return Reporte.reconstruir(id, entidad, new Date('2026-08-01T12:00:00.000Z'));
  }

  async buscarPerdidosActivosPorZonaYEspecie(criterios: CriteriosCoincidenciaReporte): Promise<ReporteActivoResumen[]> {
    return this.reportes
      .filter(
        (r) =>
          r.tipo === 'perdido' &&
          ([...ESTADOS_REPORTE_ACTIVOS] as string[]).includes(r.estado) &&
          r.especie?.toLowerCase() === criterios.especie.toLowerCase() &&
          r.id !== criterios.excluirReporteId &&
          distanciaAproximadaKm(r.latitud, r.longitud, criterios.latitud, criterios.longitud) <= criterios.radioKm,
      )
      .map((r) => ({ id: r.id, reportadoPor: r.reportadoPor }));
  }

  async listar(_filtros: FiltrosListadoReportes, _pagina: number, _porPagina: number): Promise<PaginaReportes> {
    throw new Error('no usado en este test');
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
}

class NotificacionesRepositorioFalso implements INotificacionesRepositorio {
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

class AlmacenamientoImagenesFalso implements IAlmacenamientoImagenes {
  esUrlDeImagenValida(url: string): boolean {
    return url.startsWith('https://res.cloudinary.com/patitas-en-alerta/');
  }
}

class ControlDeTasaFalso implements IControlDeTasa {
  async permitir(): Promise<boolean> {
    return true;
  }
}

// No es objeto de este test (ver ConRateLimitDecorator.test.ts /
// reportes.crear.test.ts para el límite anti-saturación en sí) — siempre
// permite, así el par 'perdido'/'encontrado' end-to-end nunca se ve
// interferido por él.
class ControlDeTasaAntiSaturacionFalso implements IControlDeTasaConReintento {
  async evaluar(): Promise<ResultadoControlDeTasa> {
    return { permitido: true, reintentarEnSegundos: 0 };
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'usuario@ejemplo.test', rol: 'dueño', estadoVerificacion: 'verificado', verificadoEn: null };
  }
}

function autenticarComo(usuarioId: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: usuarioId } }, error: null });
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/reportes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Deja correr el job fire-and-forget (ver DetectarCoincidenciaReporteJob.ts) antes de aserciones. */
async function esperarElJob(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

const fotoValida = 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg';

const REPORTE_PERDIDO = {
  tipo: 'perdido',
  descripcion: 'Mi perro Toby se perdió cerca de la plaza central.',
  fotoUrl: fotoValida,
  latitud: -37.9989,
  longitud: -61.3565,
  especie: 'perro',
};

describe('Job de coincidencia zona/especie y generación de notificación (integración end-to-end)', () => {
  let repositorioReportes: RepositorioReportesEnMemoria;
  let repositorioNotificaciones: NotificacionesRepositorioFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioReportes = new RepositorioReportesEnMemoria();
    repositorioNotificaciones = new NotificacionesRepositorioFalso();
    container.reset();
    container.registerInstance<IRepositorioReportes>('IRepositorioReportes', repositorioReportes);
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', repositorioNotificaciones);
    container.registerSingleton<IControlDeTasa>('IControlDeTasa', ControlDeTasaFalso);
    container.registerSingleton<IControlDeTasaConReintento>('IControlDeTasaConReintento', ControlDeTasaAntiSaturacionFalso);
    container.registerSingleton<IRepositorioPerfil>('IRepositorioPerfil', RepositorioPerfilFalso);
    container.registerSingleton<IAlmacenamientoImagenes>('IAlmacenamientoImagenes', AlmacenamientoImagenesFalso);
  });

  it('un "encontrado" de la misma especie y dentro del radio genera reporte_coincidente para el dueño del "perdido"', async () => {
    autenticarComo('dueno-perdido');
    const respuestaPerdido = await POST(crearRequest(REPORTE_PERDIDO));
    expect(respuestaPerdido.status).toBe(201);

    autenticarComo('vecino-encontro');
    const respuestaEncontrado = await POST(
      crearRequest({
        tipo: 'encontrado',
        descripcion: 'Encontré un perro suelto cerca de la plaza central.',
        fotoUrl: fotoValida,
        latitud: -37.9995, // ~100m del punto anterior, muy por debajo de los 5km
        longitud: -61.356,
        especie: 'Perro', // mayúscula a propósito: la coincidencia es case-insensitive
      }),
    );
    expect(respuestaEncontrado.status).toBe(201);
    const cuerpoEncontrado = await respuestaEncontrado.json();

    await esperarElJob();

    expect(repositorioNotificaciones.creadas).toEqual([
      {
        usuarioId: 'dueno-perdido',
        tipo: 'reporte_coincidente',
        referenciaTabla: 'reportes',
        referenciaId: cuerpoEncontrado.id,
      },
    ]);
  });

  it('especies distintas no generan notificación de coincidencia', async () => {
    autenticarComo('dueno-perdido');
    await POST(crearRequest(REPORTE_PERDIDO));

    autenticarComo('vecino-encontro');
    await POST(
      crearRequest({
        tipo: 'encontrado',
        descripcion: 'Encontré un gato cerca de la plaza central.',
        fotoUrl: fotoValida,
        latitud: -37.9995,
        longitud: -61.356,
        especie: 'gato',
      }),
    );

    await esperarElJob();

    expect(repositorioNotificaciones.creadas).toHaveLength(0);
  });

  it('un "encontrado" fuera del radio geográfico no genera notificación', async () => {
    autenticarComo('dueno-perdido');
    await POST(crearRequest(REPORTE_PERDIDO));

    autenticarComo('vecino-lejos');
    await POST(
      crearRequest({
        tipo: 'encontrado',
        descripcion: 'Encontré un perro suelto lejos de acá.',
        fotoUrl: fotoValida,
        latitud: -38.5, // muy lejos del reporte 'perdido' (~50km+)
        longitud: -61.3565,
        especie: 'perro',
      }),
    );

    await esperarElJob();

    expect(repositorioNotificaciones.creadas).toHaveLength(0);
  });

  it('un reporte "perdido" ya resuelto no genera coincidencia (estado NOT IN resuelto/cerrado)', async () => {
    autenticarComo('dueno-perdido');
    const respuestaPerdido = await POST(crearRequest(REPORTE_PERDIDO));
    const cuerpoPerdido = await respuestaPerdido.json();
    // Simula que el municipio ya lo cerró — el fake permite mutar el estado
    // directamente para no depender de un caso de uso de cambio de estado
    // que todavía no existe en este módulo.
    (repositorioReportes as unknown as { reportes: Array<{ id: string; estado: string }> }).reportes.find(
      (r) => r.id === cuerpoPerdido.id,
    )!.estado = 'resuelto';

    autenticarComo('vecino-encontro');
    await POST(
      crearRequest({
        tipo: 'encontrado',
        descripcion: 'Encontré un perro suelto cerca de la plaza central.',
        fotoUrl: fotoValida,
        latitud: -37.9995,
        longitud: -61.356,
        especie: 'perro',
      }),
    );

    await esperarElJob();

    expect(repositorioNotificaciones.creadas).toHaveLength(0);
  });
});
