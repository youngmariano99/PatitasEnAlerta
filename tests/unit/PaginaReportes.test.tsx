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
    return {
      ok: respuesta.status >= 200 && respuesta.status < 300,
      status: respuesta.status,
      json: async () => respuesta.body,
    };
  }) as jest.Mock;
}

function ultimaUrlSolicitada(): string {
  const llamadas = (global.fetch as jest.Mock).mock.calls;
  return llamadas[llamadas.length - 1][0] as string;
}

describe('PaginaReportes (app/reportes)', () => {
  it('el mapa es la vista por defecto', async () => {
    mockearFetch([
      { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } },
    ]);
    render(<PaginaReportes />);

    expect(await screen.findByTestId('mapa-mock')).toHaveTextContent('Mapa con 1 marcador(es)');
    expect(screen.getByRole('tab', { name: 'Mapa' })).toHaveAttribute('aria-selected', 'true');
  });

  it('en la tabla, cada fila muestra el tipo con un Badge (no el UUID) y la fecha en font-mono', async () => {
    mockearFetch([
      { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } },
    ]);
    const usuario = userEvent.setup();
    render(<PaginaReportes />);
    await screen.findByTestId('mapa-mock');

    await usuario.click(screen.getByRole('tab', { name: 'Tabla' }));

    const tabla = await screen.findByRole('table');
    const celdaTipo = await within(tabla).findByText('Perdido');
    expect(celdaTipo.closest('span')).toBeInTheDocument();
    expect(screen.queryByText(reporteBase.id)).not.toBeInTheDocument();

    const filas = within(tabla).getAllByRole('row');
    const celdaFecha = within(filas[1]!).getAllByRole('cell')[3]!;
    expect(celdaFecha).toHaveClass('font-mono');
  });

  it('muestra el estado vacío con borde discontinuo y CTA azul cuando el filtro no devuelve resultados', async () => {
    mockearFetch([{ status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } }]);
    render(<PaginaReportes />);

    const contenedor = (
      await screen.findByText('No encontramos reportes con estos filtros.')
    ).closest('div')!;
    expect(contenedor).toHaveClass('border-dashed');

    const cta = screen.getByRole('link', { name: 'Publicar un reporte' });
    expect(cta).toHaveAttribute('href', '/reportes/nuevo');
    expect(cta).toHaveClass('bg-accent');
  });

  it('cuando el estado vacío es por filtros activos, el CTA limpia los filtros en vez de linkear a /reportes/nuevo', async () => {
    mockearFetch([
      { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } },
      { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } },
    ]);
    const usuario = userEvent.setup();
    render(<PaginaReportes />);
    await screen.findByTestId('mapa-mock');

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'encontrado');

    expect(
      await screen.findByText('No encontramos reportes con estos filtros.'),
    ).toBeInTheDocument();
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
    await screen.findByTestId('mapa-mock');

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'encontrado');

    await waitFor(() => expect(ultimaUrlSolicitada()).toContain('tipo=encontrado'));
  });

  it('alterna entre mapa y tabla sin perder el filtro de tipo activo', async () => {
    mockearFetch([
      { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } },
    ]);
    const usuario = userEvent.setup();
    render(<PaginaReportes />);
    await screen.findByTestId('mapa-mock');

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'perdido');
    await usuario.click(screen.getByRole('tab', { name: 'Tabla' }));

    const tabla = await screen.findByRole('table');
    expect(await within(tabla).findByText('Perdido')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo')).toHaveValue('perdido');

    await usuario.click(screen.getByRole('tab', { name: 'Mapa' }));
    expect(await screen.findByTestId('mapa-mock')).toHaveTextContent('Mapa con 1 marcador(es)');
    expect(screen.getByLabelText('Tipo')).toHaveValue('perdido');
  });

  it('el botón "Cerca de mí" muestra el radio explícito', async () => {
    mockearFetch([
      { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } },
    ]);
    render(<PaginaReportes />);
    await screen.findByTestId('mapa-mock');

    expect(screen.getByRole('button', { name: /Cerca de mí \(10 km\)/ })).toBeInTheDocument();
  });

  it('muestra un mensaje de error legible si la API falla', async () => {
    mockearFetch([
      { status: 500, body: { codigo: 'PEA-SIS-003', mensaje: 'Algo salió mal de nuestro lado.' } },
    ]);
    render(<PaginaReportes />);

    expect(await screen.findByText('Algo salió mal de nuestro lado.')).toBeInTheDocument();
  });
});
