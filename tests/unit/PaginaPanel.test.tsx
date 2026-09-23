import { render, screen } from '@testing-library/react';
import PaginaPanel from '@app/panel/page';

const channelMock = jest.fn();
const removeChannelMock = jest.fn();

jest.mock('@infraestructura/adaptadores/ClienteSupabaseNavegador', () => ({
  crearClienteSupabaseNavegador: () => ({
    channel: (...args: unknown[]) => channelMock(...args),
    removeChannel: (...args: unknown[]) => removeChannelMock(...args),
  }),
}));

function mockFetchConPerfil(perfil: unknown, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => perfil,
  }) as jest.Mock;
}

function mockFetchPorUrl(perfil: unknown, handler: (url: string) => unknown) {
  global.fetch = jest.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/perfil')) {
      return { ok: true, status: 200, json: async () => perfil } as Response;
    }
    return { ok: true, status: 200, json: async () => handler(url) } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaPanel (app/panel)', () => {
  beforeEach(() => {
    channelMock.mockReset();
    removeChannelMock.mockReset();
    channelMock.mockImplementation(() => {
      const canal: { on: jest.Mock; subscribe: jest.Mock } = {
        on: jest.fn(() => canal),
        subscribe: jest.fn(() => canal),
      };
      return canal;
    });
  });

  it('muestra los accesos rápidos correspondientes al rol dueño', async () => {
    mockFetchConPerfil({
      id: 'dueno-1',
      email: 'dueno@ejemplo.test',
      rol: 'dueño',
      estadoVerificacion: 'no_requerido',
    });
    render(<PaginaPanel />);

    expect(await screen.findByRole('link', { name: 'Mis mascotas' })).toHaveAttribute(
      'href',
      '/mascotas',
    );
    expect(screen.getByRole('link', { name: 'Reportar una mascota' })).toHaveAttribute(
      'href',
      '/reportes/nuevo',
    );
    expect(screen.queryByText(/Verificación/)).not.toBeInTheDocument();
  });

  it('muestra el BadgeVerificacion para el rol veterinario', async () => {
    mockFetchConPerfil({
      id: 'vet-1',
      email: 'vet@ejemplo.test',
      rol: 'veterinario',
      estadoVerificacion: 'pendiente',
    });
    render(<PaginaPanel />);

    expect(await screen.findByText('Verificación pendiente')).toBeInTheDocument();
  });

  it('muestra un estado de error ilustrado si falla la carga del perfil', async () => {
    mockFetchConPerfil({ codigo: 'PEA-SIS-003', mensaje: 'Algo salió mal.' }, false);
    render(<PaginaPanel />);

    expect(await screen.findByText('No pudimos cargar tu panel')).toBeInTheDocument();
  });

  it('"Lo más urgente" muestra notificaciones sin leer y el próximo turno reservado (dueño)', async () => {
    mockFetchPorUrl(
      {
        id: 'dueno-1',
        email: 'dueno@ejemplo.test',
        rol: 'dueño',
        estadoVerificacion: 'no_requerido',
      },
      (url) => {
        if (url.includes('/api/notificaciones')) {
          return { items: [], total: 0, pagina: 1, porPagina: 1, noLeidas: 3 };
        }
        if (url.includes('/api/turnos/mis-turnos')) {
          return {
            items: [
              { estado: 'reservado', franjaInicio: '2099-01-15T10:00:00.000Z' },
              { estado: 'cancelado', franjaInicio: '2099-01-10T10:00:00.000Z' },
            ],
            total: 2,
            pagina: 1,
            porPagina: 50,
          };
        }
        return { items: [], total: 0 };
      },
    );
    render(<PaginaPanel />);
    await screen.findByRole('link', { name: 'Mis mascotas' });

    expect(await screen.findByText('Lo más urgente')).toBeInTheDocument();
    expect(await screen.findByText(/3 notificaciones sin leer/)).toBeInTheDocument();
    expect(await screen.findByText(/Tu próximo turno/)).toBeInTheDocument();
  });

  it('sin nada urgente, la sección "Lo más urgente" no aparece', async () => {
    mockFetchPorUrl(
      {
        id: 'dueno-1',
        email: 'dueno@ejemplo.test',
        rol: 'dueño',
        estadoVerificacion: 'no_requerido',
      },
      () => ({ items: [], total: 0, pagina: 1, porPagina: 1, noLeidas: 0 }),
    );
    render(<PaginaPanel />);
    await screen.findByRole('link', { name: 'Mis mascotas' });

    expect(screen.queryByText('Lo más urgente')).not.toBeInTheDocument();
  });

  it('"Lo más urgente" muestra la cola de verificaciones pendientes para administrador', async () => {
    mockFetchPorUrl(
      {
        id: 'admin-1',
        email: 'admin@ejemplo.test',
        rol: 'administrador',
        estadoVerificacion: 'no_requerido',
      },
      (url) => {
        if (url.includes('/api/admin/verificaciones')) {
          return { items: [], total: 5, pagina: 1, porPagina: 1 };
        }
        return { items: [], total: 0, noLeidas: 0 };
      },
    );
    render(<PaginaPanel />);
    await screen.findByRole('link', { name: 'Cola de verificaciones' });

    expect(await screen.findByText('5 verificaciones pendientes')).toBeInTheDocument();
  });
});
