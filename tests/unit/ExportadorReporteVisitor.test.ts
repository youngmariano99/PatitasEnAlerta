import {
  AgregadoDashboardMunicipal,
  ElementoMetricaReporte,
  ElementoMetricaTurno,
  ExportadorReporteVisitor,
} from '@aplicacion/visitors/ExportadorReporteVisitor';
import type { MetricaReportePeriodo, MetricaTurnoPeriodo } from '@dominio/puertos/IRepositorioDashboardMunicipal';

const metricaReporte: MetricaReportePeriodo = {
  periodo: new Date('2026-08-03T00:00:00.000Z'),
  tipo: 'perdido',
  estado: 'reportado',
  zonaLat: -37.99,
  zonaLng: -61.35,
  total: 5,
};

const metricaTurno: MetricaTurnoPeriodo = {
  periodo: new Date('2026-08-03T00:00:00.000Z'),
  proveedorTipo: 'municipio',
  estado: 'disponible',
  total: 8,
};

describe('ExportadorReporteVisitor (Visitor)', () => {
  it('AC (Paso 1): recorre los datos agregados y genera un CSV con ambas secciones', () => {
    const agregado = new AgregadoDashboardMunicipal([metricaReporte], [metricaTurno]);
    const visitor = new ExportadorReporteVisitor();

    const csv = visitor.generarCsv(agregado);
    const lineas = csv.split('\r\n');

    expect(lineas[0]).toBe('# Métricas de reportes');
    expect(lineas[1]).toBe('periodo,tipo,estado,zona_lat,zona_lng,total');
    expect(lineas[2]).toBe('2026-08-03T00:00:00.000Z,perdido,reportado,-37.99,-61.35,5');
    expect(lineas[3]).toBe('');
    expect(lineas[4]).toBe('# Métricas de turnos');
    expect(lineas[5]).toBe('periodo,proveedor_tipo,estado,total');
    expect(lineas[6]).toBe('2026-08-03T00:00:00.000Z,municipio,disponible,8');
  });

  it('con un agregado vacío, produce solo los encabezados de ambas secciones', () => {
    const agregado = new AgregadoDashboardMunicipal([], []);
    const visitor = new ExportadorReporteVisitor();

    const csv = visitor.generarCsv(agregado);

    expect(csv).toBe(
      [
        '# Métricas de reportes',
        'periodo,tipo,estado,zona_lat,zona_lng,total',
        '',
        '# Métricas de turnos',
        'periodo,proveedor_tipo,estado,total',
      ].join('\r\n'),
    );
  });

  it('escapa (RFC 4180) un valor que contiene el separador, comillas o salto de línea', () => {
    const agregado = new AgregadoDashboardMunicipal(
      [{ ...metricaReporte, estado: 'con,coma "y comillas"' }],
      [],
    );
    const visitor = new ExportadorReporteVisitor();

    const csv = visitor.generarCsv(agregado);

    expect(csv).toContain('"con,coma ""y comillas"""');
  });

  it('incluye una fila por cada elemento visitado, en el mismo orden', () => {
    const otraMetrica: MetricaReportePeriodo = { ...metricaReporte, tipo: 'encontrado', total: 2 };
    const agregado = new AgregadoDashboardMunicipal([metricaReporte, otraMetrica], []);
    const visitor = new ExportadorReporteVisitor();

    const csv = visitor.generarCsv(agregado);
    const filasReportes = csv.split('\r\n').filter((linea) => linea.startsWith('2026-08-03'));

    expect(filasReportes).toHaveLength(2);
    expect(filasReportes[0]).toContain('perdido');
    expect(filasReportes[1]).toContain('encontrado');
  });

  describe('doble despacho (Visitor GoF)', () => {
    it('ElementoMetricaReporte.aceptar() llama a visitarMetricaReporte con su propia fila', () => {
      const visitor = { visitarMetricaReporte: jest.fn(), visitarMetricaTurno: jest.fn() };
      const elemento = new ElementoMetricaReporte(metricaReporte);

      elemento.aceptar(visitor);

      expect(visitor.visitarMetricaReporte).toHaveBeenCalledWith(metricaReporte);
      expect(visitor.visitarMetricaTurno).not.toHaveBeenCalled();
    });

    it('ElementoMetricaTurno.aceptar() llama a visitarMetricaTurno con su propia fila', () => {
      const visitor = { visitarMetricaReporte: jest.fn(), visitarMetricaTurno: jest.fn() };
      const elemento = new ElementoMetricaTurno(metricaTurno);

      elemento.aceptar(visitor);

      expect(visitor.visitarMetricaTurno).toHaveBeenCalledWith(metricaTurno);
      expect(visitor.visitarMetricaReporte).not.toHaveBeenCalled();
    });
  });

  it('AgregadoDashboardMunicipal.elementosReportes()/elementosTurnos() envuelven cada fila en su propio elemento visitable', () => {
    const agregado = new AgregadoDashboardMunicipal([metricaReporte], [metricaTurno]);

    expect(agregado.elementosReportes()).toHaveLength(1);
    expect(agregado.elementosReportes()[0]).toBeInstanceOf(ElementoMetricaReporte);
    expect(agregado.elementosTurnos()).toHaveLength(1);
    expect(agregado.elementosTurnos()[0]).toBeInstanceOf(ElementoMetricaTurno);
  });
});
