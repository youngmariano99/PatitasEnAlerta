import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormularioReporteWizard } from '@presentacion/componentes/reportes/FormularioReporteWizard';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Evita renderizar Leaflet real (toca `window`/mide el DOM, frágil en jsdom):
// un botón simple que simula "tocar el mapa" alcanza para probar el flujo,
// el mapa en sí ya está cubierto por su propio componente.
jest.mock('@presentacion/componentes/mapas/SelectorUbicacionMapa', () => ({
  SelectorUbicacionMapa: ({ onSeleccionar }: { onSeleccionar: (latitud: number, longitud: number) => void }) => (
    <button type="button" onClick={() => onSeleccionar(-37.9989, -61.3565)}>
      Marcar ubicación (mock)
    </button>
  ),
}));

// subirImagenACloudinary consulta la sesión actual (crearClienteSupabaseNavegador)
// para taguear la subida con `context=usuario_id=<id>` — ver ese archivo.
const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: 'usuario-1' } } });
jest.mock('@infraestructura/adaptadores/ClienteSupabaseNavegador', () => ({
  crearClienteSupabaseNavegador: () => ({ auth: { getUser: getUserMock } }),
}));

const URL_CLOUDINARY = 'https://api.cloudinary.com/v1_1/patitas-en-alerta/image/upload';
const FOTO_SUBIDA = 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg';

function mockearFetch(respuestaApi: { status: number; body: unknown }) {
  global.fetch = jest.fn().mockImplementation(async (url: string) => {
    if (url === URL_CLOUDINARY) {
      return { ok: true, json: async () => ({ secure_url: FOTO_SUBIDA }) };
    }
    return { status: respuestaApi.status, json: async () => respuestaApi.body };
  }) as jest.Mock;
}

async function completarFotoYAvanzar(usuario: ReturnType<typeof userEvent.setup>) {
  const archivo = new File(['contenido'], 'toby.jpg', { type: 'image/jpeg' });
  await usuario.upload(screen.getByLabelText(/Foto/), archivo);
  await waitFor(() => expect(screen.queryByText('Subiendo imagen…')).not.toBeInTheDocument());
  // La subida a Cloudinary resuelve fotoUrl de forma asincrónica (más allá de
  // que "Subiendo imagen…" ya haya desaparecido) — reintenta el click hasta
  // que fotoUrl esté realmente disponible, en vez de asumir un único click
  // sincronizado con ese estado.
  await waitFor(async () => {
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.queryByText('Necesitamos una foto para publicar el reporte.')).not.toBeInTheDocument();
  });
}

describe('FormularioReporteWizard', () => {
  const envOriginal = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'patitas-en-alerta';
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = 'patitas_en_alerta_dev';
    if (!global.URL.createObjectURL) {
      global.URL.createObjectURL = jest.fn();
    }
    jest.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:preview');
    pushMock.mockReset();
    getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'usuario-1' } } });
    // Default: la subida a Cloudinary siempre resuelve — los tests que
    // necesitan una respuesta puntual de POST /api/reportes llaman a
    // mockearFetch(...) de nuevo con ese body/status antes de enviar.
    mockearFetch({ status: 201, body: {} });
  });

  afterEach(() => {
    process.env = { ...envOriginal };
    jest.restoreAllMocks();
  });

  it('no muestra el selector de subtipo para tipo="perdido"', async () => {
    const usuario = userEvent.setup();
    render(<FormularioReporteWizard tipoInicial="perdido" />);

    await completarFotoYAvanzar(usuario);

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('muestra el selector visual de subtipo (radiogroup, no texto libre) para tipo="problematica"', async () => {
    const usuario = userEvent.setup();
    render(<FormularioReporteWizard tipoInicial="problematica" />);

    await completarFotoYAvanzar(usuario);

    const grupo = screen.getByRole('radiogroup');
    expect(grupo).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Animal suelto' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Foco sanitario' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Accidente vial' })).toBeInTheDocument();
  });

  it('bloquea avanzar del paso 2 sin elegir subtipo cuando tipo="problematica"', async () => {
    const usuario = userEvent.setup();
    render(<FormularioReporteWizard tipoInicial="problematica" />);
    await completarFotoYAvanzar(usuario);

    await usuario.type(screen.getByLabelText('¿Qué pasó?'), 'Hay un perro suelto en la esquina.');
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText('Elegí un motivo para tu reporte de problemática.')).toBeInTheDocument();
    expect(screen.queryByText('Ubicación')).not.toBeInTheDocument();
  });

  it('elegir un subtipo limpia el error y permite avanzar al paso de ubicación', async () => {
    const usuario = userEvent.setup();
    render(<FormularioReporteWizard tipoInicial="problematica" />);
    await completarFotoYAvanzar(usuario);
    await usuario.type(screen.getByLabelText('¿Qué pasó?'), 'Hay un perro suelto en la esquina.');
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Elegí un motivo para tu reporte de problemática.')).toBeInTheDocument();

    await usuario.click(screen.getByRole('radio', { name: 'Animal suelto' }));

    expect(screen.queryByText('Elegí un motivo para tu reporte de problemática.')).not.toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText('Ubicación')).toBeInTheDocument();
  });

  it('publica un reporte "problematica" enviando tipo, subtipo y coordenadas', async () => {
    mockearFetch({ status: 201, body: { id: 'r1', tipo: 'problematica', estado: 'reportado' } });
    const usuario = userEvent.setup();
    render(<FormularioReporteWizard tipoInicial="problematica" />);

    await completarFotoYAvanzar(usuario);
    await usuario.type(screen.getByLabelText('¿Qué pasó?'), 'Hay un perro suelto en la esquina.');
    await usuario.click(screen.getByRole('radio', { name: 'Foco sanitario' }));
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));

    await usuario.click(await screen.findByRole('button', { name: 'Marcar ubicación (mock)' }));
    await usuario.click(screen.getByRole('button', { name: 'Publicar reporte' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/reportes'));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/reportes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          tipo: 'problematica',
          subtipo: 'foco_sanitario',
          descripcion: 'Hay un perro suelto en la esquina.',
          fotoUrl: FOTO_SUBIDA,
          latitud: -37.9989,
          longitud: -61.3565,
          especie: undefined,
        }),
      }),
    );
  });

  it('publica un reporte "perdido" sin la clave subtipo en el body', async () => {
    mockearFetch({ status: 201, body: { id: 'r1', tipo: 'perdido', estado: 'reportado' } });
    const usuario = userEvent.setup();
    render(<FormularioReporteWizard tipoInicial="perdido" />);

    await completarFotoYAvanzar(usuario);
    await usuario.type(screen.getByLabelText('¿Qué pasó?'), 'Se perdió cerca de casa.');
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }));

    await usuario.click(await screen.findByRole('button', { name: 'Marcar ubicación (mock)' }));
    await usuario.click(screen.getByRole('button', { name: 'Publicar reporte' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/reportes'));
    const llamadaReportes = (global.fetch as jest.Mock).mock.calls.find((llamada) => llamada[0] === '/api/reportes');
    const cuerpoEnviado = JSON.parse(llamadaReportes[1].body);
    expect(cuerpoEnviado).not.toHaveProperty('subtipo');
    expect(cuerpoEnviado.tipo).toBe('perdido');
  });
});
