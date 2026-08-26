import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaRegistroDueno from '@app/auth/registro/page';

function mockearFetch(respuesta: { status: number; body: unknown }) {
  global.fetch = jest.fn().mockResolvedValue({
    status: respuesta.status,
    json: async () => respuesta.body,
  }) as jest.Mock;
}

async function completarFormularioValido() {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Email'), 'ana@ejemplo.test');
  await usuario.type(screen.getByLabelText('Contraseña'), 'contraseñaSegura123');
  return usuario;
}

describe('PaginaRegistroDueno (app/auth/registro)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mantiene el submit deshabilitado con el formulario vacío', () => {
    render(<PaginaRegistroDueno />);

    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
  });

  it('muestra el error de formato de email tras el blur y no habilita el submit, sin llamar al backend', async () => {
    global.fetch = jest.fn();
    const usuario = userEvent.setup();
    render(<PaginaRegistroDueno />);

    await usuario.type(screen.getByLabelText('Email'), 'no-es-un-email');
    await usuario.tab();

    expect(await screen.findByText(/formato del email no parece válido/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('registra con éxito (201) y muestra la pantalla de confirmación', async () => {
    mockearFetch({ status: 201, body: { id: '1', email: 'ana@ejemplo.test', rolId: 1 } });
    render(<PaginaRegistroDueno />);
    const usuario = await completarFormularioValido();

    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('¡Cuenta creada!')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/registro',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('muestra las CTAs de login/recuperar contraseña ante un email duplicado (409 / PEA-AUTH-001)', async () => {
    mockearFetch({
      status: 409,
      body: { codigo: 'PEA-AUTH-001', mensaje: 'Ya existe una cuenta con ese email.' },
    });
    render(<PaginaRegistroDueno />);
    const usuario = await completarFormularioValido();

    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText(/Ya existe una cuenta con ese email/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/auth/login');
    expect(screen.getByRole('link', { name: 'Recuperar contraseña' })).toHaveAttribute(
      'href',
      '/auth/recuperar-password',
    );
  });

  it('muestra el mensaje de error general ante una falla no relacionada con email duplicado', async () => {
    mockearFetch({
      status: 500,
      body: { codigo: 'PEA-SIS-003', mensaje: 'Algo salió mal de nuestro lado.' },
    });
    render(<PaginaRegistroDueno />);
    const usuario = await completarFormularioValido();

    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Algo salió mal de nuestro lado.')).toBeInTheDocument();
  });

  it('muestra un mensaje de conexión si el fetch falla de red', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    render(<PaginaRegistroDueno />);
    const usuario = await completarFormularioValido();

    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText(/No pudimos conectarnos con el servidor/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear cuenta' })).not.toBeDisabled());
  });
});
