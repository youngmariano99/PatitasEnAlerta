import { render, screen } from '@testing-library/react';
import HomePage from '@app/page';
import RootLayout, { metadata } from '@app/layout';

describe('HomePage (placeholder de la raíz "/")', () => {
  it('muestra el título del proyecto', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: /Patitas en Alerta/i })).toBeInTheDocument();
  });
});

describe('RootLayout', () => {
  it('define el idioma español y el título/descripción del sitio, y renderiza sus children', () => {
    const elemento = RootLayout({ children: 'contenido-de-prueba' as unknown as React.ReactNode });

    expect(elemento.props.lang).toBe('es');
    expect(elemento.props.className).toBe('dark');
    expect(elemento.props.children.props.children).toBe('contenido-de-prueba');
    expect(metadata.title).toBe('Patitas en Alerta');
  });
});
