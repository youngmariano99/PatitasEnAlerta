import { render, screen } from '@testing-library/react';
import PaginaDashboardMunicipio from '@app/municipio/dashboard/page';

jest.mock('@presentacion/componentes/municipio/PanelReportesMunicipio', () => ({
  PanelReportesMunicipio: ({ rol }: { rol: string }) => <div data-testid="panel-mock">Panel para rol: {rol}</div>,
}));

function mockearFetchPerfil(respuesta: { status: number; body: unknown }) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: respuesta.status >= 200 && respuesta.status < 300,
    status: respuesta.status,
    json: async () => respuesta.body,
  }) as jest.Mock;
}

describe('PaginaDashboardMunicipio (app/municipio/dashboard)', () => {
  it('resuelve el rol propio vía GET /api/perfil y se lo pasa a PanelReportesMunicipio', async () => {
    mockearFetchPerfil({ status: 200, body: { rol: 'municipio' } });
    render(<PaginaDashboardMunicipio />);

    expect(await screen.findByTestId('panel-mock')).toHaveTextContent('Panel para rol: municipio');
    expect(global.fetch).toHaveBeenCalledWith('/api/perfil');
  });

  it('muestra un error legible si no puede resolver el perfil, sin renderizar el panel', async () => {
    mockearFetchPerfil({ status: 500, body: { codigo: 'PEA-SIS-003', mensaje: 'Algo salió mal de nuestro lado.' } });
    render(<PaginaDashboardMunicipio />);

    expect(await screen.findByText('Algo salió mal de nuestro lado.')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-mock')).not.toBeInTheDocument();
  });
});
