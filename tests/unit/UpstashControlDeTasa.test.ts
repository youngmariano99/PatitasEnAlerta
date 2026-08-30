/**
 * @jest-environment node
 */
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

// Los mocks se crean DENTRO del factory (no referenciando variables externas
// declaradas más arriba en el archivo): babel-plugin-jest-hoist mueve
// jest.mock() por encima de cualquier `const` del módulo, así que una
// referencia externa cae en zona muerta temporal. Se exponen `__mockLimit`/
// `__mockSlidingWindow` en el propio módulo mockeado para poder controlarlos
// desde cada test vía jest.requireMock (mismo criterio que
// PrismaMascotaRepositorio.test.ts).
jest.mock('@upstash/ratelimit', () => {
  const limit = jest.fn();
  const slidingWindow = jest.fn().mockReturnValue('limitador-configurado');
  const Ratelimit = Object.assign(
    jest.fn().mockImplementation(() => ({ limit })),
    { slidingWindow },
  );
  return { Ratelimit, __mockLimit: limit, __mockSlidingWindow: slidingWindow };
});

import { UpstashControlDeTasa } from '@infraestructura/adaptadores/UpstashControlDeTasa';

const { __mockLimit: mockLimit, __mockSlidingWindow: mockSlidingWindow } = jest.requireMock('@upstash/ratelimit') as {
  __mockLimit: jest.Mock;
  __mockSlidingWindow: jest.Mock;
};

const ENV_ORIGINAL = process.env;

describe('UpstashControlDeTasa', () => {
  beforeEach(() => {
    mockLimit.mockReset();
    mockSlidingWindow.mockClear();
    process.env = {
      ...ENV_ORIGINAL,
      UPSTASH_REDIS_REST_URL: 'https://redis.example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token-de-prueba',
    };
  });

  afterAll(() => {
    process.env = ENV_ORIGINAL;
  });

  it('lanza si faltan las variables de entorno de Upstash', () => {
    process.env = { ...ENV_ORIGINAL, UPSTASH_REDIS_REST_URL: undefined, UPSTASH_REDIS_REST_TOKEN: undefined };
    expect(() => new UpstashControlDeTasa()).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it('permite la acción cuando Upstash responde success=true', async () => {
    mockLimit.mockResolvedValue({ success: true });
    const adaptador = new UpstashControlDeTasa();

    await expect(adaptador.permitir('usuario-1')).resolves.toBe(true);
    expect(mockLimit).toHaveBeenCalledWith('usuario-1');
  });

  it('bloquea la acción cuando Upstash responde success=false', async () => {
    mockLimit.mockResolvedValue({ success: false });
    const adaptador = new UpstashControlDeTasa();

    await expect(adaptador.permitir('usuario-1')).resolves.toBe(false);
  });
});
