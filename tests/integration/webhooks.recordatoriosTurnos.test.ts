/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Job de recordatorios sobre turnos próximos con
 * seguimiento de no-show" (Módulo 6): verifica que el disparador
 * (POST /api/webhooks/recordatorios-turnos) notifica exactamente los turnos
 * cuya franja_inicio cae dentro de la ventana configurada, y ninguno fuera
 * de ella.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioTurnos, TurnoRecordatorio } from '@dominio/puertos/IRepositorioTurnos';
import type { DatosNotificacion, INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import { POST } from '@app/api/webhooks/recordatorios-turnos/route';

const SECRETO = 'secreto-de-test-para-el-cron';
const ORIGINAL_ENV = process.env.CRON_JOBS_SECRET;

const TURNO_DENTRO_VENTANA = 'turno-dentro-ventana';
const TURNO_FUERA_VENTANA = 'turno-fuera-ventana';
const RESERVADO_POR_A = 'dueno-a';
const RESERVADO_POR_B = 'dueno-b';

class RepositorioTurnosFalso implements IRepositorioTurnos {
  public ultimaLlamada: { desde: Date; hasta: Date } | null = null;

  async contarDisponiblesPorEvento(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async crearLote(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async obtenerActual(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async reservar(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarPropios(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async cancelar(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async reprogramar(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarFranjasExistentes(): Promise<never[]> {
    throw new Error('no usado en este test');
  }

  async listarReservadosPorProveedor(): Promise<never> {
    throw new Error('no usado en este test');
  }

  // El fake reproduce el mismo filtro que PrismaTurnoRepositorio.listarReservadosEnVentana
  // (franja_inicio dentro de [desde, hasta)) sobre un dataset con un turno
  // fuera de la ventana, para probar el recorte de punta a punta.
  async listarReservadosEnVentana(desde: Date, hasta: Date): Promise<TurnoRecordatorio[]> {
    this.ultimaLlamada = { desde, hasta };
    const dataset: TurnoRecordatorio[] = [
      { id: TURNO_DENTRO_VENTANA, reservadoPor: RESERVADO_POR_A, franjaInicio: new Date('2026-09-14T20:00:00.000Z') },
      { id: TURNO_FUERA_VENTANA, reservadoPor: RESERVADO_POR_B, franjaInicio: new Date('2026-09-20T09:00:00.000Z') },
    ];
    return dataset.filter((turno) => turno.franjaInicio >= desde && turno.franjaInicio < hasta);
  }

  async actualizarAsistio(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async calcularTasaNoShow(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

class NotificacionesRepositorioFalso implements INotificacionesRepositorio {
  public creadas: DatosNotificacion[] = [];

  async existePorReferencia(): Promise<boolean> {
    return false;
  }

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

function crearRequest(headers: Record<string, string> = { 'x-cron-secret': SECRETO }): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/recordatorios-turnos', { method: 'POST', headers });
}

describe('POST /api/webhooks/recordatorios-turnos (RecordatorioTurnoJob)', () => {
  let repositorioTurnos: RepositorioTurnosFalso;
  let repositorioNotificaciones: NotificacionesRepositorioFalso;

  beforeAll(() => {
    process.env.CRON_JOBS_SECRET = SECRETO;
  });

  afterAll(() => {
    process.env.CRON_JOBS_SECRET = ORIGINAL_ENV;
  });

  beforeEach(() => {
    repositorioTurnos = new RepositorioTurnosFalso();
    repositorioNotificaciones = new NotificacionesRepositorioFalso();
    container.reset();
    container.registerInstance<IRepositorioTurnos>('IRepositorioTurnos', repositorioTurnos);
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', repositorioNotificaciones);
  });

  it('rechaza sin el header x-cron-secret (401 / PEA-SIS-001), sin consultar turnos', async () => {
    const respuesta = await POST(crearRequest({}));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
    expect(repositorioNotificaciones.creadas).toHaveLength(0);
  });

  it('rechaza con un secreto incorrecto (401 / PEA-SIS-001)', async () => {
    const respuesta = await POST(crearRequest({ 'x-cron-secret': 'secreto-equivocado' }));

    expect(respuesta.status).toBe(401);
    expect(repositorioNotificaciones.creadas).toHaveLength(0);
  });

  it('AC: notifica únicamente el turno cuya franja_inicio cae dentro de la ventana configurada, nunca el que está fuera', async () => {
    const respuesta = await POST(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual({ turnosEnVentana: 1, notificados: 1 });
    expect(repositorioNotificaciones.creadas).toEqual([
      { usuarioId: RESERVADO_POR_A, tipo: 'turno_recordatorio', referenciaTabla: 'turnos', referenciaId: TURNO_DENTRO_VENTANA },
    ]);
    expect(repositorioNotificaciones.creadas.some((n) => n.referenciaId === TURNO_FUERA_VENTANA)).toBe(false);
  });

  it('la ventana consultada arranca en "ahora" y se extiende 24hs hacia adelante', async () => {
    await POST(crearRequest());

    expect(repositorioTurnos.ultimaLlamada).not.toBeNull();
    const { desde, hasta } = repositorioTurnos.ultimaLlamada!;
    const horasDeVentana = (hasta.getTime() - desde.getTime()) / (60 * 60 * 1000);
    expect(horasDeVentana).toBe(24);
  });
});
