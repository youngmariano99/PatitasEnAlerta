import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaHistorialesCompartidos from '@app/veterinario/historiales-compartidos/page';

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaHistorialesCompartidos (app/veterinario/historiales-compartidos)', () => {
  it('muestra un estado deshabilitado cuando el feature flag está apagado (403)', async () => {
    mockFetch(() => ({
      ok: false,
      status: 403,
      body: { codigo: 'PEA-SIS-002', mensaje: 'No autorizado' },
    }));
    render(<PaginaHistorialesCompartidos />);

    expect(await screen.findByText('Todavía no está disponible')).toBeInTheDocument();
  });

  it('comparte un historial y lo muestra en la lista', async () => {
    const usuario = userEvent.setup();
    let compartido = false;
    mockFetch((url, init) => {
      if (url.endsWith('/api/veterinarios/historiales-compartidos') && init?.method === 'POST') {
        compartido = true;
        return { ok: true, status: 201, body: {} };
      }
      return {
        ok: true,
        status: 200,
        body: compartido
          ? [
              {
                id: 'hist-1',
                mascotaId: 'mascota-1',
                veterinarioDestinoId: 'vet-2',
                autorizadoEn: '2026-09-15T10:00:00.000Z',
                revocadoEn: null,
              },
            ]
          : [],
      };
    });
    render(<PaginaHistorialesCompartidos />);
    await screen.findByText('Todavía no compartiste ningún historial.');

    await usuario.type(screen.getByLabelText('Id de la mascota'), 'mascota-1');
    await usuario.type(screen.getByLabelText('Id del veterinario/a destino'), 'vet-2');
    await usuario.click(screen.getByRole('button', { name: 'Compartir historial' }));

    expect(await screen.findByRole('button', { name: 'Revocar' })).toBeInTheDocument();
  });
});
