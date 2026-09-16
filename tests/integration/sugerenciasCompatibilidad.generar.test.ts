/**
 * @jest-environment node
 *
 * Paso 4 del ticket "EstrategiaMatchAdopcion con Strategy intercambiable
 * (reglas → semántico → LLM)" (Módulo 9): confirma que
 * sugerencias_compatibilidad.metodo='reglas' en la implementación inicial,
 * más el resto de los AC (cuestionario incompleto, animal no disponible
 * excluido de las sugerencias).
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { CuestionarioAdoptante } from '@dominio/entidades/CuestionarioAdoptante';
import type { IRepositorioCuestionariosAdoptante } from '@dominio/puertos/IRepositorioCuestionariosAdoptante';
import { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';
import type { IRepositorioFichasAdopcion, PaginaFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioSugerenciasCompatibilidad, SugerenciaCompatibilidad } from '@dominio/puertos/IRepositorioSugerenciasCompatibilidad';
import { CompatibilidadPorReglas, type IEstrategiaCompatibilidad } from '@dominio/estrategias/EstrategiaCompatibilidad';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { POST as generarSugerencias } from '@app/api/adopcion-compatibilidad/sugerencias/route';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const cuestionarioId = '22222222-2222-2222-2222-222222222222';

class RepositorioCuestionariosFalso implements IRepositorioCuestionariosAdoptante {
  public cuestionario: CuestionarioAdoptante | null = {
    id: cuestionarioId,
    usuarioId,
    horasSoloEstimadas: 8,
    presenciaNinos: true,
    espacioDisponible: 'departamento',
    experienciaPrevia: 'Tuvo un gato',
    createdAt: new Date('2026-09-15T10:00:00.000Z'),
    updatedAt: new Date('2026-09-15T10:00:00.000Z'),
  };

  async obtenerPropio(): Promise<CuestionarioAdoptante | null> {
    return this.cuestionario;
  }
  async crear(): Promise<CuestionarioAdoptante> {
    throw new Error('no usado en este test');
  }
  async actualizar(): Promise<CuestionarioAdoptante> {
    throw new Error('no usado en este test');
  }
}

function crearFicha(id: string, estado: string): FichaAdopcion {
  return FichaAdopcion.reconstruir(
    id,
    {
      municipioId: 'municipio-1',
      nombreAnimal: `Animal ${id}`,
      especie: 'perro',
      edadAproximada: 3,
      tamano: 'mediano',
      temperamento: null,
      estadoSalud: null,
      requisitosAdopcion: null,
      fotoUrl: `https://res.cloudinary.com/patitas-en-alerta/adopcion/${id}.jpg`,
      estado,
      nivelEnergia: 'bajo',
      compatibleNinos: true,
      compatibleOtrosAnimales: null,
      necesidadesMedicasDetalle: null,
    },
    new Date('2026-09-15T09:00:00.000Z'),
  );
}

class RepositorioFichasFalso implements IRepositorioFichasAdopcion {
  // Solo 'ficha-disponible' está activa — 'ficha-adoptada' simula el animal
  // que dejó de estar 'disponible' (AC explícito del ticket).
  public disponibles: FichaAdopcion[] = [crearFicha('ficha-disponible', 'disponible')];

  async crear(): Promise<FichaAdopcion> {
    throw new Error('no usado en este test');
  }
  async buscarPorId(): Promise<FichaAdopcion | null> {
    throw new Error('no usado en este test');
  }
  async actualizar(): Promise<FichaAdopcion> {
    throw new Error('no usado en este test');
  }
  async darDeBaja(): Promise<FichaAdopcion> {
    throw new Error('no usado en este test');
  }
  async listarPorMunicipio(): Promise<PaginaFichasAdopcion> {
    throw new Error('no usado en este test');
  }
  async listarPublico(pagina: number, porPagina: number): Promise<PaginaFichasAdopcion> {
    return { items: this.disponibles, total: this.disponibles.length, pagina, porPagina };
  }
}

class RepositorioSugerenciasFalso implements IRepositorioSugerenciasCompatibilidad {
  public creadas: SugerenciaCompatibilidad[] = [];
  private contador = 0;

  async crear(datos: Parameters<IRepositorioSugerenciasCompatibilidad['crear']>[0]): Promise<SugerenciaCompatibilidad> {
    this.contador += 1;
    const sugerencia: SugerenciaCompatibilidad = { id: `sugerencia-${this.contador}`, generadoEn: new Date('2026-09-15T11:00:00.000Z'), ...datos };
    this.creadas.push(sugerencia);
    return sugerencia;
  }
}

function autenticarComo(usuarioIdSesion: string | null) {
  getUserMock.mockResolvedValue(
    usuarioIdSesion
      ? { data: { user: { id: usuarioIdSesion } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(): NextRequest {
  return new NextRequest('http://localhost/api/adopcion-compatibilidad/sugerencias', { method: 'POST' });
}

describe('POST /api/adopcion-compatibilidad/sugerencias (Módulo 9, Paso 2/4)', () => {
  let repositorioCuestionarios: RepositorioCuestionariosFalso;
  let repositorioFichas: RepositorioFichasFalso;
  let repositorioSugerencias: RepositorioSugerenciasFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioCuestionarios = new RepositorioCuestionariosFalso();
    repositorioFichas = new RepositorioFichasFalso();
    repositorioSugerencias = new RepositorioSugerenciasFalso();
    container.reset();
    container.registerInstance<IRepositorioCuestionariosAdoptante>('IRepositorioCuestionariosAdoptante', repositorioCuestionarios);
    container.registerInstance<IRepositorioFichasAdopcion>('IRepositorioFichasAdopcion', repositorioFichas);
    container.registerInstance<IRepositorioSugerenciasCompatibilidad>('IRepositorioSugerenciasCompatibilidad', repositorioSugerencias);
    // `container.reset()` limpia TODOS los registros, incluidos los que
    // `contenedor-di.ts` ya hizo al importarse una sola vez — se re-registra
    // acá la implementación REAL (`CompatibilidadPorReglas`, nunca un mock)
    // porque es justo lo que este test verifica (Paso 3/4, AC explícito):
    // que la estrategia activa por configuración sea 'reglas'.
    container.registerInstance<IEstrategiaCompatibilidad>('IEstrategiaCompatibilidad', new CompatibilidadPorReglas());
  });

  it('AC / Paso 4: inserta sugerencias con metodo="reglas" (implementación inicial vía DI)', async () => {
    autenticarComo(usuarioId);

    const respuesta = await generarSugerencias(crearRequest());

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toHaveLength(1);
    expect(cuerpo[0].metodo).toBe('reglas');
    expect(repositorioSugerencias.creadas).toHaveLength(1);
    expect(repositorioSugerencias.creadas[0]!.metodo).toBe('reglas');
    expect(repositorioSugerencias.creadas[0]!.cuestionarioId).toBe(cuestionarioId);
  });

  it('AC: un animal que dejó de estar "disponible" nunca se sugiere', async () => {
    autenticarComo(usuarioId);
    repositorioFichas.disponibles = []; // el único candidato ya no está disponible

    const respuesta = await generarSugerencias(crearRequest());

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toHaveLength(0);
    expect(repositorioSugerencias.creadas).toHaveLength(0);
  });

  it('responde 400 / PEA-ADOP-001 si el cuestionario propio está incompleto', async () => {
    autenticarComo(usuarioId);
    repositorioCuestionarios.cuestionario = { ...repositorioCuestionarios.cuestionario!, espacioDisponible: null };

    const respuesta = await generarSugerencias(crearRequest());

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-ADOP-001');
    expect(repositorioSugerencias.creadas).toHaveLength(0);
  });

  it('responde 404 / PEA-ADOP-003 si el usuario nunca completó un cuestionario', async () => {
    autenticarComo(usuarioId);
    repositorioCuestionarios.cuestionario = null;

    const respuesta = await generarSugerencias(crearRequest());

    expect(respuesta.status).toBe(404);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-ADOP-003');
  });

  it('responde 401 sin sesión activa', async () => {
    autenticarComo(null);

    const respuesta = await generarSugerencias(crearRequest());

    expect(respuesta.status).toBe(401);
  });
});
