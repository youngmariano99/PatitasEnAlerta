/**
 * @jest-environment node
 */
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

// Mismo criterio que UpstashControlDeTasa.test.ts: los mocks se definen
// DENTRO del factory (babel-plugin-jest-hoist mueve jest.mock() por encima
// de cualquier `const` del módulo) y se exponen como `__mockLimit`/
// `__mockSlidingWindow` para controlarlos desde cada test.
jest.mock('@upstash/ratelimit', () => {
  const limit = jest.fn();
  const slidingWindow = jest.fn().mockReturnValue('limitador-configurado');
  const Ratelimit = Object.assign(
    jest.fn().mockImplementation(() => ({ limit })),
    { slidingWindow },
  );
  return { Ratelimit, __mockLimit: limit, __mockSlidingWindow: slidingWindow };
});

import { UpstashControlDeTasaAntiSaturacion } from '@infraestructura/adaptadores/UpstashControlDeTasaAntiSaturacion';

const { __mockLimit: mockLimit, __mockSlidingWindow: mockSlidingWindow } = jest.requireMock('@upstash/ratelimit') as {
  __mockLimit: jest.Mock;
  __mockSlidingWindow: jest.Mock;
};

const ENV_ORIGINAL = process.env;

describe('UpstashControlDeTasaAntiSaturacion', () => {
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
    expect(() => new UpstashControlDeTasaAntiSaturacion()).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it('configura una ventana deslizante de 5 reportes por hora', () => {
    // eslint-disable-next-line no-new
    new UpstashControlDeTasaAntiSaturacion();
    expect(mockSlidingWindow).toHaveBeenCalledWith(5, '1 h');
  });

  it('permite la acción cuando Upstash responde success=true, sin necesidad de reintentar', async () => {
    mockLimit.mockResolvedValue({ success: true, reset: Date.now() + 3_600_000 });
    const adaptador = new UpstashControlDeTasaAntiSaturacion();

    const resultado = await adaptador.evaluar('usuario-1');

    expect(resultado.permitido).toBe(true);
    expect(mockLimit).toHaveBeenCalledWith('usuario-1');
  });

  it('bloquea la acción cuando Upstash responde success=false e informa los segundos hasta poder reintentar', async () => {
    const ahora = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(ahora);
    mockLimit.mockResolvedValue({ success: false, reset: ahora + 90_000 });
    const adaptador = new UpstashControlDeTasaAntiSaturacion();

    const resultado = await adaptador.evaluar('usuario-1');

    expect(resultado.permitido).toBe(false);
    expect(resultado.reintentarEnSegundos).toBe(90);
  });

  it('nunca informa un valor negativo aunque `reset` ya haya pasado', async () => {
    const ahora = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(ahora);
    mockLimit.mockResolvedValue({ success: false, reset: ahora - 5_000 });
    const adaptador = new UpstashControlDeTasaAntiSaturacion();

    const resultado = await adaptador.evaluar('usuario-1');

    expect(resultado.reintentarEnSegundos).toBe(0);
  });
});
