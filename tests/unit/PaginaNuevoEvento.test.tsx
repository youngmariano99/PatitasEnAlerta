import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaNuevoEvento from '@app/municipio/eventos/nuevo/page';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Evita renderizar Leaflet real (toca `window`/mide el DOM, frágil en jsdom):
// un botón simple que simula "tocar el mapa" alcanza para probar el flujo,
// mismo criterio que FormularioReporteWizard.test.tsx.
jest.mock('@presentacion/componentes/mapas/SelectorUbicacionMapa', () => ({
  SelectorUbicacionMapa: ({ onSeleccionar }: { onSeleccionar: (latitud: number, longitud: number) => void }) => (
    <button type="button" onClick={() => onSeleccionar(-37.9989, -61.3565)}>
      Marcar ubicación (mock)
    </button>
  ),
}));

function mockearFetch(respuesta: { status: number; body: unknown }) {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ status: respuesta.status, json: async () => respuesta.body }) as jest.Mock;
}

function fechaFuturaInputValue(): string {
  const fecha = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return fecha.toISOString().slice(0, 16);
}

async function completarFormularioValido(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('Título'), 'Jornada de castración');
  await usuario.selectOptions(screen.getByLabelText('Tipo de operativo'), 'castracion');
  await usuario.type(screen.getByLabelText('Dirección'), 'Calle 25 N° 450');
  await usuario.click(screen.getByRole('button', { name: 'Marcar ubicación (mock)' }));
  await usuario.type(screen.getByLabelText('Fecha y hora'), fechaFuturaInputValue());
  await usuario.type(screen.getByLabelText('Cupos totales'), '30');
}

describe('PaginaNuevoEvento (app/municipio/eventos/nuevo)', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('mantiene el submit deshabilitado sin los campos obligatorios completos', () => {
    render(<PaginaNuevoEvento />);

    expect(screen.getByRole('button', { name: 'Publicar operativo' })).toBeDisabled();
  });

  it('exige marcar la ubicación en el mapa aunque el resto de los campos esté completo', async () => {
    const usuario = userEvent.setup();
    global.fetch = jest.fn();
    render(<PaginaNuevoEvento />);

    await usuario.type(screen.getByLabelText('Título'), 'Jornada de castración');
    await usuario.selectOptions(screen.getByLabelText('Tipo de operativo'), 'castracion');
    await usuario.type(screen.getByLabelText('Dirección'), 'Calle 25 N° 450');
    await usuario.type(screen.getByLabelText('Fecha y hora'), fechaFuturaInputValue());
    await usuario.type(screen.getByLabelText('Cupos totales'), '30');
    // El botón sigue deshabilitado (no requiere posición para habilitarse),
    // así que se dispara el submit del form directamente.
    const formulario = screen.getByRole('button', { name: 'Publicar operativo' }).closest('form')!;
    formulario.requestSubmit();

    expect(await screen.findByText('Marcá en el mapa dónde se realiza el operativo.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('publica el operativo con éxito y redirige al calendario', async () => {
    mockearFetch({
      status: 201,
      body: { id: 'evento-1', municipioId: 'municipio-1', titulo: 'Jornada de castración', estado: 'reportado' },
    });
    const usuario = userEvent.setup();
    render(<PaginaNuevoEvento />);

    await completarFormularioValido(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Publicar operativo' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/municipio/eventos'));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/municipio/eventos',
      expect.objectContaining({ method: 'POST' }),
    );
    const cuerpoEnviado = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(cuerpoEnviado).toMatchObject({
      titulo: 'Jornada de castración',
      tipo: 'castracion',
      direccion: 'Calle 25 N° 450',
      latitud: -37.9989,
      longitud: -61.3565,
      cuposTotales: 30,
    });
  });

  it('muestra el error de fecha en el campo correspondiente (PEA-MUN-004), sin alert nativo', async () => {
    mockearFetch({ status: 400, body: { codigo: 'PEA-MUN-004', mensaje: 'La fecha del evento tiene que ser posterior a hoy.' } });
    const usuario = userEvent.setup();
    render(<PaginaNuevoEvento />);

    await completarFormularioValido(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Publicar operativo' }));

    expect(await screen.findByText('La fecha del evento tiene que ser posterior a hoy.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('muestra un error general ante un rechazo no relacionado con la fecha (ej. PEA-MUN-005)', async () => {
    mockearFetch({
      status: 403,
      body: { codigo: 'PEA-MUN-005', mensaje: 'Solo cuentas municipales pueden administrar eventos, la vitrina de adopción y el dashboard analítico.' },
    });
    const usuario = userEvent.setup();
    render(<PaginaNuevoEvento />);

    await completarFormularioValido(usuario);
    await usuario.click(screen.getByRole('button', { name: 'Publicar operativo' }));

    expect(
      await screen.findByText('Solo cuentas municipales pueden administrar eventos, la vitrina de adopción y el dashboard analítico.'),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
