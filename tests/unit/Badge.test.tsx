import { render, screen } from '@testing-library/react';
import { Badge } from '@presentacion/componentes/ui/Badge';

describe('Badge', () => {
  it('nunca comunica el estado solo por color: siempre lleva un ícono junto al texto', () => {
    render(<Badge tono="peligro">Vencido</Badge>);

    const badge = screen.getByText('Vencido');
    expect(badge).toHaveTextContent('⛔');
    expect(badge).toHaveTextContent('Vencido');
  });

  it('usa el tono neutro por defecto', () => {
    render(<Badge>Pendiente</Badge>);

    expect(screen.getByText('Pendiente')).toHaveClass('bg-surface2');
  });
});
