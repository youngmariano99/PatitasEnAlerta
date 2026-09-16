import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Boton } from '@presentacion/componentes/ui/Boton';

describe('Boton', () => {
  it('renderiza con la variante primaria por defecto y dispara onClick', async () => {
    const usuario = userEvent.setup();
    const alHacerClick = jest.fn();
    render(<Boton onClick={alHacerClick}>Confirmar</Boton>);

    const boton = screen.getByRole('button', { name: 'Confirmar' });
    expect(boton).toHaveClass('bg-primary');
    await usuario.click(boton);

    expect(alHacerClick).toHaveBeenCalledTimes(1);
  });

  it('mantiene el área táctil mínima de 44x44px en cualquier variante', () => {
    render(<Boton variante="alerta">Emergencia</Boton>);

    expect(screen.getByRole('button', { name: 'Emergencia' })).toHaveClass(
      'min-h-touch',
      'min-w-touch',
    );
  });

  it('se deshabilita correctamente sin perder accesibilidad', () => {
    render(<Boton disabled>No disponible</Boton>);

    expect(screen.getByRole('button', { name: 'No disponible' })).toBeDisabled();
  });
});
