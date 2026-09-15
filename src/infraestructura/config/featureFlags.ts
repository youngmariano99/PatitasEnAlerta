/**
 * Feature flags de variable de entorno (Paso 3, actividad "CRUD de
 * historiales_compartidos"). `historialesCompartidos` gatea por completo la
 * Historia "Historia clínica interoperable entre veterinarios" hasta contar
 * con el marco de responsabilidad profesional formalmente aprobado
 * (docs/DECISIONES.md) — deshabilitada por defecto (`undefined` ≠ 'true').
 */
export function historialesCompartidosHabilitado(): boolean {
  return process.env.FEATURE_HISTORIALES_COMPARTIDOS === 'true';
}
