import { render, screen } from '@testing-library/react';
import HomePage from '@app/page';

jest.mock('@presentacion/componentes/mapas/MapaComunidad', () => ({
  MapaComunidad: ({
    reportes,
    eventos,
  }: {
    reportes: Array<{ id: string }>;
    eventos: Array<{ id: string }>;
  }) => (
    <div data-testid="mapa-mock">
      Mapa con {reportes.length} reporte(s) y {eventos.length} operativo(s)
    </div>
  ),
}));

function mockFetch(handler: (url: string) => { ok: boolean; body: unknown }) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url);
    return { ok: r.ok, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('HomePage (app/page — landing pública)', () => {
  it('muestra el hero con las dos acciones principales', async () => {
    mockFetch(() => ({ ok: true, body: { items: [], total: 0 } }));
    render(<HomePage />);
    await screen.findByText('No hay operativos próximos por el momento.');

    expect(screen.getByRole('heading', { name: /Patitas en Alerta/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reportar una mascota' })).toHaveAttribute(
      'href',
      '/reportes/nuevo',
    );
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/auth/registro',
    );
  });

  it('carga y muestra el strip de estadísticas, el mapa combinado y el feed de actividad (sin fetchConSesion)', async () => {
    mockFetch((url) => {
      if (url.includes('/api/reportes')) {
        return {
          ok: true,
          body: {
            items: [
              {
                id: 'r1',
                tipo: 'perdido',
                estado: 'reportado',
                descripcion: 'Se perdió cerca de la plaza',
                latitud: -37.9989,
                longitud: -61.3565,
              },
            ],
            total: 42,
          },
        };
      }
      if (url.includes('/api/municipio/eventos')) {
        return {
          ok: true,
          body: {
            items: [
              {
                id: 'e1',
                titulo: 'Castración móvil',
                direccion: 'Plaza San Martín',
                fecha: '2026-10-01T12:00:00.000Z',
                tipo: 'castracion',
                latitud: -37.9989,
                longitud: -61.3565,
              },
            ],
            total: 7,
          },
        };
      }
      if (url.includes('/api/adopciones')) {
        return { ok: true, body: { items: [], total: 15 } };
      }
      return { ok: true, body: { items: [], total: 0 } };
    });

    render(<HomePage />);

    expect(await screen.findByTestId('mapa-mock')).toHaveTextContent(
      'Mapa con 1 reporte(s) y 1 operativo(s)',
    );
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(await screen.findByText('15')).toBeInTheDocument();
    expect(await screen.findByText('Castración móvil')).toBeInTheDocument();
    expect(await screen.findByText('Se perdió cerca de la plaza')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Se perdió cerca de la plaza/i })).toHaveAttribute(
      'href',
      '/reportes/r1',
    );
  });

  it('no rompe si algún endpoint público falla — muestra el estado vacío de esa sección y estadísticas en 0', async () => {
    mockFetch(() => ({ ok: false, body: { codigo: 'PEA-SIS-003', mensaje: 'error' } }));

    render(<HomePage />);

    expect(
      await screen.findByText('No hay operativos próximos por el momento.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('No hay reportes activos por el momento.')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});
