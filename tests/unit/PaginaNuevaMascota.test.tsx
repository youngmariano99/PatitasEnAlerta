import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaNuevaMascota from '@app/mascotas/nueva/page';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const URL_CLOUDINARY = 'https://api.cloudinary.com/v1_1/patitas-en-alerta/image/upload';
const FOTO_SUBIDA = 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/mascotas/toby.jpg';

function mockearFetch(respuestaApi: { status: number; body: unknown }) {
  global.fetch = jest.fn().mockImplementation(async (url: string) => {
    if (url === URL_CLOUDINARY) {
      return { ok: true, json: async () => ({ secure_url: FOTO_SUBIDA }) };
    }
    return { status: respuestaApi.status, json: async () => respuestaApi.body };
  }) as jest.Mock;
}

async function seleccionarImagen(usuario: ReturnType<typeof userEvent.setup>) {
  const archivo = new File(['contenido'], 'toby.jpg', { type: 'image/jpeg' });
  await usuario.upload(screen.getByLabelText('Foto'), archivo);
  await waitFor(() => expect(screen.queryByText('Subiendo imagen…')).not.toBeInTheDocument());
}

describe('PaginaNuevaMascota (app/mascotas/nueva)', () => {
  const envOriginal = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'patitas-en-alerta';
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = 'patitas_en_alerta_dev';
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = jest.fn();
    }
    jest.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:preview');
    pushMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...envOriginal };
    jest.restoreAllMocks();
  });

  it('mantiene el submit deshabilitado sin nombre/especie completos', () => {
    render(<PaginaNuevaMascota />);

    expect(screen.getByRole('button', { name: 'Registrar mascota' })).toBeDisabled();
  });

  it('muestra el error ⚠️ en el campo de imagen si se intenta enviar sin foto seleccionada', async () => {
    global.fetch = jest.fn();
    const usuario = userEvent.setup();
    render(<PaginaNuevaMascota />);

    await usuario.type(screen.getByLabelText('Nombre'), 'Toby');
    await usuario.type(screen.getByLabelText('Especie'), 'Perro');
    await usuario.click(screen.getByRole('button', { name: 'Registrar mascota' }));

    expect(
      await screen.findByText('Necesitamos al menos una foto de tu mascota para completar el registro.'),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sube la imagen a Cloudinary al seleccionarla y registra la mascota con éxito', async () => {
    mockearFetch({ status: 201, body: { id: 'm1', dueñoId: 'd1', nombre: 'Toby', especie: 'perro' } });
    const usuario = userEvent.setup();
    render(<PaginaNuevaMascota />);

    await usuario.type(screen.getByLabelText('Nombre'), 'Toby');
    await usuario.type(screen.getByLabelText('Especie'), 'Perro');
    await seleccionarImagen(usuario);

    await usuario.click(screen.getByRole('button', { name: 'Registrar mascota' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/mascotas'));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/mascotas',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          nombre: 'Toby',
          especie: 'Perro',
          fotoUrl: FOTO_SUBIDA,
          raza: undefined,
          edadAproximada: undefined,
          identificacionChip: undefined,
        }),
      }),
    );
  });

  it('muestra el error del servidor (PEA-AUTH-010) en el campo de imagen si el backend lo rechaza', async () => {
    mockearFetch({
      status: 400,
      body: { codigo: 'PEA-AUTH-010', mensaje: 'Necesitamos al menos una foto de tu mascota para completar el registro.' },
    });
    const usuario = userEvent.setup();
    render(<PaginaNuevaMascota />);

    await usuario.type(screen.getByLabelText('Nombre'), 'Toby');
    await usuario.type(screen.getByLabelText('Especie'), 'Perro');
    await seleccionarImagen(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Registrar mascota' }));

    expect(
      await screen.findByText('Necesitamos al menos una foto de tu mascota para completar el registro.'),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('muestra un error general ante una falla no relacionada con la foto', async () => {
    mockearFetch({ status: 500, body: { codigo: 'PEA-SIS-003', mensaje: 'Algo salió mal de nuestro lado.' } });
    const usuario = userEvent.setup();
    render(<PaginaNuevaMascota />);

    await usuario.type(screen.getByLabelText('Nombre'), 'Toby');
    await usuario.type(screen.getByLabelText('Especie'), 'Perro');
    await seleccionarImagen(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Registrar mascota' }));

    expect(await screen.findByText('Algo salió mal de nuestro lado.')).toBeInTheDocument();
  });
});
