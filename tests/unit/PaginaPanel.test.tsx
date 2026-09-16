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
});
