import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardAnaliticoMunicipal } from '@presentacion/componentes/municipio/DashboardAnaliticoMunicipal';

// Evita renderizar Leaflet real (toca `window`/mide el DOM, frágil en
// jsdom) — mismo criterio que FormularioReporteWizard.test.tsx con
// SelectorUbicacionMapa: un componente simple que expone los puntos
// recibidos alcanza para probar que DashboardAnaliticoMunicipal calcula
// bien la agregación por zona, sin depender de Leaflet en sí (que ya vive
// sin test dedicado, igual que MapaReportes.tsx/SelectorUbicacionMapa.tsx).
jest.mock('@presentacion/componentes/mapas/MapaCalorMunicipal', () => ({
  MapaCalorMunicipal: ({ puntos }: { puntos: Array<{ zonaLat: number; zonaLng: number; total: number }> }) => (
    <div data-testid="mapa-calor-mock">{puntos.length} puntos</div>
  ),
}));

function mockearFetch(respuesta: { status: number; body: unknown }) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: respuesta.status >= 200 && respuesta.status < 300,
    status: respuesta.status,
    json: async () => respuesta.body,
  }) as jest.Mock;
}

const dashboardBase = {
  metricasReportes: [
    { periodo: '2026-08-03T00:00:00.000Z', tipo: 'perdido', estado: 'reportado', zonaLat: -37.99, zonaLng: -61.35, total: 5 },
    { periodo: '2026-08-10T00:00:00.000Z', tipo: 'perdido', estado: 'resuelto', zonaLat: -37.99, zonaLng: -61.35, total: 3 },
    { periodo: '2026-08-03T00:00:00.000Z', tipo: 'encontrado', estado: 'reportado', zonaLat: -37.98, zonaLng: -61.34, total: 2 },
  ],
  metricasTurnos: [
    { periodo: '2026-08-03T00:00:00.000Z', proveedorTipo: 'municipio', estado: 'disponible', total: 8 },
    { periodo: '2026-08-03T00:00:00.000Z', proveedorTipo: 'veterinario', estado: 'reservado', total: 4 },
  ],
};

describe('DashboardAnaliticoMunicipal', () => {
  it('muestra los totales agregados de reportes y turnos', async () => {
    mockearFetch({ status: 200, body: dashboardBase });
    render(<DashboardAnaliticoMunicipal />);

    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument()); // 5+3+2 reportes
    expect(screen.getByText('12')).toBeInTheDocument(); // 8+4 turnos
  });

  it('agrupa el mapa de calor por celda de zona (zonaLat, zonaLng), sumando todos los períodos/estados/tipos de esa celda', async () => {
    mockearFetch({ status: 200, body: dashboardBase });
    render(<DashboardAnaliticoMunicipal />);

    // 2 celdas distintas: (-37.99,-61.35) con total 5+3=8, y (-37.98,-61.34) con total 2.
    await waitFor(() => expect(screen.getByTestId('mapa-calor-mock')).toHaveTextContent('2 puntos'));
  });

  it('muestra un estado vacío para el mapa cuando no hay reportes en el período', async () => {
    mockearFetch({ status: 200, body: { metricasReportes: [], metricasTurnos: [] } });
    render(<DashboardAnaliticoMunicipal />);

    expect(await screen.findByText('No hay reportes para graficar en este período.')).toBeInTheDocument();
    expect(screen.queryByTestId('mapa-calor-mock')).not.toBeInTheDocument();
  });

  it('un error de la API se muestra en línea con ícono, sin alert nativo', async () => {
    mockearFetch({ status: 403, body: { codigo: 'PEA-MUN-005', mensaje: 'Solo cuentas municipales pueden administrar eventos, la vitrina de adopción y el dashboard analítico.' } });
    render(<DashboardAnaliticoMunicipal />);

    expect(
      await screen.findByText('Solo cuentas municipales pueden administrar eventos, la vitrina de adopción y el dashboard analítico.'),
    ).toBeInTheDocument();
  });

  it('reconsulta la API al cambiar el filtro de tipo de reporte', async () => {
    mockearFetch({ status: 200, body: dashboardBase });
    const usuario = userEvent.setup();
    render(<DashboardAnaliticoMunicipal />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    await usuario.selectOptions(screen.getByLabelText('Tipo de reporte'), 'perdido');

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const ultimaUrl = (global.fetch as jest.Mock).mock.calls[1][0] as string;
    expect(ultimaUrl).toContain('tipoReporte=perdido');
  });
});
