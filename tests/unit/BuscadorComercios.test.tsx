import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BuscadorComercios } from '@presentacion/componentes/comercios/BuscadorComercios';

jest.mock('@presentacion/componentes/mapas/MapaComercios', () => ({
  MapaComercios: ({ comercios }: { comercios: Array<{ id: string }> }) => (
    <div data-testid="mapa-mock">Mapa con {comercios.length} marcador(es)</div>
  ),
}));

const petShop = {
  id: '11111111-1111-1111-1111-111111111111',
  nombreComercio: 'Pet Shop Pringles',
  tipoComercio: 'pet_shop',
  direccion: 'Av. San Martín 500',
  latitud: -37.9989,
  longitud: -61.3565,
  distanciaKm: null,
  createdAt: '2026-09-14T10:00:00.000Z',
};

const peluqueria = {
  id: '22222222-2222-2222-2222-222222222222',
  nombreComercio: 'Peluquería Canina Sur',
  tipoComercio: 'peluqueria',
  direccion: 'Belgrano 200',
  latitud: -37.99,
  longitud: -61.35,
  distanciaKm: null,
  createdAt: '2026-09-14T09:00:00.000Z',
};

function mockearFetch(body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body }) as jest.Mock;
}

function ultimaUrlSolicitada(): string {
  const llamadas = (global.fetch as jest.Mock).mock.calls;
  return llamadas[llamadas.length - 1]![0] as string;
}

describe('BuscadorComercios (Módulo 7, Paso 4)', () => {
  it('AC: filtrar por tipo de comercio actualiza el listado y el mapa de forma sincronizada', async () => {
    mockearFetch({ items: [petShop, peluqueria], total: 2 });
    const usuario = userEvent.setup();
    render(<BuscadorComercios />);

    await screen.findByText('Pet Shop Pringles');
    expect(screen.getByText('Peluquería Canina Sur')).toBeInTheDocument();
    expect(await screen.findByTestId('mapa-mock')).toHaveTextContent('Mapa con 2 marcador(es)');

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'pet_shop');

    // Listado: solo el pet shop.
    expect(screen.getByText('Pet Shop Pringles')).toBeInTheDocument();
    expect(screen.queryByText('Peluquería Canina Sur')).not.toBeInTheDocument();
    // Mapa: mismo conjunto ya filtrado, sincronizado con el listado (AC).
    expect(await screen.findByTestId('mapa-mock')).toHaveTextContent('Mapa con 1 marcador(es)');
  });

  it('Paso 2: cada comercio listado usa el ícono Flyweight por tipo_comercio (no crea uno por marcador)', async () => {
    mockearFetch({ items: [petShop, peluqueria], total: 2 });
    render(<BuscadorComercios />);

    expect(await screen.findByTestId('mapa-mock')).toHaveTextContent('Mapa con 2 marcador(es)');
    // La verificación de que el ícono es compartido (Flyweight real, con
    // caché) vive en tests/unit/iconosComercioFlyweight.test.ts — acá solo se
    // confirma que ambos comercios, con tipos distintos, llegan al mapa.
  });

  it('Paso 1: la búsqueda de texto libre viaja como "q" en la query, con debounce', async () => {
    mockearFetch({ items: [petShop], total: 1 });
    const usuario = userEvent.setup();
    render(<BuscadorComercios />);
    await screen.findByText('Pet Shop Pringles');

    await usuario.type(screen.getByLabelText('Buscar'), 'pet');

    // Timers reales (sin jest.useFakeTimers): el debounce es de apenas
    // 300ms, así que esperar el waitFor con margen es más simple y estable
    // que sincronizar fake timers con las promesas de fetch.
    await waitFor(() => expect(ultimaUrlSolicitada()).toContain('q=pet'), { timeout: 2000 });
  });

  it('muestra un mensaje de error legible si la API falla', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ codigo: 'PEA-SIS-003', mensaje: 'Algo salió mal de nuestro lado.' }),
    }) as jest.Mock;
    render(<BuscadorComercios />);

    expect(await screen.findByText('Algo salió mal de nuestro lado.')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay comercios que matcheen los filtros', async () => {
    mockearFetch({ items: [], total: 0 });
    render(<BuscadorComercios />);

    expect(await screen.findByText('No encontramos comercios con estos filtros.')).toBeInTheDocument();
  });
});
