import { act, render, screen } from '@testing-library/react';
import { BadgeVerificacion } from '@presentacion/componentes/auth/BadgeVerificacion';

type CallbackRealtime = (payload: { new: { estado_verificacion?: string } }) => void;
interface CanalFalso {
  on: jest.Mock;
  subscribe: jest.Mock;
  callback?: CallbackRealtime;
}

let canalActual: CanalFalso | null = null;
const channelMock = jest.fn();
const removeChannelMock = jest.fn();

jest.mock('@infraestructura/adaptadores/ClienteSupabaseNavegador', () => ({
  crearClienteSupabaseNavegador: () => ({
    channel: (...args: unknown[]) => channelMock(...args),
    removeChannel: (...args: unknown[]) => removeChannelMock(...args),
  }),
}));

beforeEach(() => {
  channelMock.mockReset();
  removeChannelMock.mockReset();
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

describe('BadgeVerificacion', () => {
  it('muestra "Verificación pendiente" con ícono — nunca solo por color', () => {
    render(<BadgeVerificacion usuarioId="vet-1" estadoInicial="pendiente" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('⏳');
    expect(badge).toHaveTextContent('Verificación pendiente');
  });

  it('muestra "Verificado" cuando el estado inicial ya es verificado', () => {
    render(<BadgeVerificacion usuarioId="vet-1" estadoInicial="verificado" />);

    expect(screen.getByText('Verificado')).toBeInTheDocument();
  });

  it('muestra "Verificación rechazada" con ícono cuando el estado inicial es rechazado', () => {
    render(<BadgeVerificacion usuarioId="vet-1" estadoInicial="rechazado" />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('⚠️');
    expect(badge).toHaveTextContent('Verificación rechazada');
  });

  it('no renderiza nada para un rol sin verificación (no_requerido)', () => {
    render(<BadgeVerificacion usuarioId="dueño-1" estadoInicial="no_requerido" />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('se suscribe a Realtime filtrado por la fila propia del usuario', () => {
    render(<BadgeVerificacion usuarioId="vet-1" estadoInicial="pendiente" />);

    expect(channelMock).toHaveBeenCalledWith('usuarios-verificacion-vet-1');
    expect(canalActual?.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ event: 'UPDATE', schema: 'public', table: 'usuarios', filter: 'id=eq.vet-1' }),
      expect.any(Function),
    );
    expect(canalActual?.subscribe).toHaveBeenCalled();
  });

  it('Paso 4: actualiza el badge de pendiente a verificado cuando llega el evento Realtime, sin recargar la página', () => {
    render(<BadgeVerificacion usuarioId="vet-1" estadoInicial="pendiente" />);
    expect(screen.getByText('Verificación pendiente')).toBeInTheDocument();

    act(() => {
      canalActual?.callback?.({ new: { estado_verificacion: 'verificado' } });
    });

    expect(screen.queryByText('Verificación pendiente')).not.toBeInTheDocument();
    expect(screen.getByText('Verificado')).toBeInTheDocument();
  });

  it('ignora un payload de Realtime sin estado_verificacion (no rompe el badge actual)', () => {
    render(<BadgeVerificacion usuarioId="vet-1" estadoInicial="pendiente" />);

    act(() => {
      canalActual?.callback?.({ new: {} });
    });

    expect(screen.getByText('Verificación pendiente')).toBeInTheDocument();
  });

  it('se desuscribe del canal al desmontar', () => {
    const { unmount } = render(<BadgeVerificacion usuarioId="vet-1" estadoInicial="pendiente" />);
    const canalMontado = canalActual;

    unmount();

    expect(removeChannelMock).toHaveBeenCalledWith(canalMontado);
  });
});
