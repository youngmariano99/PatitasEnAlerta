/**
 * @jest-environment node
 */
import { CompletarCuestionarioAdoptante } from '@aplicacion/casos-de-uso/adopcion-compatibilidad/CompletarCuestionarioAdoptante';
import type { CuestionarioAdoptante } from '@dominio/entidades/CuestionarioAdoptante';
import type { IRepositorioCuestionariosAdoptante } from '@dominio/puertos/IRepositorioCuestionariosAdoptante';

const usuarioId = '11111111-1111-1111-1111-111111111111';

function crearCuestionario(overrides?: Partial<CuestionarioAdoptante>): CuestionarioAdoptante {
  return {
    id: 'cuestionario-1',
    usuarioId,
    horasSoloEstimadas: null,
    presenciaNinos: null,
    espacioDisponible: null,
    experienciaPrevia: null,
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
    updatedAt: new Date('2026-09-15T10:00:00.000Z'),
    ...overrides,
  };
}

function crearFakes(opciones?: { existente?: CuestionarioAdoptante | null }) {
  const repositorioCuestionarios: jest.Mocked<IRepositorioCuestionariosAdoptante> = {
    obtenerPropio: jest.fn().mockResolvedValue(opciones?.existente ?? null),
    crear: jest.fn().mockImplementation(async (usuarioIdRecibido: string, datos) =>
      crearCuestionario({ usuarioId: usuarioIdRecibido, ...datos }),
    ),
    actualizar: jest.fn().mockImplementation(async (id: string, datos) => crearCuestionario({ id, ...datos })),
  };
  return { repositorioCuestionarios };
}

describe('CompletarCuestionarioAdoptante', () => {
  it('Paso 1: crea un cuestionario nuevo cuando el usuario nunca completó uno', async () => {
    const { repositorioCuestionarios } = crearFakes({ existente: null });
    const caso = new CompletarCuestionarioAdoptante(repositorioCuestionarios);

    const resultado = await caso.ejecutar({
      datosCrudos: { horasSoloEstimadas: 4, presenciaNinos: false, espacioDisponible: 'departamento', experienciaPrevia: 'Ninguna' },
      usuarioId,
    });

    expect(resultado.usuarioId).toBe(usuarioId);
    expect(repositorioCuestionarios.crear).toHaveBeenCalledWith(usuarioId, {
      horasSoloEstimadas: 4,
      presenciaNinos: false,
      espacioDisponible: 'departamento',
      experienciaPrevia: 'Ninguna',
    });
    expect(repositorioCuestionarios.actualizar).not.toHaveBeenCalled();
  });

  it('Paso 1: actualiza el cuestionario existente en vez de crear uno duplicado', async () => {
    const existente = crearCuestionario({ id: 'cuestionario-existente' });
    const { repositorioCuestionarios } = crearFakes({ existente });
    const caso = new CompletarCuestionarioAdoptante(repositorioCuestionarios);

    await caso.ejecutar({ datosCrudos: { espacioDisponible: 'casa_patio_grande' }, usuarioId });

    expect(repositorioCuestionarios.actualizar).toHaveBeenCalledWith('cuestionario-existente', {
      horasSoloEstimadas: null,
      presenciaNinos: null,
      espacioDisponible: 'casa_patio_grande',
      experienciaPrevia: null,
    });
    expect(repositorioCuestionarios.crear).not.toHaveBeenCalled();
  });

  it('permite guardar avance parcial (todos los campos son opcionales)', async () => {
    const { repositorioCuestionarios } = crearFakes();
    const caso = new CompletarCuestionarioAdoptante(repositorioCuestionarios);

    await expect(caso.ejecutar({ datosCrudos: {}, usuarioId })).resolves.toBeDefined();
    expect(repositorioCuestionarios.crear).toHaveBeenCalledWith(usuarioId, {
      horasSoloEstimadas: null,
      presenciaNinos: null,
      espacioDisponible: null,
      experienciaPrevia: null,
    });
  });

  // AC explícito del ticket.
  it('rechaza con 400 (Zod) un espacioDisponible fuera del catálogo soportado', async () => {
    const { repositorioCuestionarios } = crearFakes();
    const caso = new CompletarCuestionarioAdoptante(repositorioCuestionarios);

    await expect(caso.ejecutar({ datosCrudos: { espacioDisponible: 'mansión' }, usuarioId })).rejects.toThrow();
    expect(repositorioCuestionarios.crear).not.toHaveBeenCalled();
  });

  it('nunca envía usuarioId como parte de los datos del cuestionario al repositorio', async () => {
    const { repositorioCuestionarios } = crearFakes();
    const caso = new CompletarCuestionarioAdoptante(repositorioCuestionarios);

    await caso.ejecutar({ datosCrudos: {}, usuarioId });

    const [, datosEnviados] = repositorioCuestionarios.crear.mock.calls[0]!;
    expect(datosEnviados).not.toHaveProperty('usuarioId');
  });
});
