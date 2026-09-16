/**
 * @jest-environment node
 */
import { ListarComerciosCercanos } from '@aplicacion/casos-de-uso/comercios/ListarComerciosCercanos';
import type { Comercio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';

function crearComercio(overrides: Partial<Comercio>): Comercio {
  return {
    id: 'comercio-1',
    usuarioId: 'usuario-1',
    nombreComercio: 'Pet Shop Pringles',
    tipoComercio: 'pet_shop',
    direccion: 'Av. San Martín 500',
    latitud: -37.9989,
    longitud: -61.3565,
    estadoVerificacion: 'verificado',
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

// Coronel Pringles (referencia) y dos comercios: uno cerca (mismas
// coordenadas), otro lejos (Buenos Aires, ~500km) — para probar el orden por
// distancia sin depender de valores exactos de Haversine.
const CERCA = { latitud: -37.9989, longitud: -61.3565 };
const LEJOS = { latitud: -34.6037, longitud: -58.3816 };

function crearFakes(comercios: Comercio[]) {
  const repositorioComercios: jest.Mocked<IRepositorioComercios> = {
    crear: jest.fn(),
    obtenerPropio: jest.fn(),
    listarVerificados: jest.fn().mockResolvedValue(comercios),
  };
  return { repositorioComercios };
}

describe('ListarComerciosCercanos', () => {
  it('Paso 3 / AC: con ubicación de referencia, ordena por distancia aproximada ascendente', async () => {
    const cercano = crearComercio({ id: 'cercano', latitud: CERCA.latitud, longitud: CERCA.longitud });
    const lejano = crearComercio({ id: 'lejano', latitud: LEJOS.latitud, longitud: LEJOS.longitud });
    const { repositorioComercios } = crearFakes([lejano, cercano]);
    const caso = new ListarComerciosCercanos(repositorioComercios);

    const resultado = await caso.ejecutar({ pagina: 1, porPagina: 50, latitud: CERCA.latitud, longitud: CERCA.longitud, radioKm: 1000 });

    expect(resultado.items.map((item) => item.id)).toEqual(['cercano', 'lejano']);
    expect(resultado.items[0]!.distanciaKm).toBeLessThan(resultado.items[1]!.distanciaKm!);
    expect(resultado.items[0]!.distanciaKm).toBeCloseTo(0, 0);
  });

  it('filtra por el bounding box vía IRepositorioComercios.listarVerificados', async () => {
    const { repositorioComercios } = crearFakes([]);
    const caso = new ListarComerciosCercanos(repositorioComercios);

    await caso.ejecutar({ pagina: 1, porPagina: 50, latitud: CERCA.latitud, longitud: CERCA.longitud, radioKm: 25 });

    expect(repositorioComercios.listarVerificados).toHaveBeenCalledWith(
      { latitud: CERCA.latitud, longitud: CERCA.longitud, radioKm: 25 },
      undefined,
    );
  });

  it('Paso 1: reenvía el texto libre "q" al repositorio, independiente de la zona', async () => {
    const { repositorioComercios } = crearFakes([]);
    const caso = new ListarComerciosCercanos(repositorioComercios);

    await caso.ejecutar({ pagina: 1, porPagina: 50, q: 'pet shop' });

    expect(repositorioComercios.listarVerificados).toHaveBeenCalledWith(undefined, 'pet shop');
  });

  it('sin ubicación de referencia, cae al orden por createdAt descendente y distanciaKm null', async () => {
    const antiguo = crearComercio({ id: 'antiguo', createdAt: new Date('2026-01-01T00:00:00.000Z') });
    const reciente = crearComercio({ id: 'reciente', createdAt: new Date('2026-09-01T00:00:00.000Z') });
    const { repositorioComercios } = crearFakes([antiguo, reciente]);
    const caso = new ListarComerciosCercanos(repositorioComercios);

    const resultado = await caso.ejecutar({ pagina: 1, porPagina: 50 });

    expect(resultado.items.map((item) => item.id)).toEqual(['reciente', 'antiguo']);
    expect(resultado.items.every((item) => item.distanciaKm === null)).toBe(true);
    expect(repositorioComercios.listarVerificados).toHaveBeenCalledWith(undefined, undefined);
  });

  it('pagina sobre el conjunto ya ordenado', async () => {
    const comercios = Array.from({ length: 5 }, (_, i) =>
      crearComercio({ id: `comercio-${i}`, createdAt: new Date(2026, 0, i + 1) }),
    );
    const { repositorioComercios } = crearFakes(comercios);
    const caso = new ListarComerciosCercanos(repositorioComercios);

    const resultado = await caso.ejecutar({ pagina: 2, porPagina: 2 });

    expect(resultado.total).toBe(5);
    expect(resultado.items).toHaveLength(2);
    expect(resultado.items.map((item) => item.id)).toEqual(['comercio-2', 'comercio-1']);
  });
});
