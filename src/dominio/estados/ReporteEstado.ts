import type { EstadoReporte } from '@dominio/entidades/Reporte';

/**
 * State (GoF, PLANIFICACION.md Sección 4.2) del ciclo de vida de un reporte.
 * Cada estado persistido (docs/SCHEMA.md, `CHECK estado IN ('reportado',
 * 'en_revision','en_atencion','resuelto','cerrado')`) tiene su propia
 * subclase que declara explícitamente hacia qué otros estados puede
 * transicionar — `CambiarEstadoReporteCommand.ts` nunca abre un switch/if
 * sobre el string del estado, solo le pregunta a la instancia actual
 * `puedeTransicionarA(destino)` (verificación técnica de este ticket: "sin
 * condicionales dispersos en el caso de uso").
 *
 * Los cinco nombres de subclase siguen 1:1 los cinco valores reales del
 * CHECK — no se agregan estados intermedios que el checklist menciona a
 * modo de ejemplo genérico ('Asignada'/'EnProgreso') pero que no existen en
 * el esquema persistido: sumarlos exigiría una migración de CHECK
 * constraint no pedida explícitamente por este ticket, y rompería el
 * historial de reportes ya sembrado en tickets anteriores (seed, tests de
 * ListarReportes/EvaluarCoincidenciaReporte, etc., todos escritos contra
 * estos cinco valores).
 *
 * El camino hacia 'cerrado' es lineal y sin atajos: solo se llega desde
 * 'resuelto'. Saltar estados intermedios (ej. 'reportado' → 'cerrado'
 * directo) se rechaza con PEA-REP-006 (409) — criterio de aceptación
 * explícito de este ticket — para que un reporte siempre deje registro de
 * haber pasado por revisión y atención municipal antes de darse por
 * cerrado.
 */
export abstract class ReporteEstado {
  abstract readonly valor: EstadoReporte;
  protected abstract readonly transiciones: readonly EstadoReporte[];

  puedeTransicionarA(destino: EstadoReporte): boolean {
    return this.transiciones.includes(destino);
  }

  /** Para ofrecer en la UI solo lo que el backend va a aceptar (PanelReportesMunicipio.tsx). */
  get transicionesValidas(): readonly EstadoReporte[] {
    return this.transiciones;
  }

  /** Factory: instancia el estado concreto correspondiente al valor persistido. */
  static desde(valor: EstadoReporte): ReporteEstado {
    switch (valor) {
      case 'reportado':
        return new EstadoReportado();
      case 'en_revision':
        return new EstadoEnRevision();
      case 'en_atencion':
        return new EstadoEnAtencion();
      case 'resuelto':
        return new EstadoResuelto();
      case 'cerrado':
        return new EstadoCerrado();
    }
  }
}

/** Recién publicado — todavía sin revisar. */
export class EstadoReportado extends ReporteEstado {
  readonly valor: EstadoReporte = 'reportado';
  protected readonly transiciones: readonly EstadoReporte[] = ['en_revision'];
}

/** Un operador municipal ya lo tomó y está evaluando si amerita una intervención. */
export class EstadoEnRevision extends ReporteEstado {
  readonly valor: EstadoReporte = 'en_revision';
  protected readonly transiciones: readonly EstadoReporte[] = ['en_atencion'];
}

/** El municipio ya está actuando sobre el reporte (operativo en curso, visita agendada, etc.). */
export class EstadoEnAtencion extends ReporteEstado {
  readonly valor: EstadoReporte = 'en_atencion';
  protected readonly transiciones: readonly EstadoReporte[] = ['resuelto'];
}

/** Atendido con un resultado concreto (mascota recuperada, foco saneado, etc.). */
export class EstadoResuelto extends ReporteEstado {
  readonly valor: EstadoReporte = 'resuelto';
  protected readonly transiciones: readonly EstadoReporte[] = ['cerrado'];
}

/** Terminal: cerrado con o sin resolución (ej. duplicado, sin sustento) — ninguna transición sale de acá. */
export class EstadoCerrado extends ReporteEstado {
  readonly valor: EstadoReporte = 'cerrado';
  protected readonly transiciones: readonly EstadoReporte[] = [];
}
