import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';

describe('CampoTexto', () => {
  it('asocia el label con el input y muestra el texto de ayuda cuando no hay error', () => {
    render(<CampoTexto id="email" label="Email" ayuda="Usá tu email real" value="" onChange={() => {}} />);

    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByText('Usá tu email real')).toBeInTheDocument();
  });

  it('comunica el error con ícono + texto (nunca solo color) y marca aria-invalid', () => {
    render(
      <CampoTexto
        id="email"
        label="Email"
        value="mal-formado"
        onChange={() => {}}
        error="El formato del email no parece válido."
      />,
    );

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('border-red-500');
    const mensajeError = screen.getByText('El formato del email no parece válido.');
    expect(mensajeError).toBeInTheDocument();
    expect(mensajeError.parentElement).toHaveTextContent('⚠️');
  });

  it('propaga el evento onChange al escribir', async () => {
    const usuario = userEvent.setup();
    const alCambiar = jest.fn();
    render(<CampoTexto id="email" label="Email" value="" onChange={alCambiar} />);

    await usuario.type(screen.getByLabelText('Email'), 'a');

    expect(alCambiar).toHaveBeenCalled();
  });
});
