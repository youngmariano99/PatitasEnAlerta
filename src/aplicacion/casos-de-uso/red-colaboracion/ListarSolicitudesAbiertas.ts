import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ParametrosListarSolicitudesAbiertas } from '@aplicacion/dtos/red-colaboracion/ListarSolicitudesAbiertasDto';
import type {
  IRepositorioSolicitudesRecurso,
  PaginaSolicitudesVeterinarias,
} from '@dominio/puertos/IRepositorioSolicitudesRecurso';

/**
 * Template Method (CasoDeUsoBase) aplicado a una consulta: todas las
 * solicitudes de recurso abiertas (cualquier tipo), paginadas. Sin
 * restricción de rol — cualquier participante autenticado de la Red de
 * Colaboración puede navegar el listado completo antes de ofrecerse (el
 * ofrecimiento en sí sigue verificando rol en
 * `OfrecerseComoColaboradorCommand.autorizar()`).
 */
@injectable()
export class ListarSolicitudesAbiertas extends CasoDeUsoBase<
  ParametrosListarSolicitudesAbiertas,
  PaginaSolicitudesVeterinarias
> {
  constructor(
    @inject('IRepositorioSolicitudesRecurso')
    private readonly repositorioSolicitudes: IRepositorioSolicitudesRecurso,
  ) {
    super();
  }

  protected validar(
    input: ParametrosListarSolicitudesAbiertas,
  ): ParametrosListarSolicitudesAbiertas {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // No-op: ver docstring de la clase.
  }

  protected async persistir(
    dato: ParametrosListarSolicitudesAbiertas,
  ): Promise<PaginaSolicitudesVeterinarias> {
    return this.repositorioSolicitudes.listarAbiertas(dato.pagina, dato.porPagina);
  }
}
