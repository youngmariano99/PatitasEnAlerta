import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaVerificacionesPendientes from '@app/admin/verificaciones/page';

const filaBase = {
  id: 'v1',
  usuarioId: 'vet-1',
  tipo: 'veterinario' as const,
  email: 'vet1@ejemplo.test',
  createdAt: '2024-01-01T00:00:00.000Z',
  matricula: 'MP-1001',
  colegioEmisor: 'Colegio de Veterinarios',
  nombreInstitucional: null,
};

function respuestaFalsa(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function mockearListado(respuesta: { status: number; body: unknown }) {
  global.fetch = jest.fn().mockImplementation(async (_input: string, init?: RequestInit) => {
    if (!init || init.method === undefined) {
      // GET del listado
      return respuestaFalsa(respuesta.status, respuesta.body);
    }
    return respuestaFalsa(200, {});
  }) as jest.Mock;
}

describe('PaginaVerificacionesPendientes (app/admin/verificaciones)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lista las verificaciones pendientes con su detalle (email + matrícula/colegio)', async () => {
    mockearListado({ status: 200, body: { items: [filaBase], total: 1, pagina: 1, porPagina: 50 } });
    render(<PaginaVerificacionesPendientes />);

    expect(await screen.findByText('vet1@ejemplo.test')).toBeInTheDocument();
    expect(screen.getByText(/MP-1001/)).toBeInTheDocument();
  });

  it('muestra un estado vacío claro cuando no hay verificaciones pendientes', async () => {
    mockearListado({ status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } });
    render(<PaginaVerificacionesPendientes />);

    expect(await screen.findByText('No hay verificaciones pendientes en este momento.')).toBeInTheDocument();
  });

  it('muestra 403 como "no tenés permiso" en vez de la lista', async () => {
    mockearListado({ status: 403, body: { codigo: 'PEA-SIS-002', mensaje: 'No tenés permiso.' } });
    render(<PaginaVerificacionesPendientes />);

    expect(await screen.findByText('No tenés permiso para ver este panel.')).toBeInTheDocument();
  });

  it('aprobar quita la fila de la lista tras la respuesta exitosa', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(respuestaFalsa(200, { items: [filaBase], total: 1, pagina: 1, porPagina: 50 }))
      .mockResolvedValueOnce(respuestaFalsa(200, { verificacionId: 'v1', estado: 'aprobado' }));
    const usuario = userEvent.setup();
    render(<PaginaVerificacionesPendientes />);
    await screen.findByText('vet1@ejemplo.test');

    await usuario.click(screen.getByRole('button', { name: 'Aprobar' }));

    await waitFor(() => expect(screen.queryByText('vet1@ejemplo.test')).not.toBeInTheDocument());
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/admin/verificaciones/v1',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ decision: 'aprobado' }) }),
    );
  });

  it('rechazar exige completar el motivo antes de permitir confirmar', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(respuestaFalsa(200, { items: [filaBase], total: 1, pagina: 1, porPagina: 50 }));
    const usuario = userEvent.setup();
    render(<PaginaVerificacionesPendientes />);
    await screen.findByText('vet1@ejemplo.test');

    await usuario.click(screen.getByRole('button', { name: 'Rechazar' }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));

    expect(await screen.findByText('Ingresá el motivo del rechazo.')).toBeInTheDocument();
    // Solo se llamó al fetch inicial del listado — el rechazo nunca se envió sin motivo.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('rechazar con motivo completo quita la fila de la lista', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(respuestaFalsa(200, { items: [filaBase], total: 1, pagina: 1, porPagina: 50 }))
      .mockResolvedValueOnce(respuestaFalsa(200, { verificacionId: 'v1', estado: 'rechazado' }));
    const usuario = userEvent.setup();
    render(<PaginaVerificacionesPendientes />);
    await screen.findByText('vet1@ejemplo.test');

    await usuario.click(screen.getByRole('button', { name: 'Rechazar' }));
    await usuario.type(screen.getByLabelText('Motivo del rechazo'), 'Matrícula no encontrada');
    await usuario.click(screen.getByRole('button', { name: 'Confirmar rechazo' }));

    await waitFor(() => expect(screen.queryByText('vet1@ejemplo.test')).not.toBeInTheDocument());
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/admin/verificaciones/v1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ decision: 'rechazado', motivoRechazo: 'Matrícula no encontrada' }),
      }),
    );
  });
});
