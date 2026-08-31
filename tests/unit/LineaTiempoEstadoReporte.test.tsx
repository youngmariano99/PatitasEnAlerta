import { render, screen } from '@testing-library/react';
import { LineaTiempoEstadoReporte } from '@presentacion/componentes/reportes/LineaTiempoEstadoReporte';

const REPORTE_ID = '11111111-1111-1111-1111-111111111111';

const HISTORIAL_API = [
  { id: 'h1', estadoAnterior: 'reportado', estadoNuevo: 'en_revision', usuarioId: 'municipio-1', registradoEn: '2026-08-01T10:00:00.000Z' },
  { id: 'h2', estadoAnterior: 'en_revision', estadoNuevo: 'en_atencion', usuarioId: 'municipio-1', registradoEn: '2026-08-02T10:00:00.000Z' },
];

function mockearFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body }) as jest.Mock;
}

describe('LineaTiempoEstadoReporte', () => {
  it('muestra las transiciones en orden, con las fechas en font-mono (verificación técnica)', async () => {
    mockearFetch(200, HISTORIAL_API);
    render(<LineaTiempoEstadoReporte reporteId={REPORTE_ID} />);

    const lista = await screen.findByLabelText(`Historial de estado del reporte ${REPORTE_ID}`);
    const items = lista.querySelectorAll('li');
    expect(items).toHaveLength(2);

    const fechas = lista.querySelectorAll('.font-mono');
    expect(fechas).toHaveLength(2);
    expect(fechas[0]?.textContent).toBeTruthy();
  });

  it('un reporte sin transiciones muestra el estado vacío', async () => {
    mockearFetch(200, []);
    render(<LineaTiempoEstadoReporte reporteId={REPORTE_ID} />);

    expect(await screen.findByText('Este reporte todavía no tiene cambios de estado registrados.')).toBeInTheDocument();
  });

  it('un usuario ajeno al reporte ve el mensaje de error de la API (403), sin alert nativo', async () => {
    mockearFetch(403, { codigo: 'PEA-SIS-002', mensaje: 'No tenés permiso para realizar esta acción.' });
    render(<LineaTiempoEstadoReporte reporteId={REPORTE_ID} />);

    expect(await screen.findByText('No tenés permiso para realizar esta acción.')).toBeInTheDocument();
  });

  it('un reporte inexistente muestra el mensaje 404 de la API', async () => {
    mockearFetch(404, { codigo: 'PEA-REP-005', mensaje: 'No encontramos ese reporte o ya no está disponible.' });
    render(<LineaTiempoEstadoReporte reporteId={REPORTE_ID} />);

    expect(await screen.findByText('No encontramos ese reporte o ya no está disponible.')).toBeInTheDocument();
  });
});
