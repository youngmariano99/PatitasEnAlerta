import {
  optimizarImagenCloudinary,
  PRESETS_IMAGEN,
} from '@presentacion/lib/optimizacionImagenes';

describe('optimizarImagenCloudinary', () => {
  const URL_BASE = 'https://res.cloudinary.com/patitas/image/upload/v1720000000/reportes/perrito.jpg';

  it('devuelve cadena vacía si la URL es nula, vacía o indefinida', () => {
    expect(optimizarImagenCloudinary(null)).toBe('');
    expect(optimizarImagenCloudinary(undefined)).toBe('');
    expect(optimizarImagenCloudinary('')).toBe('');
  });

  it('no altera URLs externas que no son de Cloudinary', () => {
    const urlExterna = 'https://otro-servidor.com/fotos/gato.jpg';
    expect(optimizarImagenCloudinary(urlExterna)).toBe(urlExterna);

    const urlLocal = '/animales/perro.png';
    expect(optimizarImagenCloudinary(urlLocal)).toBe(urlLocal);
  });

  it('agrega f_auto y q_auto por defecto a URLs de Cloudinary', () => {
    const resultado = optimizarImagenCloudinary(URL_BASE);
    expect(resultado).toBe(
      'https://res.cloudinary.com/patitas/image/upload/f_auto,q_auto/v1720000000/reportes/perrito.jpg',
    );
  });

  it('aplica dimensiones y recorte con gravedad automática cuando se especifican ancho y alto', () => {
    const resultado = optimizarImagenCloudinary(URL_BASE, { ancho: 160, alto: 160 });
    expect(resultado).toContain('w_160');
    expect(resultado).toContain('h_160');
    expect(resultado).toContain('c_fill');
    expect(resultado).toContain('g_auto');
    expect(resultado).toContain('f_auto');
    expect(resultado).toContain('q_auto');
  });

  it('funciona correctamente con los presets predefinidos', () => {
    const pin = optimizarImagenCloudinary(URL_BASE, PRESETS_IMAGEN.pinMapa);
    expect(pin).toContain('w_72');
    expect(pin).toContain('h_72');

    const miniatura = optimizarImagenCloudinary(URL_BASE, PRESETS_IMAGEN.miniatura);
    expect(miniatura).toContain('w_160');
    expect(miniatura).toContain('h_160');
  });

  it('reemplaza transformaciones existentes en lugar de duplicarlas', () => {
    const urlConTransformacion =
      'https://res.cloudinary.com/patitas/image/upload/w_200,h_200/v1720000000/reportes/perrito.jpg';
    const resultado = optimizarImagenCloudinary(urlConTransformacion, { ancho: 100, alto: 100 });

    expect(resultado).toContain('w_100');
    expect(resultado).toContain('h_100');
    expect(resultado).not.toContain('w_200');
  });
});
