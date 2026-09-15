import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 6
 * (Veterinarios: Funcionalidades Avanzadas, Post-MVP). PEA-VETADV-001/002
 * ya estaban en el catálogo desde el modelado inicial, pero sin ninguna
 * clase que los implementara hasta la actividad "CRUD de productos_veterinario
 * y comando GenerarPedidoCommand". PEA-VETADV-005 se agregó al catálogo
 * junto con la actividad de recordatorios de turnos (docs/DECISIONES.md).
 */
export class StockInsuficienteError extends ErrorDominio {
  constructor() {
    super('PEA-VETADV-001', 'No queda stock suficiente de este producto.', 409);
  }
}

export class ProductoNoDisponibleError extends ErrorDominio {
  constructor() {
    super('PEA-VETADV-002', 'Este producto ya no está disponible en el catálogo.', 404);
  }
}

export class TurnoAunNoConcluidoError extends ErrorDominio {
  constructor() {
    super('PEA-VETADV-005', 'Todavía no terminó ese turno — vas a poder marcar la asistencia una vez que concluya.', 409);
  }
}
