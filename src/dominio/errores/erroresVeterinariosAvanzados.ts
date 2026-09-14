import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 6
 * (Veterinarios: Funcionalidades Avanzadas, Post-MVP). PEA-VETADV-001/002/003
 * ya estaban en el catálogo desde el modelado inicial, pero sin ninguna
 * clase que los implementara hasta la actividad "CRUD de productos_veterinario
 * y comando GenerarPedidoCommand" (001/002). PEA-VETADV-005 se agregó junto
 * con la actividad de recordatorios de turnos. PEA-VETADV-006 se agregó
 * junto con la actividad "CRUD de historiales_compartidos con autorización
 * explícita y revocable" (docs/DECISIONES.md).
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

/** Se comparte el historial de una mascota consigo mismo (`veterinario_origen_id === veterinario_destino_id`) — validado en aplicación ANTES del `CHECK ck_historial_veterinarios_distintos` de la base (docs/SCHEMA.md). */
export class HistorialCompartidoConUnoMismoError extends ErrorDominio {
  constructor() {
    super('PEA-VETADV-003', 'No podés compartir el historial con vos mismo/a.', 400);
  }
}

/** No hay un historial compartido activo con ese id para ese `veterinarioOrigenId` — colapsa "no existe" y "ya estaba revocado" (mismo criterio anti-carrera que `AutorizacionLibretaNoEncontradaError`). */
export class HistorialCompartidoNoEncontradoError extends ErrorDominio {
  constructor() {
    super('PEA-VETADV-006', 'No encontramos ese historial compartido o ya no está activo.', 404);
  }
}
