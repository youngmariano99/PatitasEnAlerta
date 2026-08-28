import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaNuevaPassword from '@app/auth/recuperar-password/nueva/page';

const onAuthStateChangeMock = jest.fn();
const getSessionMock = jest.fn();
const updateUserMock = jest.fn();
const unsubscribeMock = jest.fn();

jest.mock('@infraestructura/adaptadores/ClienteSupabaseNavegador', () => ({
  crearClienteSupabaseNavegador: () => ({
    auth: {
      onAuthStateChange: onAuthStateChangeMock,
      getSession: getSessionMock,
      updateUser: updateUserMock,
    },
  }),
}));

function simularEnlaceValido() {
  onAuthStateChangeMock.mockImplementation((callback: (evento: string, sesion: unknown) => void) => {
    callback('PASSWORD_RECOVERY', { access_token: 'token-de-prueba' });
    return { data: { subscription: { unsubscribe: unsubscribeMock } } };
  });
  getSessionMock.mockResolvedValue({ data: { session: null } });
}

function simularEnlaceInvalido() {
  onAuthStateChangeMock.mockImplementation(() => ({
    data: { subscription: { unsubscribe: unsubscribeMock } },
  }));
  getSessionMock.mockResolvedValue({ data: { session: null } });
}

async function completarFormularioValido() {
  const usuario = userEvent.setup();
  await usuario.type(screen.getByLabelText('Nueva contraseña'), 'contraseñaSegura123');
  await usuario.type(screen.getByLabelText('Confirmá tu nueva contraseña'), 'contraseñaSegura123');
  return usuario;
}

describe('PaginaNuevaPassword (app/auth/recuperar-password/nueva)', () => {
  beforeEach(() => {
    onAuthStateChangeMock.mockReset();
    getSessionMock.mockReset();
    updateUserMock.mockReset();
    unsubscribeMock.mockReset();
  });

  it('muestra el formulario cuando Supabase confirma un token de recuperación válido (evento PASSWORD_RECOVERY)', async () => {
    simularEnlaceValido();
    render(<PaginaNuevaPassword />);

    expect(await screen.findByLabelText('Nueva contraseña')).toBeInTheDocument();
  });

  it('actualiza la contraseña con éxito y muestra la confirmación', async () => {
    simularEnlaceValido();
    updateUserMock.mockResolvedValue({ error: null });
    render(<PaginaNuevaPassword />);
    await screen.findByLabelText('Nueva contraseña');
    const usuario = await completarFormularioValido();

    await usuario.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));

    expect(await screen.findByText('Contraseña actualizada')).toBeInTheDocument();
    expect(updateUserMock).toHaveBeenCalledWith({ password: 'contraseñaSegura123' });
  });

  it('si el token se invalidó justo antes del submit, muestra el enlace no disponible con CTA para reenviar (PEA-AUTH-004)', async () => {
    simularEnlaceValido();
    updateUserMock.mockResolvedValue({ error: { message: 'Token has expired or is invalid' } });
    render(<PaginaNuevaPassword />);
    await screen.findByLabelText('Nueva contraseña');
    const usuario = await completarFormularioValido();

    await usuario.click(screen.getByRole('button', { name: 'Guardar nueva contraseña' }));

    expect(
      await screen.findByText('El enlace para recuperar tu contraseña venció o ya fue usado. Pedí uno nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute(
      'href',
      '/auth/recuperar-password',
    );
  });

  it('muestra el enlace no disponible si nunca llega un token de recuperación válido', async () => {
    jest.useFakeTimers();
    simularEnlaceInvalido();
    render(<PaginaNuevaPassword />);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(4000);
    });

    expect(screen.getByText('El enlace para recuperar tu contraseña venció o ya fue usado. Pedí uno nuevo.')).toBeInTheDocument();
    jest.useRealTimers();
  });
});
