import type { EstadoColaboracion } from '@dominio/entidades/Colaboracion';

/**
 * State (GoF) del ciclo de vida de una colaboración (Módulo 5 — Red de
 * Colaboración, Post-MVP; docs/REQUISITOS.md: "Coordinar el seguimiento de
 * una colaboración aceptada en un hilo dedicado, con historial persistente").
 * Mismo criterio que ReporteEstado.ts: `ActualizarEstadoColaboracionCommand`
 * nunca abre un switch/if sobre el string del estado, solo le pregunta a la
 * instancia actual `puedeTransicionarA(destino)`.
 *
 * El camino es lineal y sin atajos, igual que ReporteEstado: 'propuesta'
 * puede resolverse en 'aceptada' o 'rechazada', pero solo desde 'aceptada'
 * se llega a 'completada' — saltar directo de 'propuesta' a 'completada' se
 * rechaza con PEA-RED-006 (409), para que toda colaboración deje registro de
 * haber pasado por la aceptación de la organización antes de darse por
 * completada. 'rechazada' y 'completada' son terminales.
 */
export abstract class ColaboracionEstado {
  abstract readonly valor: EstadoColaboracion;
  protected abstract readonly transiciones: readonly EstadoColaboracion[];

  puedeTransicionarA(destino: EstadoColaboracion): boolean {
    return this.transiciones.includes(destino);
  }

  /** Para ofrecer en la UI solo lo que el backend va a aceptar (hilo de coordinación de la Organización). */
  get transicionesValidas(): readonly EstadoColaboracion[] {
    return this.transiciones;
  }

  /** Factory: instancia el estado concreto correspondiente al valor persistido. */
  static desde(valor: EstadoColaboracion): ColaboracionEstado {
    switch (valor) {
      case 'propuesta':
        return new EstadoPropuesta();
      case 'aceptada':
        return new EstadoAceptada();
      case 'rechazada':
        return new EstadoRechazada();
      case 'completada':
        return new EstadoCompletada();
    }
  }
}

/** Recién ofrecida por un rescatista/veterinario — a la espera de que la organización dueña de la solicitud la resuelva. */
export class EstadoPropuesta extends ColaboracionEstado {
  readonly valor: EstadoColaboracion = 'propuesta';
  protected readonly transiciones: readonly EstadoColaboracion[] = ['aceptada', 'rechazada'];
}

/** La organización la aceptó — el hilo de coordinación queda abierto hasta completarse. */
export class EstadoAceptada extends ColaboracionEstado {
  readonly valor: EstadoColaboracion = 'aceptada';
  protected readonly transiciones: readonly EstadoColaboracion[] = ['completada'];
}

/** Terminal: la organización la rechazó — ninguna transición sale de acá. */
export class EstadoRechazada extends ColaboracionEstado {
  readonly valor: EstadoColaboracion = 'rechazada';
  protected readonly transiciones: readonly EstadoColaboracion[] = [];
}

/** Terminal: el recurso/colaboración se llevó a cabo — ninguna transición sale de acá. */
export class EstadoCompletada extends ColaboracionEstado {
  readonly valor: EstadoColaboracion = 'completada';
  protected readonly transiciones: readonly EstadoColaboracion[] = [];
}
