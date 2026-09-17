import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaPedidosRecibidos from '@app/veterinario/pedidos/page';

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaPedidosRecibidos (app/veterinario/pedidos)', () => {
  it('confirma un pedido pendiente', async () => {
    const usuario = userEvent.setup();
    let confirmado = false;
    mockFetch((url, init) => {
      if (url.includes('/pedidos-recibidos/pedido-1') && init?.method === 'PATCH') {
        confirmado = true;
        return { ok: true, status: 200, body: {} };
      }
      return {
        ok: true,
        status: 200,
        body: {
          items: [
            {
              id: 'pedido-1',
              productoId: 'p1',
              compradorId: 'dueno-1',
              cantidad: 2,
              precioUnitario: 500,
              estado: confirmado ? 'confirmado' : 'pendiente',
              createdAt: '2026-09-15T10:00:00.000Z',
            },
          ],
        },
      };
    });
    render(<PaginaPedidosRecibidos />);
    await screen.findByRole('button', { name: 'Confirmar' });

    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Confirmado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay pedidos', async () => {
    mockFetch(() => ({ ok: true, status: 200, body: { items: [] } }));
    render(<PaginaPedidosRecibidos />);

    expect(await screen.findByText('Todavía no recibiste ningún pedido.')).toBeInTheDocument();
  });
});
