/**
 * @jest-environment node
 *
 * Paso 4 del ticket "Alta de comercio sujeta a verificación" (Módulo 7):
 * registra un comercio y confirma el estado inicial 'pendiente', más el
 * rechazo por tipo_comercio inválido (PEA-COM-002) y por rol insuficiente.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { Comercio, DatosComercio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que el resto de tests/integration/*.
import { POST as registrarComercio } from '@app/api/comercios/route';

const usuarioId = '11111111-1111-1111-1111-111111111111';

const datosValidos = {
  nombreComercio: 'Pet Shop Pringles',
  tipoComercio: 'pet_shop',
  direccion: 'Av. San Martín 500',
  latitud: -37.9989,
  longitud: -61.3565,
};

class RepositorioComerciosFalso implements IRepositorioComercios {
  public creados: Array<{ usuarioId: string; datos: DatosComercio }> = [];

  async crear(usuarioId: string, datos: DatosComercio): Promise<Comercio> {
    this.creados.push({ usuarioId, datos });
    return {
      id: 'comercio-1',
      usuarioId,
      ...datos,
      estadoVerificacion: 'pendiente',
      createdAt: new Date('2026-09-14T10:00:00.000Z'),
    };
  }

  async obtenerPropio(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarVerificados(): Promise<never> {
    throw new Error('no usado en este test');
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'comerciante';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'comercio@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: new Date() };
  }
}

function autenticarComo(id: string | null) {
  getUserMock.mockResolvedValue(id ? { data: { user: { id } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } });
}

function crearRequestJson(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/comercios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe('POST /api/comercios (RegistrarComercio, Módulo 7)', () => {
  let repositorioComercios: RepositorioComerciosFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioComercios = new RepositorioComerciosFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioComercios>('IRepositorioComercios', repositorioComercios);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  it('AC / Paso 4: registra el comercio (201) y confirma el estado inicial "pendiente"', async () => {
    autenticarComo(usuarioId);

    const respuesta = await registrarComercio(crearRequestJson(datosValidos));

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.estadoVerificacion).toBe('pendiente');
    expect(repositorioComercios.creados).toEqual([{ usuarioId, datos: datosValidos }]);
  });

  it('AC: rechaza con 400 / PEA-COM-002 un tipo_comercio inválido', async () => {
    autenticarComo(usuarioId);

    const respuesta = await registrarComercio(crearRequestJson({ ...datosValidos, tipoComercio: 'veterinaria_grande' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-COM-002');
    expect(repositorioComercios.creados).toHaveLength(0);
  });

  it('responde 401 sin sesión', async () => {
    autenticarComo(null);

    const respuesta = await registrarComercio(crearRequestJson(datosValidos));

    expect(respuesta.status).toBe(401);
  });

  it('Verificación técnica: rechaza con 403 / PEA-SIS-002 a un usuario sin rol comerciante', async () => {
    autenticarComo(usuarioId);
    repositorioPerfil.rol = 'dueño';

    const respuesta = await registrarComercio(crearRequestJson(datosValidos));

    expect(respuesta.status).toBe(403);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-002');
    expect(repositorioComercios.creados).toHaveLength(0);
  });
});
