/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { DatosNuevoEvento, IRepositorioEventos, PaginaEventos } from '@dominio/puertos/IRepositorioEventos';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { DatosNuevoTurno, IRepositorioTurnos, TurnoGenerado } from '@dominio/puertos/IRepositorioTurnos';
import { TurneraMunicipio, type FuenteDisponibilidadEvento, type ProveedorTurnera } from '@dominio/estrategias/ProveedorTurnera';
import { Evento } from '@dominio/entidades/Evento';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, así que el orden de imports acá abajo no afecta el
// mockeo real (mismo criterio que tests/integration/reportes.crear.test.ts).
import { POST } from '@app/api/municipio/eventos/route';

class RepositorioEventosFalso implements IRepositorioEventos {
  public creados: DatosNuevoEvento[] = [];

  async crear(datos: DatosNuevoEvento): Promise<Evento> {
    this.creados.push(datos);
    return Evento.reconstruir(`evento-${this.creados.length}`, datos, new Date('2026-09-01T09:00:00.000Z'));
  }

  async listar(): Promise<PaginaEventos> {
    return { items: [], total: 0, pagina: 1, porPagina: 50 };
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'municipio';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'municipio@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: null };
  }
}

/** En memoria, real (no jest.fn): permite verificar el conteo real de filas creadas por evento (Paso 4). */
class RepositorioTurnosFalso implements IRepositorioTurnos {
  public turnos: TurnoGenerado[] = [];

  async contarDisponiblesPorEvento(eventoId: string): Promise<number> {
    return this.turnos.filter((t) => t.eventoId === eventoId && t.estado === 'disponible').length;
  }

  async crearLote(turnos: DatosNuevoTurno[]): Promise<TurnoGenerado[]> {
    const generados = turnos.map((turno, indice) => ({
      id: `turno-${this.turnos.length + indice + 1}`,
      ...turno,
      estado: 'disponible',
    }));
    this.turnos.push(...generados);
    return generados;
  }

  async obtenerActual(): Promise<null> {
    return null;
  }

  async reservar(): Promise<null> {
    return null;
  }

  async listarPropios(): Promise<{ items: never[]; total: number; pagina: number; porPagina: number }> {
    return { items: [], total: 0, pagina: 1, porPagina: 50 };
  }

  async cancelar(): Promise<null> {
    return null;
  }

  async reprogramar(): Promise<null> {
    return null;
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/municipio/eventos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const FECHA_FUTURA = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const FECHA_PASADA = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const eventoValido = {
  titulo: 'Jornada de castración — Barrio Norte',
  tipo: 'castracion',
  direccion: 'Calle 25 N° 450',
  latitud: -37.9989,
  longitud: -61.3565,
  fecha: FECHA_FUTURA,
  cuposTotales: 30,
};

describe('POST /api/municipio/eventos (Alta rápida de operativos municipales)', () => {
  let repositorioEventos: RepositorioEventosFalso;
  let repositorioPerfil: RepositorioPerfilFalso;
  let repositorioTurnos: RepositorioTurnosFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioEventos = new RepositorioEventosFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    repositorioTurnos = new RepositorioTurnosFalso();
    container.reset();
    container.registerInstance<IRepositorioEventos>('IRepositorioEventos', repositorioEventos);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
    container.registerInstance<IRepositorioTurnos>('IRepositorioTurnos', repositorioTurnos);
    container.registerInstance<ProveedorTurnera<FuenteDisponibilidadEvento>>('ProveedorTurneraMunicipio', new TurneraMunicipio());
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001), sin persistir nada', async () => {
    autenticarComo(null);

    const respuesta = await POST(crearRequest(eventoValido));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
    expect(repositorioEventos.creados).toHaveLength(0);
  });

  // Paso 4 del checklist + AC explícito.
  it.each(['dueño', 'veterinario'])('rechaza con 403 / PEA-MUN-005 para un usuario con rol %s', async (rol) => {
    autenticarComo('usuario-1');
    repositorioPerfil.rol = rol;

    const respuesta = await POST(crearRequest(eventoValido));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-005');
    expect(repositorioEventos.creados).toHaveLength(0);
  });

  it('administrador también puede publicar el operativo', async () => {
    autenticarComo('admin-1');
    repositorioPerfil.rol = 'administrador';

    const respuesta = await POST(crearRequest(eventoValido));

    expect(respuesta.status).toBe(201);
    expect(repositorioEventos.creados).toHaveLength(1);
  });

  it('rechaza una fecha pasada (400 / PEA-MUN-004), sin persistir nada (AC)', async () => {
    autenticarComo('municipio-1');

    const respuesta = await POST(crearRequest({ ...eventoValido, fecha: FECHA_PASADA }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-MUN-004');
    expect(repositorioEventos.creados).toHaveLength(0);
  });

  it('rechaza cuposTotales=0 (400)', async () => {
    autenticarComo('municipio-1');

    const respuesta = await POST(crearRequest({ ...eventoValido, cuposTotales: 0 }));

    expect(respuesta.status).toBe(400);
    expect(repositorioEventos.creados).toHaveLength(0);
  });

  it('rechaza un tipo fuera de catálogo (400)', async () => {
    autenticarComo('municipio-1');

    const respuesta = await POST(crearRequest({ ...eventoValido, tipo: 'incendio' }));

    expect(respuesta.status).toBe(400);
    expect(repositorioEventos.creados).toHaveLength(0);
  });

  it('publica el operativo con éxito, disponible de inmediato (sin paso de aprobación)', async () => {
    autenticarComo('municipio-1');

    const respuesta = await POST(crearRequest(eventoValido));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.municipioId).toBe('municipio-1');
    expect(cuerpo.titulo).toBe(eventoValido.titulo);
    expect(cuerpo.cuposTotales).toBe(30);
    expect(cuerpo.requisitos).toBeNull();
    expect(repositorioEventos.creados).toEqual([
      {
        municipioId: 'municipio-1',
        titulo: eventoValido.titulo,
        tipo: eventoValido.tipo,
        direccion: eventoValido.direccion,
        latitud: eventoValido.latitud,
        longitud: eventoValido.longitud,
        fecha: new Date(FECHA_FUTURA),
        cuposTotales: 30,
        requisitos: null,
      },
    ]);
  });

  it('persiste requisitos cuando el municipio los declara', async () => {
    autenticarComo('municipio-1');

    const respuesta = await POST(crearRequest({ ...eventoValido, requisitos: 'Traer collar/bozal y DNI del tutor.' }));

    expect(respuesta.status).toBe(201);
    expect(repositorioEventos.creados[0]).toMatchObject({ requisitos: 'Traer collar/bozal y DNI del tutor.' });
  });

  // Paso 4 del checklist: crea un evento con 10 cupos y verifica exactamente 10 filas en turnos.
  describe('GenerarTurnosEvento — generación de turnos disponibles a partir de cupos_totales', () => {
    it('AC: un evento con cupos_totales=10 genera exactamente 10 filas en turnos, proveedor_tipo="municipio" y estado="disponible"', async () => {
      autenticarComo('municipio-1');

      const respuesta = await POST(crearRequest({ ...eventoValido, cuposTotales: 10 }));

      expect(respuesta.status).toBe(201);
      const cuerpo = await respuesta.json();
      const turnosDelEvento = repositorioTurnos.turnos.filter((t) => t.eventoId === cuerpo.id);

      expect(turnosDelEvento).toHaveLength(10);
      expect(turnosDelEvento.every((t) => t.proveedorTipo === 'municipio')).toBe(true);
      expect(turnosDelEvento.every((t) => t.estado === 'disponible')).toBe(true);
      expect(turnosDelEvento.every((t) => t.proveedorId === 'municipio-1')).toBe(true);
    });

    it('un evento con cupos_totales=30 (default de eventoValido) genera exactamente 30 turnos', async () => {
      autenticarComo('municipio-1');

      const respuesta = await POST(crearRequest(eventoValido));
      const cuerpo = await respuesta.json();

      expect(repositorioTurnos.turnos.filter((t) => t.eventoId === cuerpo.id)).toHaveLength(30);
    });
  });
});
