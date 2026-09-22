import { render, screen } from '@testing-library/react';
import HomePage from '@app/page';

jest.mock('@presentacion/componentes/mapas/MapaReportes', () => ({
  MapaReportes: ({ reportes }: { reportes: Array<{ id: string }> }) => (
    <div data-testid="mapa-mock">Mapa con {reportes.length} marcador(es)</div>
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
  it('muestra el hero con las tres acciones principales', async () => {
    mockFetch(() => ({ ok: true, body: { items: [] } }));
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
    expect(screen.getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute(
      'href',
      '/auth/login',
    );
  });

  it('carga y muestra reportes, operativos y fichas de adopción de forma pública (sin fetchConSesion)', async () => {
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
              },
            ],
          },
        };
      }
      if (url.includes('/api/adopciones')) {
        return {
          ok: true,
          body: {
            items: [
              {
                id: 'f1',
                nombreAnimal: 'Luna',
                especie: 'gato',
                fotoUrl: '/animales/Registro.png',
              },
            ],
          },
        };
      }
      return { ok: true, body: { items: [] } };
    });

    render(<HomePage />);

    expect(await screen.findByTestId('mapa-mock')).toHaveTextContent('Mapa con 1 marcador(es)');
    expect(await screen.findByText('Castración móvil')).toBeInTheDocument();
    expect(await screen.findByText('Luna')).toBeInTheDocument();
  });

  it('no rompe si algún endpoint público falla — muestra el estado vacío de esa sección', async () => {
    mockFetch(() => ({ ok: false, body: { codigo: 'PEA-SIS-003', mensaje: 'error' } }));

    render(<HomePage />);

    expect(
      await screen.findByText('No hay operativos próximos por el momento.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Por ahora no hay animales disponibles.')).toBeInTheDocument();
  });
});
