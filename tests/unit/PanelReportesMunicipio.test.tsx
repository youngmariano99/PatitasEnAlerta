import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelReportesMunicipio } from '@presentacion/componentes/municipio/PanelReportesMunicipio';

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

function mockearFetch(porUrl: { listado: { status: number; body: unknown }; patch?: { status: number; body: unknown } }) {
  global.fetch = jest.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const respuesta = init?.method === 'PATCH' ? porUrl.patch! : porUrl.listado;
    return { ok: respuesta.status >= 200 && respuesta.status < 300, status: respuesta.status, json: async () => respuesta.body };
  }) as jest.Mock;
}

function ultimaUrlSolicitada(): string {
  const llamadas = (global.fetch as jest.Mock).mock.calls;
  return llamadas[llamadas.length - 1][0] as string;
}

describe('PanelReportesMunicipio', () => {
  it('verificación técnica: NO muestra el control de cambio de estado para rol "dueño"', async () => {
    mockearFetch({ listado: { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } } });
    render(<PanelReportesMunicipio rol="dueño" />);

    await screen.findByText(reporteBase.id);

    expect(screen.queryByText('Cambiar estado')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Cambiar estado del reporte/)).not.toBeInTheDocument();
  });

  it('verificación técnica: NO muestra el control para rol "veterinario"', async () => {
    mockearFetch({ listado: { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } } });
    render(<PanelReportesMunicipio rol="veterinario" />);

    await screen.findByText(reporteBase.id);

    expect(screen.queryByLabelText(/Cambiar estado del reporte/)).not.toBeInTheDocument();
  });

  it('SÍ muestra el control de cambio de estado para rol "municipio"', async () => {
    mockearFetch({ listado: { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } } });
    render(<PanelReportesMunicipio rol="municipio" />);

    await screen.findByText(reporteBase.id);

    expect(screen.getByText('Cambiar estado')).toBeInTheDocument();
    expect(screen.getByLabelText(`Cambiar estado del reporte ${reporteBase.id}`)).toBeInTheDocument();
  });

  it('SÍ muestra el control para rol "administrador"', async () => {
    mockearFetch({ listado: { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } } });
    render(<PanelReportesMunicipio rol="administrador" />);

    await screen.findByText(reporteBase.id);

    expect(screen.getByLabelText(`Cambiar estado del reporte ${reporteBase.id}`)).toBeInTheDocument();
  });

  it('el select de cambio de estado solo ofrece las transiciones válidas desde el estado actual', async () => {
    mockearFetch({ listado: { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } } });
    render(<PanelReportesMunicipio rol="municipio" />);
    await screen.findByText(reporteBase.id);

    const select = screen.getByLabelText(`Cambiar estado del reporte ${reporteBase.id}`);
    const opciones = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);

    // reporteBase.estado === 'reportado' → única transición válida: en_revision
    // ('cerrado' solo se alcanza desde 'resuelto', sin atajos — PEA-REP-006).
    expect(opciones).toEqual(['Cambiar a…', 'En revisión']);
  });

  it('confirmar el cambio de estado llama a PATCH y refleja el nuevo estado en la fila', async () => {
    mockearFetch({
      listado: { status: 200, body: { items: [reporteBase], total: 1, pagina: 1, porPagina: 50 } },
      patch: { status: 200, body: { id: reporteBase.id, estado: 'en_revision', estadoAnterior: 'reportado' } },
    });
    const usuario = userEvent.setup();
    render(<PanelReportesMunicipio rol="municipio" />);
    await screen.findByText(reporteBase.id);

    const select = screen.getByLabelText(`Cambiar estado del reporte ${reporteBase.id}`);
    await usuario.selectOptions(select, 'En revisión');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/reportes/${reporteBase.id}/estado`,
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ estado: 'en_revision' }) }),
      ),
    );
    const fila = screen.getByText(reporteBase.id).closest('tr')!;
    await waitFor(() => expect(within(fila).getByText('En revisión')).toBeInTheDocument());
  });

  it('un rechazo del PATCH muestra el mensaje de error sin alert nativo', async () => {
    mockearFetch({
      listado: { status: 200, body: { items: [{ ...reporteBase, estado: 'resuelto' }], total: 1, pagina: 1, porPagina: 50 } },
      patch: { status: 409, body: { codigo: 'PEA-REP-006', mensaje: 'Ese cambio de estado no es válido en este momento.' } },
    });
    const usuario = userEvent.setup();
    render(<PanelReportesMunicipio rol="municipio" />);
    await screen.findByText(reporteBase.id);

    const select = screen.getByLabelText(`Cambiar estado del reporte ${reporteBase.id}`);
    await usuario.selectOptions(select, 'Cerrado');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByText('Ese cambio de estado no es válido en este momento.')).toBeInTheDocument();
  });

  it('un reporte "cerrado" (terminal) no ofrece ningún control de cambio', async () => {
    mockearFetch({
      listado: { status: 200, body: { items: [{ ...reporteBase, estado: 'cerrado' }], total: 1, pagina: 1, porPagina: 50 } },
    });
    render(<PanelReportesMunicipio rol="municipio" />);
    await screen.findByText(reporteBase.id);

    expect(screen.getByText('Sin transiciones disponibles')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Cambiar estado del reporte/)).not.toBeInTheDocument();
  });

  it('combina tipo + estado + rango de fechas en la misma consulta (server-side)', async () => {
    mockearFetch({ listado: { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } } });
    const usuario = userEvent.setup();
    render(<PanelReportesMunicipio rol="municipio" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    await usuario.selectOptions(screen.getByLabelText('Tipo'), 'encontrado');
    await usuario.selectOptions(screen.getByLabelText('Estado'), 'en_atencion');
    await usuario.type(screen.getByLabelText('Desde'), '2026-07-01');
    await usuario.type(screen.getByLabelText('Hasta'), '2026-07-31');

    await waitFor(() => {
      const url = ultimaUrlSolicitada();
      expect(url).toContain('tipo=encontrado');
      expect(url).toContain('estado=en_atencion');
      expect(url).toContain('fechaDesde=');
      expect(url).toContain('fechaHasta=');
    });
  });

  it('muestra el estado vacío con borde discontinuo cuando los filtros no devuelven resultados', async () => {
    mockearFetch({ listado: { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } } });
    render(<PanelReportesMunicipio rol="municipio" />);

    const contenedor = (await screen.findByText('No encontramos reportes con estos filtros.')).closest('div')!;
    expect(contenedor).toHaveClass('border-dashed');
  });
});
