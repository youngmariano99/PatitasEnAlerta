import { render, screen, fireEvent } from '@testing-library/react';
import { ImagenConFallback } from '@presentacion/componentes/ui/ImagenConFallback';

describe('ImagenConFallback', () => {
  it('renderiza la imagen normalmente cuando carga bien', () => {
    render(<ImagenConFallback src="https://ejemplo.test/foto.jpg" alt="Luna" />);

    const img = screen.getByRole('img', { name: 'Luna' });
    expect(img.getAttribute('src')).toContain(encodeURIComponent('https://ejemplo.test/foto.jpg'));
  });

  it('ante un error de carga, reemplaza la imagen por un bloque con ícono en vez del ícono roto del navegador', () => {
    render(<ImagenConFallback src="https://ejemplo.test/rota.jpg" alt="Luna" />);

    fireEvent.error(screen.getByRole('img', { name: 'Luna' }));

    const fallback = screen.getByRole('img', { name: 'Luna' });
    expect(fallback.tagName).toBe('DIV');
    expect(fallback.querySelector('svg')).toBeInTheDocument();
  });
});
