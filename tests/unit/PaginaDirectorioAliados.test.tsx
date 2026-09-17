import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaDirectorioAliados from '@app/red-colaboracion/directorio/page';

function mockFetch(handler: (url: string) => { ok: boolean; status: number; body: unknown }) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaDirectorioAliados (app/red-colaboracion/directorio)', () => {
  it('lista los aliados y filtra por rol', async () => {
    const usuario = userEvent.setup();
    mockFetch((url) => ({
      ok: true,
      status: 200,
      body: {
        items: url.includes('rol=veterinario')
          ? [
              {
                id: 'v1',
                rol: 'veterinario',
                email: 'vet@ejemplo.test',
                estadoVerificacion: 'verificado',
              },
            ]
          : [
              {
                id: 'o1',
                rol: 'organizacion',
                email: 'ong@ejemplo.test',
                estadoVerificacion: 'verificado',
              },
              {
                id: 'v1',
                rol: 'veterinario',
                email: 'vet@ejemplo.test',
                estadoVerificacion: 'verificado',
              },
            ],
      },
    }));
    render(<PaginaDirectorioAliados />);

    expect(await screen.findByText('ong@ejemplo.test')).toBeInTheDocument();

    await usuario.selectOptions(screen.getByLabelText('Rol'), 'veterinario');

    expect(await screen.findByText('vet@ejemplo.test')).toBeInTheDocument();
    expect(screen.queryByText('ong@ejemplo.test')).not.toBeInTheDocument();
  });
});
