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

  it('al elegir "Veterinario/a" muestra los campos de matrícula y colegio emisor (PerfilFormularioFactory, AC1)', async () => {
    const usuario = userEvent.setup();
    render(<PaginaRegistroDueno />);

    expect(screen.queryByLabelText('Matrícula profesional')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('radio', { name: 'Veterinario/a' }));

    expect(screen.getByLabelText('Matrícula profesional')).toBeInTheDocument();
    expect(screen.getByLabelText('Colegio que emitió tu matrícula')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
  });

  it('registra un veterinario con éxito enviando rol=veterinario y los campos de matrícula', async () => {
    mockearFetch({
      status: 201,
      body: { id: '1', email: 'vet@ejemplo.test', matricula: 'MP-1001', colegioEmisor: 'Colegio X', estadoVerificacion: 'pendiente' },
    });
    const usuario = userEvent.setup();
    render(<PaginaRegistroDueno />);

    await usuario.click(screen.getByRole('radio', { name: 'Veterinario/a' }));
    await usuario.type(screen.getByLabelText('Email'), 'vet@ejemplo.test');
    await usuario.type(screen.getByLabelText('Contraseña'), 'contraseñaSegura123');
    await usuario.type(screen.getByLabelText('Matrícula profesional'), 'MP-1001');
    await usuario.type(screen.getByLabelText('Colegio que emitió tu matrícula'), 'Colegio X');
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('¡Cuenta creada!')).toBeInTheDocument();
    expect(screen.getByText(/matrícula queda en revisión/)).toBeInTheDocument();
    const [, opciones] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(opciones.body)).toMatchObject({
      email: 'vet@ejemplo.test',
      matricula: 'MP-1001',
      colegioEmisor: 'Colegio X',
      rol: 'veterinario',
    });
  });

  it('resalta matrícula y colegio emisor ante un conflicto de unicidad (409 / PEA-AUTH-006)', async () => {
    mockearFetch({
      status: 409,
      body: { codigo: 'PEA-AUTH-006', mensaje: 'Ya existe una matrícula registrada con esos datos para este colegio.' },
    });
    const usuario = userEvent.setup();
    render(<PaginaRegistroDueno />);

    await usuario.click(screen.getByRole('radio', { name: 'Veterinario/a' }));
    await usuario.type(screen.getByLabelText('Email'), 'vet@ejemplo.test');
    await usuario.type(screen.getByLabelText('Contraseña'), 'contraseñaSegura123');
    await usuario.type(screen.getByLabelText('Matrícula profesional'), 'MP-1001');
    await usuario.type(screen.getByLabelText('Colegio que emitió tu matrícula'), 'Colegio X');
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    const mensajes = await screen.findAllByText(
      'Ya existe una matrícula registrada con esos datos para este colegio. Verificá el número ingresado.',
    );
    expect(mensajes).toHaveLength(2);
    expect(screen.getByLabelText('Matrícula profesional')).toHaveClass('border-red-500');
    expect(screen.getByLabelText('Colegio que emitió tu matrícula')).toHaveClass('border-red-500');
  });

  it('cambiar de rol limpia los errores de duplicado mostrados previamente', async () => {
    mockearFetch({ status: 409, body: { codigo: 'PEA-AUTH-001', mensaje: 'Ya existe una cuenta con ese email.' } });
    render(<PaginaRegistroDueno />);
    const usuario = await completarFormularioValido();
    await usuario.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    await screen.findByText(/Ya existe una cuenta con ese email/);

    await usuario.click(screen.getByRole('radio', { name: 'Veterinario/a' }));

    expect(screen.queryByText(/Ya existe una cuenta con ese email/)).not.toBeInTheDocument();
  });
});
