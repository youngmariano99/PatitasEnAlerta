import type { MetricaReportePeriodo, MetricaTurnoPeriodo } from '@dominio/puertos/IRepositorioDashboardMunicipal';

/**
 * Visitor (GoF, PLANIFICACION.md Sección 4 — ahí documentado como
 * `ExportadorDashboardVisitor`, mismo rol; este ticket fija el nombre de
 * archivo/clase concreta como `ExportadorReporteVisitor`): recorre, con
 * doble despacho, las filas ya agregadas de `mv_metricas_reportes_periodo`/
 * `mv_metricas_turnos_periodo` (docs/SCHEMA.md) sin que
 * `MetricaReportePeriodo`/`MetricaTurnoPeriodo` (tipos de dominio, puros
 * datos) necesiten saber nada sobre CSV. Sumar un futuro exportador (JSON,
 * o el PDF que PLANIFICACION.md deja para "post-demo") es agregar una clase
 * nueva que implemente `VisitorDashboardMunicipal`, sin tocar
 * `AgregadoDashboardMunicipal` ni los elementos visitados.
 */
export interface VisitorDashboardMunicipal {
  visitarMetricaReporte(fila: MetricaReportePeriodo): void;
  visitarMetricaTurno(fila: MetricaTurnoPeriodo): void;
}

/** Elemento "visitable" (doble despacho): decide a qué método del visitor le corresponde esta fila. */
export class ElementoMetricaReporte {
  constructor(private readonly fila: MetricaReportePeriodo) {}

  aceptar(visitor: VisitorDashboardMunicipal): void {
    visitor.visitarMetricaReporte(this.fila);
  }
}

/** Elemento "visitable" (doble despacho) — misma idea que ElementoMetricaReporte, para la otra vista materializada. */
export class ElementoMetricaTurno {
  constructor(private readonly fila: MetricaTurnoPeriodo) {}

  aceptar(visitor: VisitorDashboardMunicipal): void {
    visitor.visitarMetricaTurno(this.fila);
  }
}

/**
 * Estructura recorrida por el Visitor — envuelve exactamente el mismo
 * `DashboardMunicipal` que ObtenerDashboardMunicipal.ts arma con
 * DashboardMunicipalBuilder (Builder, ticket anterior): AC "el CSV
 * descargado contiene exactamente los mismos datos que se muestran en
 * pantalla" se cumple por construcción, ambos caminos parten del mismo
 * `DashboardMunicipal`.
 */
export class AgregadoDashboardMunicipal {
  constructor(
    public readonly metricasReportes: MetricaReportePeriodo[],
    public readonly metricasTurnos: MetricaTurnoPeriodo[],
  ) {}

  elementosReportes(): ElementoMetricaReporte[] {
    return this.metricasReportes.map((fila) => new ElementoMetricaReporte(fila));
  }

  elementosTurnos(): ElementoMetricaTurno[] {
    return this.metricasTurnos.map((fila) => new ElementoMetricaTurno(fila));
  }
}

const SEPARADOR_CSV = ',';
const SALTO_DE_LINEA = '\r\n'; // RFC 4180

function celdaCsv(valor: string | number): string {
  const texto = String(valor);
  // RFC 4180: entre comillas dobles cualquier valor que contenga el
  // separador, comillas o saltos de línea — y las comillas internas se
  // duplican. `zonaLat`/`total` nunca las necesitan hoy, pero `tipo`/`estado`
  // podrían crecer a texto libre a futuro sin romper este visitor.
  if (/[",\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

function filaCsv(valores: Array<string | number>): string {
  return valores.map(celdaCsv).join(SEPARADOR_CSV);
}

/**
 * Visitor concreto (Paso 1 del ticket): produce el CSV del resumen de
 * actividad municipal (Historia "Exportación de resumen de actividad",
 * MUN-05) — dos secciones (reportes, turnos), cada una con su propio
 * encabezado, porque `MetricaReportePeriodo`/`MetricaTurnoPeriodo` tienen
 * columnas distintas.
 */
export class ExportadorReporteVisitor implements VisitorDashboardMunicipal {
  private lineas: string[] = [];

  visitarMetricaReporte(fila: MetricaReportePeriodo): void {
    this.lineas.push(
      filaCsv([fila.periodo.toISOString(), fila.tipo, fila.estado, fila.zonaLat, fila.zonaLng, fila.total]),
    );
  }

  visitarMetricaTurno(fila: MetricaTurnoPeriodo): void {
    this.lineas.push(filaCsv([fila.periodo.toISOString(), fila.proveedorTipo, fila.estado, fila.total]));
  }

  /** Recorre `agregado` (Visitor + doble despacho vía `aceptar()`) y devuelve el CSV completo, listo para servir. */
  generarCsv(agregado: AgregadoDashboardMunicipal): string {
    this.lineas = ['# Métricas de reportes', filaCsv(['periodo', 'tipo', 'estado', 'zona_lat', 'zona_lng', 'total'])];
    for (const elemento of agregado.elementosReportes()) {
      elemento.aceptar(this);
    }

    this.lineas.push('', '# Métricas de turnos', filaCsv(['periodo', 'proveedor_tipo', 'estado', 'total']));
    for (const elemento of agregado.elementosTurnos()) {
      elemento.aceptar(this);
    }

    return this.lineas.join(SALTO_DE_LINEA);
  }
}
