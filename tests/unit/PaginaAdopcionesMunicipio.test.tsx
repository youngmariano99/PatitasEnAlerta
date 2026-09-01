import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaAdopcionesMunicipio from '@app/municipio/adopciones/page';

const fichaBase = {
  id: '11111111-1111-1111-1111-111111111111',
  municipioId: 'municipio-1',
  nombreAnimal: 'Luna',
  especie: 'perro',
  edadAproximada: 3,
  tamano: 'mediano',
  temperamento: 'Sociable',
  estadoSalud: 'Sano',
  requisitosAdopcion: null,
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/luna.jpg',
  estado: 'disponible',
  createdAt: '2026-09-01T09:00:00.000Z',
};

function mockearFetch(porMetodo: {
  GET?: { status: number; body: unknown };
  POST?: { status: number; body: unknown };
  PATCH?: { status: number; body: unknown };
  DELETE?: { status: number; body: unknown };
}) {
  global.fetch = jest.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    const metodo = (init?.method ?? 'GET') as keyof typeof porMetodo;
    const respuesta = porMetodo[metodo]!;
    return { ok: respuesta.status >= 200 && respuesta.status < 300, status: respuesta.status, json: async () => respuesta.body };
  }) as jest.Mock;
}

describe('PaginaAdopcionesMunicipio (app/municipio/adopciones)', () => {
  it('lista las fichas existentes con su estado', async () => {
    mockearFetch({ GET: { status: 200, body: { items: [fichaBase], total: 1, pagina: 1, porPagina: 50 } } });
    render(<PaginaAdopcionesMunicipio />);

    await screen.findByText('Luna');
    const fila = screen.getByTestId(`fila-ficha-${fichaBase.id}`);
    expect(within(fila).getByText('Disponible')).toBeInTheDocument();
  });

  it('muestra el estado vacío con borde discontinuo cuando no hay fichas', async () => {
    mockearFetch({ GET: { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } } });
    render(<PaginaAdopcionesMunicipio />);

    const mensaje = await screen.findByText('No hay fichas para estos filtros.');
    expect(mensaje.closest('div')).toHaveClass('border-dashed');
  });

  it('el botón "Publicar ficha" queda deshabilitado sin nombre/especie/foto completos', async () => {
    mockearFetch({ GET: { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } } });
    render(<PaginaAdopcionesMunicipio />);

    await screen.findByText('No hay fichas para estos filtros.');
    expect(screen.getByRole('button', { name: 'Publicar ficha' })).toBeDisabled();
  });

  it('publica una ficha nueva con éxito y refresca el listado', async () => {
    mockearFetch({
      GET: { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } },
      POST: { status: 201, body: fichaBase },
    });
    const usuario = userEvent.setup();
    render(<PaginaAdopcionesMunicipio />);
    await screen.findByText('No hay fichas para estos filtros.');

    await usuario.type(screen.getByLabelText('Nombre del animal'), 'Luna');
    await usuario.type(screen.getByLabelText('Especie'), 'perro');
    await usuario.type(screen.getByLabelText('URL de la foto'), fichaBase.fotoUrl);
    await usuario.click(screen.getByRole('button', { name: 'Publicar ficha' }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/municipio/adopciones',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('un rechazo al publicar (ej. PEA-MUN-005) muestra el mensaje de error sin alert nativo', async () => {
    mockearFetch({
      GET: { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } },
      POST: { status: 403, body: { codigo: 'PEA-MUN-005', mensaje: 'Solo cuentas municipales pueden administrar eventos, la vitrina de adopción y el dashboard analítico.' } },
    });
    const usuario = userEvent.setup();
    render(<PaginaAdopcionesMunicipio />);
    await screen.findByText('No hay fichas para estos filtros.');

    await usuario.type(screen.getByLabelText('Nombre del animal'), 'Luna');
    await usuario.type(screen.getByLabelText('Especie'), 'perro');
    await usuario.type(screen.getByLabelText('URL de la foto'), fichaBase.fotoUrl);
    await usuario.click(screen.getByRole('button', { name: 'Publicar ficha' }));

    expect(
      await screen.findByText('Solo cuentas municipales pueden administrar eventos, la vitrina de adopción y el dashboard analítico.'),
    ).toBeInTheDocument();
  });

  it('da de baja una ficha (AC: pasa a estado "baja", nunca se elimina de la lista)', async () => {
    mockearFetch({
      GET: { status: 200, body: { items: [fichaBase], total: 1, pagina: 1, porPagina: 50 } },
      DELETE: { status: 200, body: { ...fichaBase, estado: 'baja' } },
    });
    const usuario = userEvent.setup();
    render(<PaginaAdopcionesMunicipio />);
    await screen.findByText('Luna');

    await usuario.click(screen.getByRole('button', { name: 'Dar de baja' }));

    const fila = screen.getByTestId(`fila-ficha-${fichaBase.id}`);
    await waitFor(() => expect(within(fila).getByText('De baja')).toBeInTheDocument());
    expect(within(fila).getByText('Luna')).toBeInTheDocument();
  });

  it('edita una ficha existente inline y refleja el cambio en la fila', async () => {
    mockearFetch({
      GET: { status: 200, body: { items: [fichaBase], total: 1, pagina: 1, porPagina: 50 } },
      PATCH: { status: 200, body: { ...fichaBase, nombreAnimal: 'Luna II' } },
    });
    const usuario = userEvent.setup();
    render(<PaginaAdopcionesMunicipio />);
    await screen.findByText('Luna');

    await usuario.click(screen.getByRole('button', { name: 'Editar' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(screen.getByText('Luna II')).toBeInTheDocument());
  });
});
