/**
 * @jest-environment node
 */
import { CloudinaryStorageAdapter } from '@infraestructura/adaptadores/CloudinaryStorageAdapter';

describe('CloudinaryStorageAdapter', () => {
  const envOriginal = { ...process.env };

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it('lanza un error claro si falta CLOUDINARY_CLOUD_NAME', () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;

    expect(() => new CloudinaryStorageAdapter()).toThrow(/Falta la variable de entorno CLOUDINARY_CLOUD_NAME/);
  });

  it('acepta una URL de nuestra propia cuenta de Cloudinary', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'patitas-en-alerta';
    const adapter = new CloudinaryStorageAdapter();

    expect(
      adapter.esUrlDeImagenValida('https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/toby.jpg'),
    ).toBe(true);
  });

  it('rechaza una URL de otra cuenta de Cloudinary', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'patitas-en-alerta';
    const adapter = new CloudinaryStorageAdapter();

    expect(
      adapter.esUrlDeImagenValida('https://res.cloudinary.com/otra-cuenta/image/upload/v1/foto.jpg'),
    ).toBe(false);
  });

  it('rechaza una URL que no es de Cloudinary', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'patitas-en-alerta';
    const adapter = new CloudinaryStorageAdapter();

    expect(adapter.esUrlDeImagenValida('https://ejemplo-malicioso.test/foto.jpg')).toBe(false);
  });
});
