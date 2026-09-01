import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaAdopciones from '@app/adopciones/page';

const fichaBase = {
  id: '11111111-1111-1111-1111-111111111111',
  nombreAnimal: 'Luna',
  especie: 'perro',
  edadAproximada: 3,
  tamano: 'mediano',
  temperamento: 'Sociable, tranquila con otros animales.',
  estadoSalud: 'Sana, castrada y vacunada',
  requisitosAdopcion: 'Visita previa a la vivienda obligatoria.',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/luna.jpg',
  estado: 'disponible',
  createdAt: '2026-08-01T12:00:00.000Z',
};

function mockearFetch(respuestas: Array<{ status: number; body: unknown }>) {
  let llamada = 0;
  global.fetch = jest.fn().mockImplementation(async () => {
    const respuesta = respuestas[Math.min(llamada, respuestas.length - 1)]!;
    llamada += 1;
    return { ok: respuesta.status >= 200 && respuesta.status < 300, status: respuesta.status, json: async () => respuesta.body };
  }) as jest.Mock;
}

describe('PaginaAdopciones (app/adopciones/page.tsx)', () => {
  it('AC (Paso 3): renderiza la galería con la ficha disponible (nombre, especie, foto)', async () => {
    mockearFetch([{ status: 200, body: { items: [fichaBase], total: 1, pagina: 1, porPagina: 50 } }]);
    render(<PaginaAdopciones />);

    expect(await screen.findByText('Luna')).toBeInTheDocument();
    expect(screen.getByText('· perro')).toBeInTheDocument();
    const foto = screen.getByRole('img', { name: 'Luna' });
    expect(foto).toHaveAttribute('src', fichaBase.fotoUrl);
  });

  it('AC (Paso 3): dado cero fichas disponibles, muestra el estado vacío con borde discontinuo', async () => {
    mockearFetch([{ status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } }]);
    render(<PaginaAdopciones />);

    const contenedor = (await screen.findByText('Por ahora no hay animales disponibles para adopción.')).closest('div')!;
    expect(contenedor).toHaveClass('border-dashed');
  });

  it('consulta GET /api/adopciones (vitrina pública, no el panel municipal)', async () => {
    mockearFetch([{ status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } }]);
    render(<PaginaAdopciones />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/adopciones?pagina=1&porPagina=50'));
  });

  it('muestra un mensaje de error si la carga falla', async () => {
    mockearFetch([{ status: 500, body: { codigo: 'PEA-SIS-003', mensaje: 'Algo salió mal de nuestro lado.' } }]);
    render(<PaginaAdopciones />);

    expect(await screen.findByText('Algo salió mal de nuestro lado.')).toBeInTheDocument();
  });

  it('pagina hacia la página siguiente cuando hay más de 50 fichas', async () => {
    mockearFetch([
      { status: 200, body: { items: [fichaBase], total: 75, pagina: 1, porPagina: 50 } },
      { status: 200, body: { items: [{ ...fichaBase, id: 'ficha-2', nombreAnimal: 'Rocky' }], total: 75, pagina: 2, porPagina: 50 } },
    ]);
    const usuario = userEvent.setup();
    render(<PaginaAdopciones />);
    await screen.findByText('Luna');

    await usuario.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(await screen.findByText('Rocky')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
  });

  it('no muestra el paginador con 50 fichas o menos', async () => {
    mockearFetch([{ status: 200, body: { items: [fichaBase], total: 1, pagina: 1, porPagina: 50 } }]);
    render(<PaginaAdopciones />);
    await screen.findByText('Luna');

    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
  });
});
