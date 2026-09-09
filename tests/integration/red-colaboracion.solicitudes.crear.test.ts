/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { DatosNuevaSolicitudRecurso, IRepositorioSolicitudesRecurso } from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { SolicitudRecurso } from '@dominio/entidades/SolicitudRecurso';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, así que el orden de imports acá abajo no afecta el
// mockeo real (mismo criterio que tests/integration/municipio.eventos.crear.test.ts).
import { POST } from '@app/api/red-colaboracion/solicitudes/route';

class RepositorioSolicitudesFalso implements IRepositorioSolicitudesRecurso {
  public creadas: DatosNuevaSolicitudRecurso[] = [];

  async crear(datos: DatosNuevaSolicitudRecurso): Promise<SolicitudRecurso> {
    this.creadas.push(datos);
    return SolicitudRecurso.reconstruir(
      `solicitud-${this.creadas.length}`,
      { ...datos, estado: 'abierta' },
      new Date('2026-09-09T09:00:00.000Z'),
    );
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'organizacion';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'ong@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: null };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/red-colaboracion/solicitudes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const solicitudValida = {
  tipo: 'insumos',
  descripcion: 'Necesitamos alimento balanceado para 15 animales en tránsito durante este mes.',
};

describe('POST /api/red-colaboracion/solicitudes (Publicación de solicitudes de recurso)', () => {
  let repositorioSolicitudes: RepositorioSolicitudesFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioSolicitudes = new RepositorioSolicitudesFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioSolicitudesRecurso>('IRepositorioSolicitudesRecurso', repositorioSolicitudes);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001), sin persistir nada', async () => {
    autenticarComo(null);

    const respuesta = await POST(crearRequest(solicitudValida));

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
    expect(repositorioSolicitudes.creadas).toHaveLength(0);
  });

  it.each(['dueño', 'veterinario', 'municipio', 'administrador', 'rescatista'])(
    'rechaza con 403 / PEA-SIS-002 para un usuario con rol %s',
    async (rol) => {
      autenticarComo('usuario-1');
      repositorioPerfil.rol = rol;

      const respuesta = await POST(crearRequest(solicitudValida));

      expect(respuesta.status).toBe(403);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-SIS-002');
      expect(repositorioSolicitudes.creadas).toHaveLength(0);
    },
  );

  it('rechaza un tipo fuera de catálogo (400)', async () => {
    autenticarComo('ong-1');

    const respuesta = await POST(crearRequest({ ...solicitudValida, tipo: 'dinero' }));

    expect(respuesta.status).toBe(400);
    expect(repositorioSolicitudes.creadas).toHaveLength(0);
  });

  it('rechaza sin descripción (400)', async () => {
    autenticarComo('ong-1');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { descripcion: _descripcion, ...sinDescripcion } = solicitudValida;

    const respuesta = await POST(crearRequest(sinDescripcion));

    expect(respuesta.status).toBe(400);
    expect(repositorioSolicitudes.creadas).toHaveLength(0);
  });

  it('publica la solicitud con éxito, estado inicial "abierta"', async () => {
    autenticarComo('ong-1');

    const respuesta = await POST(crearRequest(solicitudValida));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.organizacionId).toBe('ong-1');
    expect(cuerpo.tipo).toBe(solicitudValida.tipo);
    expect(cuerpo.estado).toBe('abierta');
    expect(cuerpo.reporteId).toBeNull();
    expect(repositorioSolicitudes.creadas).toEqual([
      {
        organizacionId: 'ong-1',
        tipo: solicitudValida.tipo,
        descripcion: solicitudValida.descripcion,
        reporteId: null,
      },
    ]);
  });

  it('persiste reporteId cuando la organización lo declara', async () => {
    autenticarComo('ong-1');
    const reporteId = '22222222-2222-2222-2222-222222222222';

    const respuesta = await POST(crearRequest({ ...solicitudValida, reporteId }));

    expect(respuesta.status).toBe(201);
    expect(repositorioSolicitudes.creadas[0]).toMatchObject({ reporteId });
  });
});
