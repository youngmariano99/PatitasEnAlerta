/**
 * @jest-environment node
 */
// Mismo criterio que UpstashControlDeTasa.test.ts: los mocks se definen
// DENTRO del factory (babel-plugin-jest-hoist mueve jest.mock() por encima
// de cualquier `const` del módulo) y se exponen como `__mockResource`/
// `__mockConfig` para controlarlos desde cada test vía jest.requireMock.
jest.mock('cloudinary', () => {
  const resource = jest.fn();
  const config = jest.fn();
  return { v2: { config, api: { resource } }, __mockResource: resource, __mockConfig: config };
});

import { CloudinaryStorageAdapter } from '@infraestructura/adaptadores/CloudinaryStorageAdapter';

const { __mockResource: mockResource, __mockConfig: mockConfig } = jest.requireMock('cloudinary') as {
  __mockResource: jest.Mock;
  __mockConfig: jest.Mock;
};

describe('CloudinaryStorageAdapter', () => {
  const envOriginal = { ...process.env };

  beforeEach(() => {
    mockResource.mockReset();
    mockConfig.mockClear();
    process.env = {
      ...envOriginal,
      CLOUDINARY_CLOUD_NAME: 'patitas-en-alerta',
      CLOUDINARY_API_KEY: 'clave-de-prueba',
      CLOUDINARY_API_SECRET: 'secreto-de-prueba',
    };
  });

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it('lanza un error claro si falta alguna variable de entorno de Cloudinary', () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;

    expect(() => new CloudinaryStorageAdapter()).toThrow(/CLOUDINARY_CLOUD_NAME/);
  });

  it('lanza si falta CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET (necesarios para fueSubidaPor)', () => {
    delete process.env.CLOUDINARY_API_KEY;

    expect(() => new CloudinaryStorageAdapter()).toThrow(/CLOUDINARY_API_KEY/);
  });

  it('acepta una URL de nuestra propia cuenta de Cloudinary', () => {
    const adapter = new CloudinaryStorageAdapter();

    expect(
      adapter.esUrlDeImagenValida('https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/toby.jpg'),
    ).toBe(true);
  });

  it('rechaza una URL de otra cuenta de Cloudinary', () => {
    const adapter = new CloudinaryStorageAdapter();

    expect(
      adapter.esUrlDeImagenValida('https://res.cloudinary.com/otra-cuenta/image/upload/v1/foto.jpg'),
    ).toBe(false);
  });

  it('rechaza una URL que no es de Cloudinary', () => {
    const adapter = new CloudinaryStorageAdapter();

    expect(adapter.esUrlDeImagenValida('https://ejemplo-malicioso.test/foto.jpg')).toBe(false);
  });

  describe('fueSubidaPor', () => {
    it('confirma la subida cuando context.custom.usuario_id coincide con el usuario autenticado', async () => {
      mockResource.mockResolvedValue({ context: { custom: { usuario_id: 'usuario-1' } } });
      const adapter = new CloudinaryStorageAdapter();

      await expect(
        adapter.fueSubidaPor('https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg', 'usuario-1'),
      ).resolves.toBe(true);
      expect(mockResource).toHaveBeenCalledWith('reportes/toby', { context: true });
    });

    it('rechaza cuando la subida real corresponde a otro usuario (AC: URL de un reporte ajeno)', async () => {
      mockResource.mockResolvedValue({ context: { custom: { usuario_id: 'usuario-2' } } });
      const adapter = new CloudinaryStorageAdapter();

      await expect(
        adapter.fueSubidaPor('https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg', 'usuario-1'),
      ).resolves.toBe(false);
    });

    it('rechaza (fail-closed) si Cloudinary no encuentra el recurso o falla la consulta', async () => {
      mockResource.mockRejectedValue(new Error('not found'));
      const adapter = new CloudinaryStorageAdapter();

      await expect(
        adapter.fueSubidaPor('https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg', 'usuario-1'),
      ).resolves.toBe(false);
    });

    it('rechaza sin consultar Cloudinary si la URL ni siquiera es de nuestra cuenta', async () => {
      const adapter = new CloudinaryStorageAdapter();

      await expect(adapter.fueSubidaPor('https://ejemplo-malicioso.test/foto.jpg', 'usuario-1')).resolves.toBe(false);
      expect(mockResource).not.toHaveBeenCalled();
    });

    it('extrae el public_id ignorando el segmento de versión y la extensión', async () => {
      mockResource.mockResolvedValue({ context: { custom: { usuario_id: 'usuario-1' } } });
      const adapter = new CloudinaryStorageAdapter();

      await adapter.fueSubidaPor(
        'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1699999999/reportes/carpeta/toby.png',
        'usuario-1',
      );

      expect(mockResource).toHaveBeenCalledWith('reportes/carpeta/toby', { context: true });
    });
  });
});
