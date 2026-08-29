/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

import { GET } from '@app/api/perfil/route';

class RepositorioPerfilFalso implements IRepositorioPerfil {
  constructor(private readonly perfil: ResumenPerfilPropio | null) {}

  async obtenerPerfilPropio(): Promise<ResumenPerfilPropio | null> {
    return this.perfil;
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId
      ? { data: { user: { id: usuarioId } }, error: null }
      : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(): NextRequest {
  return new NextRequest('http://localhost/api/perfil', { method: 'GET' });
}

describe('GET /api/perfil (AUTH-07)', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    container.reset();
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    autenticarComo(null);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', new RepositorioPerfilFalso(null));

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(401);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-001');
  });

  it('devuelve estado_verificacion y verificado_en del veterinario autenticado', async () => {
    autenticarComo('vet-1');
    const perfil: ResumenPerfilPropio = {
      id: 'vet-1',
      email: 'vet@ejemplo.test',
      rol: 'veterinario',
      estadoVerificacion: 'pendiente',
      verificadoEn: null,
    };
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', new RepositorioPerfilFalso(perfil));

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo).toEqual(perfil);
  });

  it('responde 500 / PEA-SIS-003 si la sesión apunta a un usuario sin fila activa', async () => {
    autenticarComo('vet-fantasma');
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', new RepositorioPerfilFalso(null));

    const respuesta = await GET(crearRequest());

    expect(respuesta.status).toBe(500);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-003');
  });
});
