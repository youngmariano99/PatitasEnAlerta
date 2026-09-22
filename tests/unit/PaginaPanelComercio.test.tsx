import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaPanelComercio from '@app/comercios/panel/page';

jest.mock('@presentacion/componentes/mapas/SelectorUbicacionMapa', () => ({
  SelectorUbicacionMapa: ({
    onSeleccionar,
  }: {
    onSeleccionar: (latitud: number, longitud: number) => void;
  }) => (
    <button type="button" onClick={() => onSeleccionar(-37.9989, -61.3565)}>
      Marcar ubicación (mock)
    </button>
  ),
}));

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaPanelComercio (app/comercios/panel)', () => {
  it('sin comercio registrado: muestra el formulario de alta', async () => {
    mockFetch((url) => {
      if (url.includes('/mi-comercio')) return { ok: true, status: 200, body: null };
      return { ok: true, status: 200, body: {} };
    });
    render(<PaginaPanelComercio />);

    expect(await screen.findByRole('button', { name: 'Registrar comercio' })).toBeInTheDocument();
  });

  it('registra un comercio nuevo enviando lat/lon del mapa', async () => {
    const usuario = userEvent.setup();
    let comercioCreado = false;
    mockFetch((url, init) => {
      if (url.includes('/mi-comercio')) {
        return {
          ok: true,
          status: 200,
          body: comercioCreado ? { id: 'comercio-1', estadoVerificacion: 'pendiente' } : null,
        };
      }
      if (url.endsWith('/api/comercios') && init?.method === 'POST') {
        comercioCreado = true;
        return {
          ok: true,
          status: 201,
          body: { id: 'comercio-1', estadoVerificacion: 'pendiente' },
        };
      }
      return { ok: true, status: 200, body: [] };
    });
    render(<PaginaPanelComercio />);
    await screen.findByRole('button', { name: 'Registrar comercio' });

    await usuario.type(screen.getByLabelText('Nombre del comercio'), 'Pet Shop Luna');
    await usuario.selectOptions(screen.getByLabelText('Tipo de comercio'), 'pet_shop');
    await usuario.type(screen.getByLabelText('Dirección'), 'Av. Siempre Viva 123');
    await usuario.click(screen.getByRole('button', { name: 'Marcar ubicación (mock)' }));
    await usuario.click(screen.getByRole('button', { name: 'Registrar comercio' }));

    expect(await screen.findByText('En revisión')).toBeInTheDocument();
  });

  it('comercio verificado: permite publicar y dar de baja un producto', async () => {
    const usuario = userEvent.setup();
    let productoPublicado = false;
    mockFetch((url, init) => {
      if (url.includes('/mi-comercio')) {
        return {
          ok: true,
          status: 200,
          body: { id: 'comercio-1', estadoVerificacion: 'verificado' },
        };
      }
      if (url.includes('/comercios/productos') && init?.method === 'POST') {
        productoPublicado = true;
        return { ok: true, status: 201, body: {} };
      }
      if (url.includes('/comercios/productos')) {
        return {
          ok: true,
          status: 200,
          body: productoPublicado
            ? [
                {
                  id: 'p1',
                  nombre: 'Alimento premium',
                  descripcion: null,
                  categoria: 'alimento',
                  precio: 15000,
                },
              ]
            : [],
        };
      }
      return { ok: true, status: 200, body: {} };
    });
    render(<PaginaPanelComercio />);
    await screen.findByText('Verificado');
    await screen.findByText('Todavía no publicaste ningún producto.');

    await usuario.type(screen.getByLabelText('Nombre'), 'Alimento premium');
    await usuario.click(screen.getByRole('button', { name: 'Publicar producto' }));

    expect(await screen.findByText('Alimento premium')).toBeInTheDocument();
  });

  it('muestra un mensaje de "en revisión" si el comercio todavía no fue verificado', async () => {
    mockFetch((url) => {
      if (url.includes('/mi-comercio')) {
        return {
          ok: true,
          status: 200,
          body: { id: 'comercio-1', estadoVerificacion: 'pendiente' },
        };
      }
      return { ok: true, status: 200, body: [] };
    });
    render(<PaginaPanelComercio />);

    expect(await screen.findByText(/en revisión/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar producto' })).not.toBeInTheDocument();
  });
});
