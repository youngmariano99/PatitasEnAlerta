import { render, screen } from '@testing-library/react';
import PaginaHistorialAuditoria from '@app/admin/auditoria/page';

const filaBase = {
  id: 'h1',
  usuarioId: 'vet-1',
  tipo: 'veterinario' as const,
  email: 'vet1@ejemplo.test',
  estado: 'aprobado' as const,
  motivoRechazo: null,
  revisadoPor: 'admin-1',
  resueltoEn: '2024-02-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  matricula: 'MP-1001',
  colegioEmisor: 'Colegio de Veterinarios',
  nombreInstitucional: null,
};

function respuestaFalsa(status: number, body: unknown) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

function mockearListado(respuesta: { status: number; body: unknown }) {
  global.fetch = jest.fn().mockResolvedValue(respuestaFalsa(respuesta.status, respuesta.body)) as jest.Mock;
}

describe('PaginaHistorialAuditoria (app/admin/auditoria)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lista las verificaciones resueltas con revisadoPor y resueltoEn en columnas font-mono', async () => {
    mockearListado({ status: 200, body: { items: [filaBase], total: 1, pagina: 1, porPagina: 50 } });
    render(<PaginaHistorialAuditoria />);

    expect(await screen.findByText('vet1@ejemplo.test')).toBeInTheDocument();
    const celdaRevisadoPor = screen.getByText('admin-1');
    expect(celdaRevisadoPor).toHaveClass('font-mono');

    const fila = celdaRevisadoPor.closest('tr');
    expect(fila).not.toBeNull();
    const celdas = fila!.querySelectorAll('td');
    const celdaResueltoEn = celdas[celdas.length - 2];
    expect(celdaResueltoEn).not.toBeUndefined();
    expect(celdaResueltoEn).toHaveClass('font-mono');
    expect(celdaResueltoEn!.textContent).not.toBe('—');
  });

  it('muestra el motivo de rechazo cuando la verificación fue rechazada', async () => {
    mockearListado({
      status: 200,
      body: { items: [{ ...filaBase, estado: 'rechazado', motivoRechazo: 'Matrícula no encontrada' }], total: 1, pagina: 1, porPagina: 50 },
    });
    render(<PaginaHistorialAuditoria />);

    expect(await screen.findByText('Matrícula no encontrada')).toBeInTheDocument();
    expect(screen.getByText('Rechazado')).toBeInTheDocument();
  });

  it('muestra un estado vacío claro cuando no hay verificaciones resueltas', async () => {
    mockearListado({ status: 200, body: { items: [], total: 0, pagina: 1, porPagina: 50 } });
    render(<PaginaHistorialAuditoria />);

    expect(await screen.findByText('Todavía no hay verificaciones resueltas.')).toBeInTheDocument();
  });

  it('muestra 403 como "no tenés permiso" en vez de la tabla', async () => {
    mockearListado({ status: 403, body: { codigo: 'PEA-SIS-002', mensaje: 'No tenés permiso.' } });
    render(<PaginaHistorialAuditoria />);

    expect(await screen.findByText('No tenés permiso para ver este panel.')).toBeInTheDocument();
  });

  it('no expone ninguna acción de edición sobre registros ya resueltos (vista exclusivamente de lectura)', async () => {
    mockearListado({ status: 200, body: { items: [filaBase], total: 1, pagina: 1, porPagina: 50 } });
    render(<PaginaHistorialAuditoria />);

    await screen.findByText('vet1@ejemplo.test');

    expect(screen.queryAllByRole('button', { name: /aprobar|rechazar|confirmar|editar/i })).toHaveLength(0);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(document.querySelectorAll('input, textarea')).toHaveLength(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
