import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ListarSolicitudesVeterinariasQuerySchema,
  type ComandoListarSolicitudesVeterinarias,
} from '@aplicacion/dtos/red-colaboracion/ListarSolicitudesVeterinariasDto';
import type { IRepositorioSolicitudesRecurso, PaginaSolicitudesVeterinarias } from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROL_AUTORIZADO = 'veterinario';

/** Payload crudo de la query string + quién consulta, resuelto por el route handler desde la sesión. */
export interface EntradaListarSolicitudesVeterinarias {
  datosCrudos: unknown;
  veterinarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Filtrado de solicitudes de
 * asistencia veterinaria" (Módulo 5, docs/REQUISITOS.md Post-MVP: "Recibir y
 * filtrar solicitudes de asistencia veterinaria de la Red por zona").
 *
 * `autorizar()` exige exclusivamente rol `veterinario` (Paso 2 del ticket:
 * "restringir el acceso de solo lectura a rol_actual()='veterinario'") — a
 * diferencia de `ListarDirectorioAliados`, que acepta un conjunto de roles,
 * acá el propio checklist pide un único rol autorizado, mismo patrón
 * `ROL_AUTORIZADO` singular que `PublicarSolicitudRecurso`. Un rescatista, una
 * organización o cualquier otro rol reciben PEA-SIS-002 (403) — sin código
 * propio en docs/ERRORS.md para este rechazo puntual, se reutiliza el
 * transversal, mismo criterio que el resto de los endpoints de este módulo.
 *
 * `persistir()` delega el filtro tipo/estado fijo
 * (`asistencia_veterinaria`/`abierta`) + zona opcional + paginación
 * server-side (Paso 3) en `IRepositorioSolicitudesRecurso
 * .listarAsistenciaVeterinariaAbiertas`, nunca arma la query acá — mismo
 * criterio de separación de responsabilidades que `ListarDirectorioAliados`.
 *
 * Nota de alcance: la Historia menciona también filtrar por "especialidad",
 * pero ni el checklist ni los criterios de aceptación de este ticket lo
 * piden, y `docs/SCHEMA.md` no modela ninguna columna de especialidad sobre
 * `perfiles_veterinario` ni `solicitudes_recurso` — ver docs/DECISIONES.md.
 */
@injectable()
export class ListarSolicitudesVeterinarias extends CasoDeUsoBase<
  EntradaListarSolicitudesVeterinarias,
  PaginaSolicitudesVeterinarias,
  ComandoListarSolicitudesVeterinarias
> {
  constructor(
    @inject('IRepositorioSolicitudesRecurso') private readonly repositorioSolicitudes: IRepositorioSolicitudesRecurso,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaListarSolicitudesVeterinarias): ComandoListarSolicitudesVeterinarias {
    const datos = ListarSolicitudesVeterinariasQuerySchema.parse(input.datosCrudos);
    return { ...datos, veterinarioId: input.veterinarioId };
  }

  protected async autorizar(dato: ComandoListarSolicitudesVeterinarias): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.veterinarioId);
    if (!solicitante || solicitante.rol !== ROL_AUTORIZADO) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarSolicitudesVeterinarias): Promise<PaginaSolicitudesVeterinarias> {
    const zona =
      dato.latitud !== undefined && dato.longitud !== undefined && dato.radioKm !== undefined
        ? { latitud: dato.latitud, longitud: dato.longitud, radioKm: dato.radioKm }
        : undefined;

    return this.repositorioSolicitudes.listarAsistenciaVeterinariaAbiertas(zona, dato.pagina, dato.porPagina);
  }
}
