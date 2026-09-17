import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaBuscarReportesSimilares from '@app/red-colaboracion/buscar/page';

function mockFetch(body: unknown, ok = true) {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 400, json: async () => body }) as jest.Mock;
}

describe('PaginaBuscarReportesSimilares (app/red-colaboracion/buscar)', () => {
  it('busca y muestra los reportes similares ordenados por similitud', async () => {
    const usuario = userEvent.setup();
    mockFetch([
      {
        id: 'r1',
        tipo: 'encontrado',
        descripcion: 'Gato asustadizo cerca de la plaza',
        fotoUrl: 'https://example.test/gato.jpg',
        similitud: 0.87,
      },
    ]);
    render(<PaginaBuscarReportesSimilares />);

    await usuario.type(screen.getByLabelText('¿Qué estás buscando?'), 'gato asustadizo');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Gato asustadizo cerca de la plaza')).toBeInTheDocument();
    expect(screen.getByText('87% de similitud')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay resultados', async () => {
    const usuario = userEvent.setup();
    mockFetch([]);
    render(<PaginaBuscarReportesSimilares />);

    await usuario.type(screen.getByLabelText('¿Qué estás buscando?'), 'perro tranquilo');
    await usuario.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(
      await screen.findByText('No encontramos reportes similares a esa búsqueda.'),
    ).toBeInTheDocument();
  });
});
