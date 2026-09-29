import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecortadorFoto } from '@presentacion/componentes/reportes/RecortadorFoto';

describe('RecortadorFoto', () => {
  beforeEach(() => {
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = jest.fn();
    }
    jest.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:preview-recortada');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('muestra el estado inicial con botones grandes para cámara y galería', () => {
    render(<RecortadorFoto onFotoProcesada={jest.fn()} />);

    expect(screen.getByRole('button', { name: /Tomar foto ahora/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Elegir de la galería/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Subí una foto clara donde se vea la carita o el cuerpo del animal/i),
    ).toBeInTheDocument();
  });

  it('entra en modo recorte al seleccionar un archivo y muestra los controles', async () => {
    const usuario = userEvent.setup();
    render(<RecortadorFoto onFotoProcesada={jest.fn()} />);

    const archivo = new File(['foto-raw'], 'perro.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/Foto de la mascota/i);
    await usuario.upload(input, archivo);

    expect(screen.getByText('Acomodá la foto de tu mascota')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alejar foto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Acercar foto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Girar 90 grados' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Listo, usar esta foto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usar foto completa/i })).toBeInTheDocument();
  });

  it('permite usar la foto completa directamente sin recortar', async () => {
    const usuario = userEvent.setup();
    const alProcesar = jest.fn();
    render(<RecortadorFoto onFotoProcesada={alProcesar} />);

    const archivo = new File(['foto-raw'], 'gato.jpg', { type: 'image/jpeg' });
    await usuario.upload(screen.getByLabelText(/Foto de la mascota/i), archivo);

    await usuario.click(screen.getByRole('button', { name: /Usar foto completa/i }));

    expect(alProcesar).toHaveBeenCalledWith(expect.any(File), expect.stringContaining('blob:'));
    expect(screen.getByText(/Foto lista y optimizada/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cambiar foto/i })).toBeInTheDocument();
  });

  it('permite cambiar la foto confirmada para elegir otra', async () => {
    const usuario = userEvent.setup();
    const alLimpiar = jest.fn();
    render(
      <RecortadorFoto
        onFotoProcesada={jest.fn()}
        onLimpiar={alLimpiar}
        fotoUrlExistente="https://res.cloudinary.com/foto.jpg"
      />,
    );

    expect(screen.getByText(/Foto lista y optimizada/i)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Cambiar foto/i }));

    expect(alLimpiar).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Tomar foto ahora/i })).toBeInTheDocument();
  });

  it('permite ajustar el nivel de zoom y rotar la imagen', async () => {
    const usuario = userEvent.setup();
    render(<RecortadorFoto onFotoProcesada={jest.fn()} />);

    const archivo = new File(['foto-raw'], 'mascota.jpg', { type: 'image/jpeg' });
    await usuario.upload(screen.getByLabelText(/Foto de la mascota/i), archivo);

    const sliderZoom = screen.getByLabelText('Nivel de aumento');
    expect(sliderZoom).toHaveValue('1');

    await usuario.click(screen.getByRole('button', { name: 'Acercar foto' }));
    expect(sliderZoom).toHaveValue('1.2');

    await usuario.click(screen.getByRole('button', { name: 'Alejar foto' }));
    expect(sliderZoom).toHaveValue('1');

    const botonGirar = screen.getByRole('button', { name: 'Girar 90 grados' });
    await usuario.click(botonGirar);
    // Verificar que no arroja error al rotar
    expect(botonGirar).toBeInTheDocument();
  });
});
