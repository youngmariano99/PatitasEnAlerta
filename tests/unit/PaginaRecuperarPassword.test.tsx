import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaRecuperarPassword from '@app/auth/recuperar-password/page';

function mockearFetch(respuesta: { status: number; body: unknown }) {
  global.fetch = jest.fn().mockResolvedValue({
    status: respuesta.status,
    json: async () => respuesta.body,
  }) as jest.Mock;
}

const MENSAJE_EXITO_PARCIAL = 'te enviamos instrucciones para recuperar tu contraseña';

describe('PaginaRecuperarPassword (app/auth/recuperar-password)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('muestra el mismo mensaje de éxito para cualquier email con formato válido (200 siempre)', async () => {
    mockearFetch({ status: 200, body: { mensaje: 'Si existe una cuenta con ese email...' } });
    const usuario = userEvent.setup();
    render(<PaginaRecuperarPassword />);

    await usuario.type(screen.getByLabelText('Email'), 'cualquiera@ejemplo.test');
    await usuario.click(screen.getByRole('button', { name: 'Enviar instrucciones' }));

    expect(await screen.findByText(new RegExp(MENSAJE_EXITO_PARCIAL))).toBeInTheDocument();
  });

  it('no permite enviar con un email de formato inválido, sin llamar al backend', async () => {
    global.fetch = jest.fn();
    const usuario = userEvent.setup();
    render(<PaginaRecuperarPassword />);

    await usuario.type(screen.getByLabelText('Email'), 'no-es-un-email');
    await usuario.click(screen.getByRole('button', { name: 'Enviar instrucciones' }));

    expect(await screen.findByText(/formato del email no parece válido/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('muestra un error de conexión si el fetch falla de red', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const usuario = userEvent.setup();
    render(<PaginaRecuperarPassword />);

    await usuario.type(screen.getByLabelText('Email'), 'ana@ejemplo.test');
    await usuario.click(screen.getByRole('button', { name: 'Enviar instrucciones' }));

    expect(await screen.findByText(/No pudimos conectarnos con el servidor/)).toBeInTheDocument();
  });
});
