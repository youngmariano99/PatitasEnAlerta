import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaTiendaVeterinaria from '@app/tienda-veterinaria/page';

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaTiendaVeterinaria (app/tienda-veterinaria)', () => {
  it('lista los productos con stock y permite pedir', async () => {
    const usuario = userEvent.setup();
    mockFetch((url, init) => {
      if (url.includes('/pedidos') && init?.method === 'POST') {
        return { ok: true, status: 201, body: {} };
      }
      return {
        ok: true,
        status: 200,
        body: {
          items: [{ id: 'p1', nombre: 'Antipulgas', descripcion: null, precio: 5000, stock: 3 }],
        },
      };
    });
    render(<PaginaTiendaVeterinaria />);

    expect(await screen.findByText('Antipulgas')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Pedir' }));

    expect(await screen.findByText('¡Pedido generado!')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay productos disponibles', async () => {
    mockFetch(() => ({ ok: true, status: 200, body: { items: [] } }));
    render(<PaginaTiendaVeterinaria />);

    expect(
      await screen.findByText('No hay productos disponibles por el momento.'),
    ).toBeInTheDocument();
  });
});
