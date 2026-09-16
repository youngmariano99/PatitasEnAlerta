import { render, screen } from '@testing-library/react';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';

describe('EstadoIlustrado', () => {
  it('muestra la mascota, el título y la descripción', () => {
    render(
      <EstadoIlustrado
        imagenSrc="/animales/Éxito-Confirmación.png"
        alt="Mascotas festejando"
        titulo="¡Listo!"
        descripcion="Tu reporte fue publicado."
      />,
    );

    expect(screen.getByRole('img', { name: 'Mascotas festejando' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¡Listo!' })).toBeInTheDocument();
    expect(screen.getByText('Tu reporte fue publicado.')).toBeInTheDocument();
  });

  it('renderiza la acción cuando se provee', () => {
    render(
      <EstadoIlustrado
        imagenSrc="/animales/Registro.png"
        alt="Mascota de bienvenida"
        titulo="Sin reportes todavía"
        accion={<button>Crear el primero</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Crear el primero' })).toBeInTheDocument();
  });
});

describe('EncabezadoIlustrado', () => {
  it('muestra la mascota compacta junto al título de la página', () => {
    render(
      <EncabezadoIlustrado
        imagenSrc="/animales/Crear-alerta.png"
        alt="Mascota con celular"
        titulo="Nuevo reporte"
      />,
    );

    expect(screen.getByRole('img', { name: 'Mascota con celular' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuevo reporte' })).toBeInTheDocument();
  });
});
