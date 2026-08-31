import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampanaNotificaciones } from '@presentacion/componentes/notificaciones/CampanaNotificaciones';

let manejadorInsert: ((payload: { new: Record<string, unknown> }) => void) | null = null;
const removeChannelMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn((_evento: string, _config: unknown, callback: (payload: { new: Record<string, unknown> }) => void) => {
        manejadorInsert = callback;
        return { subscribe: jest.fn() };
      }),
    })),
    removeChannel: removeChannelMock,
  })),
}));

const USUARIO_ID = 'dueno-1';

const notificacionApi = {
  id: 'notif-1',
  tipo: 'reporte_coincidente',
  referenciaTabla: 'reportes',
  referenciaId: 'reporte-1',
  leido: false,
  createdAt: '2026-08-01T12:00:00.000Z',
};

function mockearFetch(porUrl: Record<string, { status: number; body: unknown }>) {
  global.fetch = jest.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const clave = init?.method === 'PATCH' ? 'PATCH' : url;
    const respuesta = porUrl[clave] ?? porUrl['*'];
    if (!respuesta) throw new Error(`sin mock de fetch para ${clave}`);
    return { ok: respuesta.status >= 200 && respuesta.status < 300, status: respuesta.status, json: async () => respuesta.body };
  }) as jest.Mock;
}

describe('CampanaNotificaciones', () => {
  beforeEach(() => {
    manejadorInsert = null;
    removeChannelMock.mockReset();
  });

  it('muestra el badge con la cantidad de no leídas al cargar', async () => {
    mockearFetch({
      '*': { status: 200, body: { items: [notificacionApi], total: 1, pagina: 1, porPagina: 10, noLeidas: 1 } },
    });
    render(<CampanaNotificaciones usuarioId={USUARIO_ID} />);

    expect(await screen.findByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1 sin leer/i })).toBeInTheDocument();
  });

  it('no muestra el badge cuando no hay notificaciones sin leer', async () => {
    mockearFetch({ '*': { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 10, noLeidas: 0 } } });
    render(<CampanaNotificaciones usuarioId={USUARIO_ID} />);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Notificaciones' })).toBeInTheDocument();
  });

  it('al abrir la campana, lista la notificación y permite marcarla como leída (persiste vía PATCH)', async () => {
    mockearFetch({
      '*': { status: 200, body: { items: [notificacionApi], total: 1, pagina: 1, porPagina: 10, noLeidas: 1 } },
      PATCH: { status: 200, body: { id: notificacionApi.id, leido: true } },
    });
    const usuario = userEvent.setup();
    render(<CampanaNotificaciones usuarioId={USUARIO_ID} />);
    await screen.findByText('1');

    await usuario.click(screen.getByRole('button', { name: /sin leer/i }));

    expect(await screen.findByText('Encontramos una coincidencia con tu reporte')).toBeInTheDocument();
    const botonMarcar = screen.getByRole('button', { name: 'Marcar como leída' });

    await usuario.click(botonMarcar);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(`/api/notificaciones/${notificacionApi.id}`, { method: 'PATCH' }),
    );
    // El badge desaparece (optimistic update) al llegar a 0 no leídas.
    await waitFor(() => expect(screen.queryByText('1')).not.toBeInTheDocument());
  });

  it('un INSERT de Supabase Realtime incrementa el badge sin recargar', async () => {
    mockearFetch({ '*': { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 10, noLeidas: 0 } } });
    render(<CampanaNotificaciones usuarioId={USUARIO_ID} />);
    await waitFor(() => expect(manejadorInsert).not.toBeNull());

    act(() => {
      manejadorInsert!({
        new: {
          id: 'notif-2',
          tipo: 'reporte_coincidente',
          referencia_tabla: 'reportes',
          referencia_id: 'reporte-9',
          leido: false,
          created_at: '2026-08-02T12:00:00.000Z',
        },
      });
    });

    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('se desuscribe del canal de Realtime al desmontar', async () => {
    mockearFetch({ '*': { status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 10, noLeidas: 0 } } });
    const { unmount } = render(<CampanaNotificaciones usuarioId={USUARIO_ID} />);
    await waitFor(() => expect(manejadorInsert).not.toBeNull());

    unmount();

    expect(removeChannelMock).toHaveBeenCalled();
  });
});
