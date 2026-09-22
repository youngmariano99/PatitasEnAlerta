import { render, screen } from '@testing-library/react';
import PaginaMascotas from '@app/mascotas/page';

function mockFetch(datos: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => datos,
  }) as jest.Mock;
}

describe('PaginaMascotas (app/mascotas)', () => {
  it('muestra el estado vacío ilustrado cuando el dueño no tiene mascotas', async () => {
    mockFetch([]);
    render(<PaginaMascotas />);

    expect(await screen.findByText('Todavía no registraste ninguna mascota')).toBeInTheDocument();
  });

  it('lista las mascotas del dueño con link a su ficha', async () => {
    mockFetch([
      {
        id: 'mascota-1',
        nombre: 'Toby',
        especie: 'perro',
        fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
        raza: 'Mestizo',
        edadAproximada: 3,
      },
    ]);
    render(<PaginaMascotas />);

    const enlace = await screen.findByRole('link', { name: /Toby/ });
    expect(enlace).toHaveAttribute('href', '/mascotas/mascota-1');
    expect(screen.getByText(/Mestizo/)).toBeInTheDocument();
  });

  it('muestra un error si la carga falla', async () => {
    mockFetch({ codigo: 'PEA-SIS-003', mensaje: 'Algo salió mal.' }, false);
    render(<PaginaMascotas />);

    expect(await screen.findByText('Algo salió mal.')).toBeInTheDocument();
  });
});
