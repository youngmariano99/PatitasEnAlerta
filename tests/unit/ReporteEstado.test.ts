/**
 * @jest-environment node
 */
import {
  ReporteEstado,
  EstadoReportado,
  EstadoEnRevision,
  EstadoEnAtencion,
  EstadoResuelto,
  EstadoCerrado,
} from '@dominio/estados/ReporteEstado';
import type { EstadoReporte } from '@dominio/entidades/Reporte';

describe('ReporteEstado (State)', () => {
  describe('ReporteEstado.desde()', () => {
    it.each([
      ['reportado', EstadoReportado],
      ['en_revision', EstadoEnRevision],
      ['en_atencion', EstadoEnAtencion],
      ['resuelto', EstadoResuelto],
      ['cerrado', EstadoCerrado],
    ] as const)('instancia la subclase correcta para "%s"', (valor, Clase) => {
      const estado = ReporteEstado.desde(valor);
      expect(estado).toBeInstanceOf(Clase);
      expect(estado.valor).toBe(valor);
    });
  });

  describe('cada subclase declara sus propias transiciones', () => {
    it.each([
      ['reportado', ['en_revision']],
      ['en_revision', ['en_atencion']],
      ['en_atencion', ['resuelto']],
      ['resuelto', ['cerrado']],
      ['cerrado', []],
    ] as const)('transicionesValidas de "%s" es %j', (valor, esperadas) => {
      expect(ReporteEstado.desde(valor).transicionesValidas).toEqual(esperadas);
    });
  });

  describe('puedeTransicionarA', () => {
    it('AC: "reportado" no puede saltar directamente a "cerrado" (PEA-REP-006)', () => {
      expect(ReporteEstado.desde('reportado').puedeTransicionarA('cerrado')).toBe(false);
    });

    it.each([
      ['reportado', 'en_revision'],
      ['en_revision', 'en_atencion'],
      ['en_atencion', 'resuelto'],
      ['resuelto', 'cerrado'],
    ] as const)('acepta la transición lineal %s → %s', (origen, destino) => {
      expect(ReporteEstado.desde(origen).puedeTransicionarA(destino)).toBe(true);
    });

    it.each([
      ['reportado', 'en_atencion'],
      ['reportado', 'resuelto'],
      ['reportado', 'cerrado'],
      ['en_revision', 'resuelto'],
      ['en_revision', 'cerrado'],
      ['en_atencion', 'cerrado'],
      ['cerrado', 'reportado'],
      ['resuelto', 'en_revision'],
    ] as const)('rechaza saltar estados intermedios: %s → %s', (origen, destino) => {
      expect(ReporteEstado.desde(origen).puedeTransicionarA(destino)).toBe(false);
    });

    it('"cerrado" es terminal: ninguna transición sale de ahí', () => {
      const todas: EstadoReporte[] = ['reportado', 'en_revision', 'en_atencion', 'resuelto', 'cerrado'];
      todas.forEach((destino) => {
        expect(ReporteEstado.desde('cerrado').puedeTransicionarA(destino)).toBe(false);
      });
    });
  });
});
