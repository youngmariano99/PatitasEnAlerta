/**
 * @jest-environment node
 */
import { ConRateLimitDecorator } from '@infraestructura/decoradores/ConRateLimitDecorator';
import { CrearReporte } from '@aplicacion/casos-de-uso/reportes/CrearReporte';
import type { ReporteCreado } from '@aplicacion/dtos/reportes/CrearReporteDto';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { IControlDeTasaConReintento, ResultadoControlDeTasa } from '@dominio/puertos/IControlDeTasaConReintento';
import { LimiteDeReportesExcedidoError } from '@dominio/errores/erroresReportes';

const REPORTE_CREADO: ReporteCreado = {
  id: 'reporte-1',
  tipo: 'perdido',
  subtipo: null,
  reportadoPor: 'usuario-1',
  mascotaId: null,
  descripcion: 'Se perdió cerca de la plaza.',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg',
  latitud: -37.9989,
  longitud: -61.3565,
  especie: null,
  estado: 'reportado',
  createdAt: '2026-08-01T12:00:00.000Z',
};

function crearPerfil(rol: string, estadoVerificacion: string): ResumenPerfilPropio {
  return { id: 'usuario-1', email: 'usuario@ejemplo.test', rol, estadoVerificacion, verificadoEn: null };
}

function crearFakes(opciones?: { estadoVerificacion?: string | null; resultadoAntiSaturacion?: ResultadoControlDeTasa }) {
  // `casoDeUsoEnvuelto` es un mock del propio CrearReporte (no una
  // subclase ni una reimplementación) — así el test verifica por
  // inspección que ConRateLimitDecorator delega `ejecutar()` tal cual,
  // sin reescribir nada de su lógica interna (verificación técnica del
  // ticket).
  const casoDeUsoEnvuelto = { ejecutar: jest.fn().mockResolvedValue(REPORTE_CREADO) } as unknown as jest.Mocked<CrearReporte>;

  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio:
      opciones && 'estadoVerificacion' in opciones && opciones.estadoVerificacion === null
        ? jest.fn().mockResolvedValue(null)
        : jest.fn().mockResolvedValue(crearPerfil('dueño', opciones?.estadoVerificacion ?? 'no_requerido')),
  };

  const controlDeTasaAntiSaturacion: jest.Mocked<IControlDeTasaConReintento> = {
    evaluar: jest.fn().mockResolvedValue(opciones?.resultadoAntiSaturacion ?? { permitido: true, reintentarEnSegundos: 0 }),
  };

  return { casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion };
}

const entrada = { datosCrudos: {}, reportadoPor: 'usuario-1' };

describe('ConRateLimitDecorator', () => {
  it('delega en CrearReporte.ejecutar() cuando el usuario está por debajo del límite anti-saturación', async () => {
    const { casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion } = crearFakes();
    const decorador = new ConRateLimitDecorator(casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion);

    const resultado = await decorador.ejecutar(entrada);

    expect(resultado).toBe(REPORTE_CREADO);
    expect(casoDeUsoEnvuelto.ejecutar).toHaveBeenCalledWith(entrada);
    expect(casoDeUsoEnvuelto.ejecutar).toHaveBeenCalledTimes(1);
  });

  it.each(['no_requerido', 'pendiente', 'rechazado'])(
    'aplica el límite anti-saturación a un usuario con estado_verificacion="%s"',
    async (estadoVerificacion) => {
      const { casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion } = crearFakes({ estadoVerificacion });

      await decoradorCon(casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion).ejecutar(entrada);

      expect(controlDeTasaAntiSaturacion.evaluar).toHaveBeenCalledWith('usuario-1');
    },
  );

  it('rechaza con PEA-REP-004 (429) y el Retry-After informado por el limitador, al sexto intento en la misma hora', async () => {
    const { casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion } = crearFakes({
      resultadoAntiSaturacion: { permitido: false, reintentarEnSegundos: 1800 },
    });
    const decorador = new ConRateLimitDecorator(casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion);

    await expect(decorador.ejecutar(entrada)).rejects.toMatchObject({
      codigo: 'PEA-REP-004',
      statusHttp: 429,
      reintentarEnSegundos: 1800,
    });
    // Cortó ANTES de delegar en el caso de uso envuelto — nunca llega a crear el reporte.
    expect(casoDeUsoEnvuelto.ejecutar).not.toHaveBeenCalled();
  });

  it('no aplica el límite anti-saturación a un usuario con estado_verificacion="verificado"', async () => {
    const { casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion } = crearFakes({
      estadoVerificacion: 'verificado',
      resultadoAntiSaturacion: { permitido: false, reintentarEnSegundos: 1800 }, // ni se consulta
    });
    const decorador = new ConRateLimitDecorator(casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion);

    const resultado = await decorador.ejecutar(entrada);

    expect(resultado).toBe(REPORTE_CREADO);
    expect(controlDeTasaAntiSaturacion.evaluar).not.toHaveBeenCalled();
    expect(casoDeUsoEnvuelto.ejecutar).toHaveBeenCalledWith(entrada);
  });

  it('trata a un usuario sin perfil resoluble como no verificado (defensivo: aplica igual el límite)', async () => {
    const { casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion } = crearFakes({ estadoVerificacion: null });
    const decorador = new ConRateLimitDecorator(casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion);

    await decorador.ejecutar(entrada);

    expect(controlDeTasaAntiSaturacion.evaluar).toHaveBeenCalledWith('usuario-1');
  });

  it('lanza LimiteDeReportesExcedidoError como instancia concreta (no un objeto genérico)', async () => {
    const { casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion } = crearFakes({
      resultadoAntiSaturacion: { permitido: false, reintentarEnSegundos: 60 },
    });
    const decorador = new ConRateLimitDecorator(casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion);

    await expect(decorador.ejecutar(entrada)).rejects.toBeInstanceOf(LimiteDeReportesExcedidoError);
  });
});

function decoradorCon(
  casoDeUsoEnvuelto: jest.Mocked<CrearReporte>,
  repositorioPerfil: jest.Mocked<IRepositorioPerfil>,
  controlDeTasaAntiSaturacion: jest.Mocked<IControlDeTasaConReintento>,
): ConRateLimitDecorator {
  return new ConRateLimitDecorator(casoDeUsoEnvuelto, repositorioPerfil, controlDeTasaAntiSaturacion);
}
