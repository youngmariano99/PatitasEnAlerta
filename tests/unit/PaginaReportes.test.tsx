import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaReportes from '@app/reportes/page';

jest.mock('@presentacion/componentes/mapas/MapaReportes', () => ({
  MapaReportes: ({ reportes }: { reportes: Array<{ id: string }> }) => (
    <div data-testid="mapa-mock">Mapa con {reportes.length} marcador(es)</div>
  ),
}));

const reporteBase = {
  id: '11111111-1111-1111-1111-111111111111',
  tipo: 'perdido',
  subtipo: null,
  descripcion: 'Se perdió cerca de la plaza central.',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg',
  latitud: -37.9989,
  longitud: -61.3565,
  especie: 'perro',
  estado: 'reportado',
  createdAt: '2026-08-01T12:00:00.000Z',
};

function mockearFetch(respuestas: Array<{ status: number; body: unknown }>) {
  let llamada = 0;
  global.fetch = jest.fn().mockImplementation(async () => {
    const respuesta = respuestas[Math.min(llamada, respuestas.length - 1)]!;
    llamada += 1;
    return { ok: respuesta.status >= 200 && respuesta.status < 300, status: respuesta.status, json: async () => respuesta.body };
  }) as jest.Mock;
}

function ultimaUrlSolicitada(): string {
  const llamadas = (global.fetch as jest.Mock).mock.calls;
  return llamadas[llamadas.length - 1][0] as string;
}

describe('PaginaReportes (app/reportes)', () => {
  it('renderiza la tabla con columnas ID y fecha en font-mono', async () => {
    mockearFetch([{ status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } }]);
    render(<PaginaReportes />);

    const celdaId = await screen.findByText(reporteBase.id);
    expect(celdaId).toHaveClass('font-mono');

    const filas = screen.getAllByRole('row');
    const celdaFecha = within(filas[1]!).getAllByRole('cell')[4]!;
    expect(celdaFecha).toHaveClass('font-mono');
  });

  it('muestra el estado vacío con borde discontinuo y CTA azul cuando el filtro no devuelve resultados', async () => {
    mockearFetch([{ status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } }]);
    render(<PaginaReportes />);

    const contenedor = (await screen.findByText('No encontramos reportes con estos filtros.')).closest('div')!;
    expect(contenedor).toHaveClass('border-dashed');

    const cta = screen.getByRole('link', { name: 'Publicar un reporte' });
    expect(cta).toHaveAttribute('href', '/reportes/nuevo');
    expect(cta).toHaveClass('bg-blue-500');
  });

  it('cuando el estado vacío es por filtros activos, el CTA limpia los filtros en vez de linkear a /reportes/nuevo', async () => {
    mockearFetch([
      { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } },
      { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } },
    ]);
    const usuario = userEvent.setup();
    render(<PaginaReportes />);
    await screen.findByText(reporteBase.id);

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'encontrado');

    expect(await screen.findByText('No encontramos reportes con estos filtros.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Limpiar filtros' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Publicar un reporte' })).not.toBeInTheDocument();
  });

  it('aplicar el filtro de tipo dispara una nueva consulta con ese filtro en la URL', async () => {
    mockearFetch([
      { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } },
      { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } },
    ]);
    const usuario = userEvent.setup();
    render(<PaginaReportes />);
    await screen.findByText(reporteBase.id);

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'encontrado');

    await waitFor(() => expect(ultimaUrlSolicitada()).toContain('tipo=encontrado'));
  });

  it('alterna entre tabla y mapa sin perder el filtro de tipo activo', async () => {
    mockearFetch([{ status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } }]);
    const usuario = userEvent.setup();
    render(<PaginaReportes />);
    await screen.findByText(reporteBase.id);

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'perdido');
    await usuario.click(screen.getByRole('tab', { name: 'Mapa' }));

    expect(await screen.findByTestId('mapa-mock')).toHaveTextContent('Mapa con 1 marcador(es)');
    expect(screen.getByLabelText('Tipo')).toHaveValue('perdido');

    await usuario.click(screen.getByRole('tab', { name: 'Tabla' }));
    expect(await screen.findByText(reporteBase.id)).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo')).toHaveValue('perdido');
  });

  it('muestra un mensaje de error legible si la API falla', async () => {
    mockearFetch([{ status: 500, body: { codigo: 'PEA-SIS-003', mensaje: 'Algo salió mal de nuestro lado.' } }]);
    render(<PaginaReportes />);

    expect(await screen.findByText('Algo salió mal de nuestro lado.')).toBeInTheDocument();
  });
});
