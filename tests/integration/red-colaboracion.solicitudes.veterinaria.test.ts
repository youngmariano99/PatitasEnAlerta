/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Endpoint de solicitudes filtradas por zona y
 * especialidad para veterinarios" (Módulo 5): confirma que un rescatista NO
 * accede a este endpoint (403). El fake reproduce el mismo filtro que
 * PrismaSolicitudesRecursoRepositorio.listarAsistenciaVeterinariaAbiertas
 * (tipo='asistencia_veterinaria' AND estado='abierta', + zona opcional)
 * sobre un dataset mixto, para probar el filtrado de punta a punta.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { FiltroZona } from '@dominio/puertos/IRepositorioReportes';
import type { IRepositorioSolicitudesRecurso, PaginaSolicitudesVeterinarias } from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { GET } from '@app/api/red-colaboracion/solicitudes/veterinaria/route';

const VETERINARIO_ID = '11111111-1111-1111-1111-111111111111';

interface FilaFake {
  id: string;
  organizacionId: string;
  tipo: string;
  estado: string;
  zonaLat: number;
  zonaLng: number;
}

const LEJOS_LAT = -34.6037; // Buenos Aires, fuera del radio del filtro de zona usado en los tests

const DATASET: FilaFake[] = [
  { id: 'sol-1', organizacionId: 'ong-1', tipo: 'asistencia_veterinaria', estado: 'abierta', zonaLat: -37.9989, zonaLng: -61.3565 },
  { id: 'sol-2', organizacionId: 'ong-1', tipo: 'asistencia_veterinaria', estado: 'abierta', zonaLat: -37.995, zonaLng: -61.36 },
  { id: 'sol-3', organizacionId: 'ong-2', tipo: 'asistencia_veterinaria', estado: 'abierta', zonaLat: LEJOS_LAT, zonaLng: -58.3816 },
  { id: 'sol-4', organizacionId: 'ong-1', tipo: 'asistencia_veterinaria', estado: 'cubierta', zonaLat: -37.9989, zonaLng: -61.3565 }, // no cuenta: no abierta
  { id: 'sol-5', organizacionId: 'ong-1', tipo: 'transito', estado: 'abierta', zonaLat: -37.9989, zonaLng: -61.3565 }, // no cuenta: otro tipo
];

function dentroDelRadio(fila: FilaFake, zona: FiltroZona): boolean {
  const deltaLatitud = zona.radioKm / 111;
  const deltaLongitud = zona.radioKm / (111 * Math.cos((zona.latitud * Math.PI) / 180));
  return Math.abs(fila.zonaLat - zona.latitud) <= deltaLatitud && Math.abs(fila.zonaLng - zona.longitud) <= deltaLongitud;
}

class RepositorioSolicitudesFalso implements IRepositorioSolicitudesRecurso {
  async crear(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async obtenerActual(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarAsistenciaVeterinariaAbiertas(
    zona: FiltroZona | undefined,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaSolicitudesVeterinarias> {
    const filtradas = DATASET.filter(
      (fila) =>
        fila.tipo === 'asistencia_veterinaria' && fila.estado === 'abierta' && (!zona || dentroDelRadio(fila, zona)),
    );
    const items = filtradas.slice((pagina - 1) * porPagina, (pagina - 1) * porPagina + porPagina).map((fila) => ({
      id: fila.id,
      organizacionId: fila.organizacionId,
      tipo: fila.tipo,
      descripcion: 'Necesitamos asistencia veterinaria urgente.',
      reporteId: null,
      estado: fila.estado,
      createdAt: new Date('2026-09-14T10:00:00.000Z'),
    }));
    return { items, total: filtradas.length, pagina, porPagina };
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'veterinario';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'vet@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: new Date() };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(query: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/red-colaboracion/solicitudes/veterinaria');
  Object.entries(query).forEach(([clave, valor]) => url.searchParams.set(clave, valor));
  return new NextRequest(url);
}

describe('GET /api/red-colaboracion/solicitudes/veterinaria (Filtrado de solicitudes de asistencia veterinaria)', () => {
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioSolicitudesRecurso>('IRepositorioSolicitudesRecurso', new RepositorioSolicitudesFalso());
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('un rescatista NO accede a este endpoint (403 / PEA-SIS-002) — verificación técnica del ticket', async () => {
    autenticarComo(VETERINARIO_ID);
    repositorioPerfil.rol = 'rescatista';

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
  });

  it.each(['dueño', 'organizacion', 'municipio', 'administrador', 'comerciante'])(
    'rechaza con 403 / PEA-SIS-002 para un usuario con rol %s',
    async (rol) => {
      autenticarComo(VETERINARIO_ID);
      repositorioPerfil.rol = rol;

      const respuesta = await GET(crearRequest());

      expect(respuesta.status).toBe(403);
    },
  );

  it('un veterinario recibe solo solicitudes tipo=asistencia_veterinaria y estado=abierta (sin filtro de zona)', async () => {
    autenticarComo(VETERINARIO_ID);

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.total).toBe(3);
    expect(cuerpo.items.map((i: { id: string }) => i.id).sort()).toEqual(['sol-1', 'sol-2', 'sol-3']);
  });

  it('filtra por zona: solo devuelve solicitudes de organizaciones dentro del radio pedido', async () => {
    autenticarComo(VETERINARIO_ID);

    const respuesta = await GET(crearRequest({ latitud: '-37.9989', longitud: '-61.3565', radioKm: '10' }));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.total).toBe(2);
    expect(cuerpo.items.map((i: { id: string }) => i.id).sort()).toEqual(['sol-1', 'sol-2']);
  });

  it('rechaza un filtro de zona incompleto (400 / PEA-SIS-005)', async () => {
    autenticarComo(VETERINARIO_ID);

    const respuesta = await GET(crearRequest({ latitud: '-37.9989' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });

  it('verificación técnica: aplica paginación server-side (porPagina recorta el resultado, total refleja el universo completo)', async () => {
    autenticarComo(VETERINARIO_ID);

    const respuesta = await GET(crearRequest({ pagina: '1', porPagina: '2' }));

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.items).toHaveLength(2);
    expect(cuerpo.total).toBe(3);
    expect(cuerpo.pagina).toBe(1);
    expect(cuerpo.porPagina).toBe(2);

    const segundaPagina = await GET(crearRequest({ pagina: '2', porPagina: '2' }));
    const cuerpoSegunda = await segundaPagina.json();
    expect(cuerpoSegunda.items).toHaveLength(1);
  });
});
