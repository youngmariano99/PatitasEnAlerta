import { fetchConSesion } from '@presentacion/lib/fetchConSesion';

function respuestaFalsa(status: number): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => ({}) } as Response;
}

describe('fetchConSesion', () => {
  const assignMock = jest.fn();

  beforeEach(() => {
    assignMock.mockReset();
    delete (window as unknown as { location?: unknown }).location;
    // jsdom no permite reasignar `window.location` directamente sin borrarlo antes.
    (window as unknown as { location: unknown }).location = {
      assign: assignMock,
      origin: 'http://localhost',
      pathname: '/mascotas',
      search: '?foo=bar',
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devuelve la respuesta normalmente cuando no es 401', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuestaFalsa(200)) as jest.Mock;

    const respuesta = await fetchConSesion('/api/mascotas');

    expect(respuesta.status).toBe(200);
    expect(assignMock).not.toHaveBeenCalled();
  });

  it('no redirige ante otros códigos de error (ej. 403 o 500)', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuestaFalsa(403)) as jest.Mock;

    await fetchConSesion('/api/admin/verificaciones');

    expect(assignMock).not.toHaveBeenCalled();
  });

  it('redirige a /auth/login conservando la ruta de origen (path + query) ante un 401', async () => {
    global.fetch = jest.fn().mockResolvedValue(respuestaFalsa(401)) as jest.Mock;

    await fetchConSesion('/api/mascotas');

    expect(assignMock).toHaveBeenCalledWith('http://localhost/auth/login?redirectTo=%2Fmascotas%3Ffoo%3Dbar');
  });
});
