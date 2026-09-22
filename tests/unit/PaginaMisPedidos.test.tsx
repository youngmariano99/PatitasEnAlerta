import { render, screen } from '@testing-library/react';
import PaginaMisPedidos from '@app/mis-pedidos/page';

function mockFetch(body: unknown, ok = true) {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 400, json: async () => body }) as jest.Mock;
}

describe('PaginaMisPedidos (app/mis-pedidos)', () => {
  it('lista los pedidos propios con su estado', async () => {
    mockFetch({
      items: [
        {
          id: 'pedido-1',
          productoId: 'p1',
          cantidad: 2,
          precioUnitario: 500,
          estado: 'pendiente',
          createdAt: '2026-09-15T10:00:00.000Z',
        },
      ],
    });
    render(<PaginaMisPedidos />);

    expect(await screen.findByText('2 unidades · $500 c/u')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay pedidos', async () => {
    mockFetch({ items: [] });
    render(<PaginaMisPedidos />);

    expect(await screen.findByText('Todavía no hiciste ningún pedido.')).toBeInTheDocument();
  });
});
