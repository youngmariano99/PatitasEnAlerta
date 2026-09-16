/**
 * @jest-environment node
 *
 * Paso 4 del ticket "CRUD de cuestionarios_adoptante propio del usuario"
 * (Módulo 9): completa el cuestionario y confirma su persistencia asociada
 * al usuario, más el resto de los AC (validación de espacio_disponible,
 * acceso exclusivo al propio cuestionario).
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  CuestionarioAdoptante,
  DatosCuestionarioAdoptante,
} from '@dominio/entidades/CuestionarioAdoptante';
import type { IRepositorioCuestionariosAdoptante } from '@dominio/puertos/IRepositorioCuestionariosAdoptante';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import {
  GET as obtenerCuestionario,
  POST as completarCuestionario,
} from '@app/api/adopcion-compatibilidad/cuestionario/route';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const otroUsuarioId = '55555555-5555-5555-5555-555555555555';

class RepositorioCuestionariosFalso implements IRepositorioCuestionariosAdoptante {
  public porUsuario = new Map<string, CuestionarioAdoptante>();
  private contador = 0;

  async obtenerPropio(usuarioIdConsultado: string): Promise<CuestionarioAdoptante | null> {
    return this.porUsuario.get(usuarioIdConsultado) ?? null;
  }

  async crear(
    usuarioIdRecibido: string,
    datos: DatosCuestionarioAdoptante,
  ): Promise<CuestionarioAdoptante> {
    this.contador += 1;
    const cuestionario: CuestionarioAdoptante = {
      id: `cuestionario-${this.contador}`,
      usuarioId: usuarioIdRecibido,
      ...datos,
      createdAt: new Date('2026-09-15T10:00:00.000Z'),
      updatedAt: new Date('2026-09-15T10:00:00.000Z'),
    };
    this.porUsuario.set(usuarioIdRecibido, cuestionario);
    return cuestionario;
  }

  async actualizar(id: string, datos: DatosCuestionarioAdoptante): Promise<CuestionarioAdoptante> {
    const existente = Array.from(this.porUsuario.values()).find((c) => c.id === id)!;
    const actualizado: CuestionarioAdoptante = {
      ...existente,
      ...datos,
      updatedAt: new Date('2026-09-15T11:00:00.000Z'),
    };
    this.porUsuario.set(existente.usuarioId, actualizado);
    return actualizado;
  }
}

function autenticarComo(usuarioIdSesion: string | null) {
  getUserMock.mockResolvedValue(
    usuarioIdSesion
      ? { data: { user: { id: usuarioIdSesion } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('Cuestionario de estilo de vida del adoptante (Módulo 9, Paso 1/2/4)', () => {
  let repositorioCuestionarios: RepositorioCuestionariosFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioCuestionarios = new RepositorioCuestionariosFalso();
    container.reset();
    container.registerInstance<IRepositorioCuestionariosAdoptante>(
      'IRepositorioCuestionariosAdoptante',
      repositorioCuestionarios,
    );
  });

  const datosCompletos = {
    horasSoloEstimadas: 4,
    presenciaNinos: false,
    espacioDisponible: 'departamento',
    experienciaPrevia: 'Tuvo un gato durante 5 años.',
  };

  it('AC / Paso 4: completa el cuestionario y lo persiste asociado al usuario autenticado', async () => {
    autenticarComo(usuarioId);

    const respuesta = await completarCuestionario(
      crearRequest('/api/adopcion-compatibilidad/cuestionario', 'POST', datosCompletos),
    );

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.usuarioId).toBe(usuarioId);
    expect(cuerpo.espacioDisponible).toBe('departamento');
    expect(repositorioCuestionarios.porUsuario.get(usuarioId)?.experienciaPrevia).toBe(
      'Tuvo un gato durante 5 años.',
    );
  });

  it('completar dos veces actualiza el mismo cuestionario en vez de duplicarlo', async () => {
    autenticarComo(usuarioId);
    await completarCuestionario(
      crearRequest('/api/adopcion-compatibilidad/cuestionario', 'POST', datosCompletos),
    );

    const segundaRespuesta = await completarCuestionario(
      crearRequest('/api/adopcion-compatibilidad/cuestionario', 'POST', {
        espacioDisponible: 'casa_patio_grande',
      }),
    );

    expect(segundaRespuesta.status).toBe(201);
    const cuerpo = await segundaRespuesta.json();
    expect(cuerpo.id).toBe('cuestionario-1');
    expect(cuerpo.espacioDisponible).toBe('casa_patio_grande');
  });

  // AC explícito del ticket.
  it('AC: rechaza con 400 un espacioDisponible fuera del catálogo soportado', async () => {
    autenticarComo(usuarioId);

    const respuesta = await completarCuestionario(
      crearRequest('/api/adopcion-compatibilidad/cuestionario', 'POST', {
        espacioDisponible: 'mansión',
      }),
    );

    expect(respuesta.status).toBe(400);
    expect(repositorioCuestionarios.porUsuario.size).toBe(0);
  });

  it('responde 401 sin sesión activa', async () => {
    autenticarComo(null);

    const respuesta = await completarCuestionario(
      crearRequest('/api/adopcion-compatibilidad/cuestionario', 'POST', datosCompletos),
    );

    expect(respuesta.status).toBe(401);
  });

  describe('GET /api/adopcion-compatibilidad/cuestionario', () => {
    it('AC: devuelve exclusivamente el cuestionario del usuario autenticado, nunca el de otro adoptante', async () => {
      autenticarComo(usuarioId);
      await completarCuestionario(
        crearRequest('/api/adopcion-compatibilidad/cuestionario', 'POST', datosCompletos),
      );

      autenticarComo(otroUsuarioId);
      await completarCuestionario(
        crearRequest('/api/adopcion-compatibilidad/cuestionario', 'POST', {
          espacioDisponible: 'casa_patio_pequeño',
        }),
      );

      const respuestaOtro = await obtenerCuestionario(
        crearRequest('/api/adopcion-compatibilidad/cuestionario', 'GET'),
      );
      const cuerpoOtro = await respuestaOtro.json();

      expect(cuerpoOtro.usuarioId).toBe(otroUsuarioId);
      expect(cuerpoOtro.espacioDisponible).toBe('casa_patio_pequeño');
    });

    it('responde 404 / PEA-ADOP-003 si el usuario todavía no completó ningún cuestionario', async () => {
      autenticarComo(usuarioId);

      const respuesta = await obtenerCuestionario(
        crearRequest('/api/adopcion-compatibilidad/cuestionario', 'GET'),
      );

      expect(respuesta.status).toBe(404);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-ADOP-003');
    });

    it('responde 401 sin sesión activa', async () => {
      autenticarComo(null);

      const respuesta = await obtenerCuestionario(
        crearRequest('/api/adopcion-compatibilidad/cuestionario', 'GET'),
      );

      expect(respuesta.status).toBe(401);
    });
  });
});
