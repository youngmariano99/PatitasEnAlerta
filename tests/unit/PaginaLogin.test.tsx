import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaLogin from '@app/auth/login/page';

const pushMock = jest.fn();
const signInWithPasswordMock = jest.fn();
let redirectToParam: string | null = null;

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({
    get: (clave: string) => (clave === 'redirectTo' ? redirectToParam : null),
  }),
}));

jest.mock('@infraestructura/adaptadores/ClienteSupabaseNavegador', () => ({
  crearClienteSupabaseNavegador: () => ({
    auth: { signInWithPassword: signInWithPasswordMock },
  }),
}));

describe('PaginaLogin (app/auth/login)', () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInWithPasswordMock.mockReset();
    redirectToParam = null;
  });

  it('inicia sesión con éxito y redirige a /panel por defecto', async () => {
    const usuario = userEvent.setup();
    signInWithPasswordMock.mockResolvedValue({ data: {}, error: null });
    render(<PaginaLogin />);

    await usuario.type(screen.getByLabelText('Email'), 'dueno@ejemplo.test');
    await usuario.type(screen.getByLabelText('Contraseña'), 'contraseña-correcta');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: 'dueno@ejemplo.test',
      password: 'contraseña-correcta',
    });
    expect(pushMock).toHaveBeenCalledWith('/panel');
  });

  it('respeta ?redirectTo= cuando es una ruta relativa propia', async () => {
    const usuario = userEvent.setup();
    redirectToParam = '/mascotas';
    signInWithPasswordMock.mockResolvedValue({ data: {}, error: null });
    render(<PaginaLogin />);

    await usuario.type(screen.getByLabelText('Email'), 'dueno@ejemplo.test');
    await usuario.type(screen.getByLabelText('Contraseña'), 'contraseña-correcta');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(pushMock).toHaveBeenCalledWith('/mascotas');
  });

  it('AC (anti open-redirect): ignora un redirectTo absoluto o externo y cae a /panel', async () => {
    const usuario = userEvent.setup();
    redirectToParam = '//evil.example.com';
    signInWithPasswordMock.mockResolvedValue({ data: {}, error: null });
    render(<PaginaLogin />);

    await usuario.type(screen.getByLabelText('Email'), 'dueno@ejemplo.test');
    await usuario.type(screen.getByLabelText('Contraseña'), 'contraseña-correcta');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(pushMock).toHaveBeenCalledWith('/panel');
  });

  it('muestra un mensaje genérico ante credenciales inválidas, sin distinguir email de password (anti-enumeración)', async () => {
    const usuario = userEvent.setup();
    signInWithPasswordMock.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });
    render(<PaginaLogin />);

    await usuario.type(screen.getByLabelText('Email'), 'dueno@ejemplo.test');
    await usuario.type(screen.getByLabelText('Contraseña'), 'contraseña-incorrecta');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(
      await screen.findByText(
        'Email o contraseña incorrectos. Revisá los datos e intentá de nuevo.',
      ),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('muestra un mensaje de conexión si el pedido falla de red', async () => {
    const usuario = userEvent.setup();
    signInWithPasswordMock.mockRejectedValue(new Error('network error'));
    render(<PaginaLogin />);

    await usuario.type(screen.getByLabelText('Email'), 'dueno@ejemplo.test');
    await usuario.type(screen.getByLabelText('Contraseña'), 'contraseña-correcta');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(
      await screen.findByText(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      ),
    ).toBeInTheDocument();
  });

  it('mantiene el submit deshabilitado hasta completar email y contraseña', () => {
    render(<PaginaLogin />);

    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDisabled();
  });
});
