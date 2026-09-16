import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaDetalleMascota from '@app/mascotas/[id]/page';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'mascota-1' }),
  useRouter: () => ({ push: pushMock }),
}));

const mascotaBase = {
  id: 'mascota-1',
  nombre: 'Toby',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
  raza: 'Mestizo',
  edadAproximada: 3,
  identificacionChip: null,
};

function mockFetchSecuencial(...respuestas: Array<{ ok: boolean; status: number; body: unknown }>) {
  const mockFn = jest.fn();
  respuestas.forEach((r) => {
    mockFn.mockImplementationOnce(async () => ({
      ok: r.ok,
      status: r.status,
      json: async () => r.body,
    }));
  });
  global.fetch = mockFn as unknown as typeof fetch;
  return mockFn;
}

describe('PaginaDetalleMascota (app/mascotas/[id])', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('muestra la ficha de la mascota', async () => {
    mockFetchSecuencial({ ok: true, status: 200, body: mascotaBase });
    render(<PaginaDetalleMascota />);

    expect(await screen.findByRole('heading', { name: 'Toby' })).toBeInTheDocument();
    expect(screen.getByText('Mestizo')).toBeInTheDocument();
  });

  it('permite editar el nombre y guarda los cambios', async () => {
    const usuario = userEvent.setup();
    mockFetchSecuencial(
      { ok: true, status: 200, body: mascotaBase },
      { ok: true, status: 200, body: { ...mascotaBase, nombre: 'Toby II' } },
    );
    render(<PaginaDetalleMascota />);

    await screen.findByRole('heading', { name: 'Toby' });
    await usuario.click(screen.getByRole('button', { name: 'Editar datos' }));
    const campoNombre = screen.getByLabelText('Nombre');
    await usuario.clear(campoNombre);
    await usuario.type(campoNombre, 'Toby II');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('heading', { name: 'Toby II' })).toBeInTheDocument();
  });

  it('pide confirmación antes de dar de baja y redirige a /mascotas tras confirmar', async () => {
    const usuario = userEvent.setup();
    mockFetchSecuencial(
      { ok: true, status: 200, body: mascotaBase },
      { ok: true, status: 200, body: { id: 'mascota-1' } },
    );
    render(<PaginaDetalleMascota />);

    await screen.findByRole('heading', { name: 'Toby' });
    await usuario.click(screen.getByRole('button', { name: 'Dar de baja' }));
    expect(
      screen.getByText(
        (_texto, elemento) =>
          elemento?.textContent ===
          '⚠️¿Seguro que querés dar de baja a Toby? No vas a poder revertirlo desde acá.',
      ),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Sí, dar de baja' }));

    expect(pushMock).toHaveBeenCalledWith('/mascotas');
  });

  it('muestra un estado de error ilustrado si la mascota no existe o es ajena', async () => {
    mockFetchSecuencial({
      ok: false,
      status: 403,
      body: { codigo: 'PEA-SIS-002', mensaje: 'No tenés permiso.' },
    });
    render(<PaginaDetalleMascota />);

    expect(await screen.findByText('No pudimos mostrar esta mascota')).toBeInTheDocument();
    expect(screen.getByText('No tenés permiso.')).toBeInTheDocument();
  });
});
