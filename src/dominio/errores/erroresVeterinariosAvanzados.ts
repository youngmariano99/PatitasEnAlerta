import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 6
 * (Veterinarios: Funcionalidades Avanzadas, Post-MVP). PEA-VETADV-005 se
 * agregó al catálogo junto con esta actividad (docs/DECISIONES.md): ninguno
 * de los códigos existentes (001-004, sobre stock/catálogo/historial
 * compartido/cancelación de pedidos) cubre "todavía no terminó el turno".
 */
export class TurnoAunNoConcluidoError extends ErrorDominio {
  constructor() {
    super('PEA-VETADV-005', 'Todavía no terminó ese turno — vas a poder marcar la asistencia una vez que concluya.', 409);
  }
}
