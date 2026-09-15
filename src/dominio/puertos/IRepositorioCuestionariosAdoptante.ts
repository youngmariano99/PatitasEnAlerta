import type { CuestionarioAdoptante, DatosCuestionarioAdoptante } from '@dominio/entidades/CuestionarioAdoptante';

/**
 * Puerto hacia `cuestionarios_adoptante` (Módulo 9, Historia "Cuestionario
 * de estilo de vida del adoptante"). Un usuario tiene a lo sumo un
 * cuestionario propio — `crear`/`actualizar` se resuelven siempre vía
 * `obtenerPropio` primero (patrón upsert, mismo criterio que
 * `IRepositorioDisponibilidad`/`ConfigurarDisponibilidad`), nunca sobre un
 * `id` recibido del cliente.
 */
export interface IRepositorioCuestionariosAdoptante {
  /** El cuestionario del usuario autenticado, si ya completó uno alguna vez (`null` si no, o está soft-deleted). */
  obtenerPropio(usuarioId: string): Promise<CuestionarioAdoptante | null>;
  crear(usuarioId: string, datos: DatosCuestionarioAdoptante): Promise<CuestionarioAdoptante>;
  actualizar(id: string, datos: DatosCuestionarioAdoptante): Promise<CuestionarioAdoptante>;
}
