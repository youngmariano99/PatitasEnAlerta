import { obtenerIconoComercio } from '@presentacion/componentes/mapas/iconosComercioFlyweight';

describe('iconosComercioFlyweight (Módulo 7, Paso 2: Flyweight de íconos por tipo_comercio)', () => {
  it('Verificación técnica / AC: devuelve la MISMA instancia de ícono para el mismo tipo_comercio, nunca una nueva', () => {
    const primeraLlamada = obtenerIconoComercio('pet_shop');
    const segundaLlamada = obtenerIconoComercio('pet_shop');
    const terceraLlamada = obtenerIconoComercio('pet_shop');

    expect(segundaLlamada).toBe(primeraLlamada);
    expect(terceraLlamada).toBe(primeraLlamada);
  });

  it('AC: tipos de comercio distintos usan íconos distintos', () => {
    const iconoPetShop = obtenerIconoComercio('pet_shop');
    const iconoPeluqueria = obtenerIconoComercio('peluqueria');

    expect(iconoPetShop).not.toBe(iconoPeluqueria);
  });

  it('un tipo_comercio fuera del catálogo no rompe: cae al ícono genérico', () => {
    expect(() => obtenerIconoComercio('valor_inesperado')).not.toThrow();
  });
});
