/**
 * @jest-environment node
 *
 * Paso 4 del ticket "CRUD de historiales_compartidos con autorización
 * explícita y revocable" (Módulo 6): confirma de punta a punta que compartir
 * el historial con uno mismo responde 400 / PEA-VETADV-003, y que la
 * funcionalidad completa queda detrás del feature flag (Paso 3).
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  DatosCompartirHistorial,
  HistorialCompartido,
  IRepositorioHistorialesCompartidos,
} from '@dominio/puertos/IRepositorioHistorialesCompartidos';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import { Mascota } from '@dominio/entidades/Mascota';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { POST as compartirHistorial } from '@app/api/veterinarios/historiales-compartidos/route';
import { PATCH as revocarHistorial } from '@app/api/veterinarios/historiales-compartidos/[id]/revocar/route';

const historialId = '44444444-4444-4444-4444-444444444444';
const veterinarioOrigenId = '11111111-1111-1111-1111-111111111111';
const veterinarioDestinoId = '22222222-2222-2222-2222-222222222222';
const otroVeterinarioId = '66666666-6666-6666-6666-666666666666';
const mascotaId = '33333333-3333-3333-3333-333333333333';

const mascota = Mascota.reconstruir(mascotaId, {
  dueñoId: 'dueño-1',
  nombre: 'Firulais',
  especie: 'perro',
  fotoUrl: 'https://ejemplo.test/foto.jpg',
  raza: null,
  edadAproximada: null,
  identificacionChip: null,
});

const historialActivo: HistorialCompartido = {
  id: historialId,
  mascotaId,
  veterinarioOrigenId,
  veterinarioDestinoId,
  autorizadoEn: new Date('2026-09-14T10:00:00.000Z'),
  revocadoEn: null,
};

class RepositorioHistorialesFalso implements IRepositorioHistorialesCompartidos {
  public creados: DatosCompartirHistorial[] = [];
  public actual: HistorialCompartido | null = historialActivo;

  async crear(datos: DatosCompartirHistorial): Promise<HistorialCompartido> {
    this.creados.push(datos);
    return { ...historialActivo, ...datos, id: 'historial-nuevo' };
  }

  async obtenerActual(): Promise<HistorialCompartido | null> {
    return this.actual;
  }

  async listarPorOrigen(): Promise<HistorialCompartido[]> {
    return this.actual ? [this.actual] : [];
  }

  async revocar(
    id: string,
    veterinarioOrigenIdSolicitante: string,
  ): Promise<HistorialCompartido | null> {
    if (
      !this.actual ||
      this.actual.id !== id ||
      this.actual.veterinarioOrigenId !== veterinarioOrigenIdSolicitante
    ) {
      return null;
    }
    return { ...this.actual, revocadoEn: new Date('2026-09-14T12:00:00.000Z') };
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    if (usuarioId === otroVeterinarioId) {
      return {
        id: usuarioId,
        email: 'otro@ejemplo.test',
        rol: 'veterinario',
        estadoVerificacion: 'verificado',
        verificadoEn: new Date(),
      };
    }
    if (usuarioId === veterinarioOrigenId || usuarioId === veterinarioDestinoId) {
      return {
        id: usuarioId,
        email: 'vet@ejemplo.test',
        rol: 'veterinario',
        estadoVerificacion: 'verificado',
        verificadoEn: new Date(),
      };
    }
    return null;
  }
}

class RepositorioMascotasFalso implements IRepositorioMascotas {
  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }
  async buscarPorId(): Promise<Mascota | null> {
    return mascota;
  }
  async listarPorDueño(): Promise<never[]> {
    throw new Error('no usado en este test');
  }
  async actualizar(): Promise<never> {
    throw new Error('no usado en este test');
  }
  async darDeBaja(): Promise<void> {
    throw new Error('no usado en este test');
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId
      ? { data: { user: { id: usuarioId } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequestJson(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const ORIGINAL_FLAG = process.env.FEATURE_HISTORIALES_COMPARTIDOS;

describe('Endpoints de historiales_compartidos (Módulo 6, Paso 3: feature flag)', () => {
  afterAll(() => {
    process.env.FEATURE_HISTORIALES_COMPARTIDOS = ORIGINAL_FLAG;
  });

  beforeEach(() => {
    getUserMock.mockReset();
    container.reset();
    container.registerInstance<IRepositorioHistorialesCompartidos>(
      'IRepositorioHistorialesCompartidos',
      new RepositorioHistorialesFalso(),
    );
    container.registerInstance<IRepositorioMascotas>(
      'IRepositorioMascotas',
      new RepositorioMascotasFalso(),
    );
    container.registerInstance<IRepositorioPerfil>(
      'IRepositorioPerfil',
      new RepositorioPerfilFalso(),
    );
  });

  it('Paso 3: con el flag deshabilitado (default), rechaza con 403 / PEA-SIS-002 aunque haya sesión válida', async () => {
    delete process.env.FEATURE_HISTORIALES_COMPARTIDOS;
    autenticarComo(veterinarioOrigenId);

    const respuesta = await compartirHistorial(
      crearRequestJson('/api/veterinarios/historiales-compartidos', 'POST', {
        mascotaId,
        veterinarioDestinoId,
      }),
    );

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it('Paso 3: con el flag en "false" explícito, también rechaza con 403 / PEA-SIS-002', async () => {
    process.env.FEATURE_HISTORIALES_COMPARTIDOS = 'false';
    autenticarComo(veterinarioOrigenId);

    const respuesta = await revocarHistorial(
      crearRequestJson(`/api/veterinarios/historiales-compartidos/${historialId}/revocar`, 'PATCH'),
      { params: { id: historialId } },
    );

    expect(respuesta.status).toBe(403);
  });

  describe('con el flag habilitado', () => {
    beforeEach(() => {
      process.env.FEATURE_HISTORIALES_COMPARTIDOS = 'true';
    });

    it('Paso 1: comparte el historial (201) cuando origen y destino son veterinarios distintos', async () => {
      autenticarComo(veterinarioOrigenId);

      const respuesta = await compartirHistorial(
        crearRequestJson('/api/veterinarios/historiales-compartidos', 'POST', {
          mascotaId,
          veterinarioDestinoId,
        }),
      );

      expect(respuesta.status).toBe(201);
      const cuerpo = await respuesta.json();
      expect(cuerpo.veterinarioOrigenId).toBe(veterinarioOrigenId);
      expect(cuerpo.veterinarioDestinoId).toBe(veterinarioDestinoId);
    });

    it('AC / Paso 4: rechaza con 400 / PEA-VETADV-003 al intentar compartir el historial consigo mismo', async () => {
      autenticarComo(veterinarioOrigenId);

      const respuesta = await compartirHistorial(
        crearRequestJson('/api/veterinarios/historiales-compartidos', 'POST', {
          mascotaId,
          veterinarioDestinoId: veterinarioOrigenId,
        }),
      );

      expect(respuesta.status).toBe(400);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-VETADV-003');
    });

    it('responde 401 sin sesión', async () => {
      autenticarComo(null);

      const respuesta = await compartirHistorial(
        crearRequestJson('/api/veterinarios/historiales-compartidos', 'POST', {
          mascotaId,
          veterinarioDestinoId,
        }),
      );

      expect(respuesta.status).toBe(401);
    });

    it('AC: el veterinario origen revoca un historial activo (200), actualizando revocadoEn', async () => {
      autenticarComo(veterinarioOrigenId);

      const respuesta = await revocarHistorial(
        crearRequestJson(
          `/api/veterinarios/historiales-compartidos/${historialId}/revocar`,
          'PATCH',
        ),
        { params: { id: historialId } },
      );

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.revocadoEn).not.toBeNull();
    });

    it('rechaza con 403 / PEA-SIS-002 si quien revoca no es el veterinario origen', async () => {
      autenticarComo(otroVeterinarioId);

      const respuesta = await revocarHistorial(
        crearRequestJson(
          `/api/veterinarios/historiales-compartidos/${historialId}/revocar`,
          'PATCH',
        ),
        { params: { id: historialId } },
      );

      expect(respuesta.status).toBe(403);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-002');
    });

    it('responde 404 / PEA-VETADV-006 si el historial no existe', async () => {
      container.reset();
      const repositorioHistoriales = new RepositorioHistorialesFalso();
      repositorioHistoriales.actual = null;
      container.registerInstance<IRepositorioHistorialesCompartidos>(
        'IRepositorioHistorialesCompartidos',
        repositorioHistoriales,
      );
      container.registerInstance<IRepositorioMascotas>(
        'IRepositorioMascotas',
        new RepositorioMascotasFalso(),
      );
      container.registerInstance<IRepositorioPerfil>(
        'IRepositorioPerfil',
        new RepositorioPerfilFalso(),
      );
      autenticarComo(veterinarioOrigenId);

      const respuesta = await revocarHistorial(
        crearRequestJson(
          `/api/veterinarios/historiales-compartidos/${historialId}/revocar`,
          'PATCH',
        ),
        { params: { id: historialId } },
      );

      expect(respuesta.status).toBe(404);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-VETADV-006');
    });
  });
});
