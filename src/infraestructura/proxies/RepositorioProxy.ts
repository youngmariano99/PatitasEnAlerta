import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

/**
 * Contrato mínimo que cualquier repositorio real (Prisma u otro) debe
 * exponer para poder protegerse con {@link RepositorioProxy}: buscar una
 * entidad por id, devolviendo `null` cuando no existe o está soft-deleted.
 */
export interface RepositorioConBusquedaPorId<TEntidad> {
  buscarPorId(id: string): Promise<TEntidad | null>;
}

/**
 * Decide si `solicitante` está autorizado a acceder a `entidad`, ya
 * resuelta desde el repositorio real. La forma de "pertenencia" varía por
 * entidad (docs/ROLES.md Sección 3): un único dueño (`mascotas.dueño_id`),
 * más de un rol con acceso legítimo (`turnos.proveedor_id` / `reservado_por`),
 * o un vínculo transitivo resuelto por el repositorio real al construir la
 * entidad (`entradas_libreta_sanitaria` vía `mascotas.dueño_id`).
 */
export type VerificadorDePropiedad<TEntidad, TSolicitante> = (
  entidad: TEntidad,
  solicitante: TSolicitante,
) => boolean;

/**
 * Proxy de autorización por objeto (patrón Proxy — CLAUDE.md, Escalabilidad;
 * control de acceso anti-IDOR/BOLA). Sustituye de forma transparente al
 * repositorio real: expone la misma operación `buscarPorId`, pero verifica
 * la pertenencia del recurso ANTES de delegarle la lectura.
 *
 * Colapsa deliberadamente "el recurso no existe" y "el recurso existe pero
 * no es tuyo" en la misma respuesta — 403 (`PEA-SIS-002`) — porque revelar
 * cuál de los dos casos ocurrió es en sí mismo un canal de enumeración de
 * recursos ajenos (docs/ERRORS.md, PEA-SIS-002: "no revelar si el recurso
 * existe o no"). Un caso de uso que necesite distinguir "no existe" (404)
 * de "no te pertenece" (403) para su propio recurso — ej. tu propia lista
 * de mascotas mostrando un ítem soft-deleted — NO debe usar este proxy:
 * ese es un caso legítimo distinto de un intento de acceso cruzado.
 */
export class RepositorioProxy<TEntidad, TSolicitante> implements RepositorioConBusquedaPorId<TEntidad> {
  constructor(
    private readonly repositorioReal: RepositorioConBusquedaPorId<TEntidad>,
    private readonly solicitante: TSolicitante,
    private readonly esPropietario: VerificadorDePropiedad<TEntidad, TSolicitante>,
  ) {}

  async buscarPorId(id: string): Promise<TEntidad> {
    const entidad = await this.repositorioReal.buscarPorId(id);
    if (!entidad || !this.esPropietario(entidad, this.solicitante)) {
      throw new AccesoNoAutorizadoError();
    }
    return entidad;
  }
}
