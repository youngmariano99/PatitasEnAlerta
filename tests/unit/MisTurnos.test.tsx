import { act, render, screen, waitFor } from '@testing-library/react';
import MisTurnos from '@app/turnos/mis-turnos/page';

type CallbackRealtime = (payload: { new: Record<string, unknown> }) => void;
interface CanalFalso {
  on: jest.Mock;
  subscribe: jest.Mock;
  callback?: CallbackRealtime;
}

let canalActual: CanalFalso | null = null;
const channelMock = jest.fn();
const removeChannelMock = jest.fn();
const getUserMock = jest.fn();

jest.mock('@infraestructura/adaptadores/ClienteSupabaseNavegador', () => ({
  crearClienteSupabaseNavegador: () => ({
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
    channel: (...args: unknown[]) => channelMock(...args),
    removeChannel: (...args: unknown[]) => removeChannelMock(...args),
  }),
}));

const USUARIO_ID = 'dueno-1';

const turnoApi = {
  id: 'turno-1',
  proveedorTipo: 'municipio',
  proveedorId: 'municipio-1',
  eventoId: 'evento-1',
  eventoTitulo: 'Jornada de castración — Barrio Norte',
  franjaInicio: '2026-09-05T13:00:00.000Z',
  franjaFin: '2026-09-05T13:20:00.000Z',
  estado: 'reservado',
};

function mockearFetch(body: unknown, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as jest.Mock;
}

beforeEach(() => {
  channelMock.mockReset();
  removeChannelMock.mockReset();
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: { id: USUARIO_ID } } });
  channelMock.mockImplementation(() => {
    const canal = {} as CanalFalso;
    canal.on = jest.fn((_evento: string, _config: unknown, callback: CallbackRealtime) => {
      canal.callback = callback;
      return canal;
    });
    canal.subscribe = jest.fn(() => canal);
    canalActual = canal;
    return canal;
  });
});

describe('MisTurnos (app/turnos/mis-turnos/page.tsx)', () => {
  it('AC (Paso 1/3): carga los turnos propios y muestra el estado con texto + ícono, nunca solo color', async () => {
    mockearFetch({ items: [turnoApi], total: 1, pagina: 1, porPagina: 50 });
    render(<MisTurnos />);

    expect(await screen.findByText('Jornada de castración — Barrio Norte')).toBeInTheDocument();
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('📅');
    expect(badge).toHaveTextContent('Reservado');
  });

  it('muestra el estado vacío cuando todavía no hay turnos propios', async () => {
    mockearFetch({ items: [], total: 0, pagina: 1, porPagina: 50 });
    render(<MisTurnos />);

    expect(await screen.findByText('Todavía no reservaste ningún turno.')).toBeInTheDocument();
  });

  it('Verificación técnica (Paso 2): se suscribe a Realtime filtrado EXCLUSIVAMENTE por reservado_por del usuario actual', async () => {
    mockearFetch({ items: [], total: 0, pagina: 1, porPagina: 50 });
    render(<MisTurnos />);

    await waitFor(() => expect(channelMock).toHaveBeenCalledWith(`turnos-propios-${USUARIO_ID}`));
    expect(canalActual?.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: 'UPDATE',
        schema: 'public',
        table: 'turnos',
        filter: `reservado_por=eq.${USUARIO_ID}`,
      }),
      expect.any(Function),
    );
    expect(canalActual?.subscribe).toHaveBeenCalled();
  });

  it('AC/Paso 4: refleja sin recargar la página la cancelación de un turno hecha desde otra sesión (evento Realtime)', async () => {
    mockearFetch({ items: [turnoApi], total: 1, pagina: 1, porPagina: 50 });
    render(<MisTurnos />);
    await screen.findByText('Reservado');

    act(() => {
      canalActual?.callback?.({
        new: {
          id: 'turno-1',
          proveedor_tipo: 'municipio',
          proveedor_id: 'municipio-1',
          evento_id: 'evento-1',
          franja_inicio: turnoApi.franjaInicio,
          franja_fin: turnoApi.franjaFin,
          estado: 'cancelado',
        },
      });
    });

    expect(screen.queryByText('Reservado')).not.toBeInTheDocument();
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('❌');
    expect(badge).toHaveTextContent('Cancelado');
  });

  it('conserva el título del evento ya conocido al aplicar una actualización Realtime sobre un turno existente', async () => {
    mockearFetch({ items: [turnoApi], total: 1, pagina: 1, porPagina: 50 });
    render(<MisTurnos />);
    await screen.findByText('Jornada de castración — Barrio Norte');

    act(() => {
      canalActual?.callback?.({
        new: {
          id: 'turno-1',
          proveedor_tipo: 'municipio',
          proveedor_id: 'municipio-1',
          evento_id: 'evento-1',
          franja_inicio: turnoApi.franjaInicio,
          franja_fin: turnoApi.franjaFin,
          estado: 'cancelado',
        },
      });
    });

    expect(screen.getByText('Jornada de castración — Barrio Norte')).toBeInTheDocument();
  });

  it('agrega arriba de la lista un turno recién reservado (evento Realtime sobre un id no visto antes)', async () => {
    mockearFetch({ items: [], total: 0, pagina: 1, porPagina: 50 });
    render(<MisTurnos />);
    await screen.findByText('Todavía no reservaste ningún turno.');
    await waitFor(() => expect(canalActual?.callback).toBeDefined());

    act(() => {
      canalActual?.callback?.({
        new: {
          id: 'turno-nuevo',
          proveedor_tipo: 'veterinario',
          proveedor_id: 'vet-1',
          evento_id: null,
          franja_inicio: '2026-09-10T10:00:00.000Z',
          franja_fin: '2026-09-10T10:30:00.000Z',
          estado: 'reservado',
        },
      });
    });

    expect(screen.getByText('Turno veterinario')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Reservado');
  });

  it('se desuscribe del canal de Realtime al desmontar', async () => {
    mockearFetch({ items: [], total: 0, pagina: 1, porPagina: 50 });
    const { unmount } = render(<MisTurnos />);
    await waitFor(() => expect(canalActual).not.toBeNull());

    unmount();

    expect(removeChannelMock).toHaveBeenCalled();
  });

  it('muestra un mensaje de error si la carga inicial falla (ej. sin sesión)', async () => {
    mockearFetch({ codigo: 'PEA-SIS-001', mensaje: 'Necesitás iniciar sesión para hacer esto.' }, 401);
    render(<MisTurnos />);

    expect(await screen.findByText('Necesitás iniciar sesión para hacer esto.')).toBeInTheDocument();
  });
});
