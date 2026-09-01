import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ParametrosListarVitrinaAdopcionPublico } from '@aplicacion/dtos/municipio/FichaAdopcionDto';
import type { IRepositorioFichasAdopcion, PaginaFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';

const TOPE_POR_PAGINA = 50;

/**
 * Template Method (CasoDeUsoBase) aplicado a una consulta pública de solo
 * lectura — "Consulta pública de la vitrina de adopción" (Módulo 3). Igual
 * que ListarReportes/ListarEventosPublico, `autorizar()` es un no-op real:
 * GET /adopciones es explícitamente público sin login (docs/ROLES.md 3.3
 * Patrón B, `vitrina_select_publico` + `GRANT SELECT ON vitrina_adopcion TO
 * anon`), consistente con SITEMAP.md ("/adopciones — consulta pública de la
 * Vitrina de Adopción").
 *
 * A diferencia de `ListarFichasAdopcion` (panel municipal, ve TODOS los
 * estados de las fichas propias), acá `IRepositorioFichasAdopcion.listarPublico`
 * filtra exclusivamente por `estado='disponible'` sin excepción — un
 * visitante anónimo nunca ve fichas 'adoptado' ni 'baja' (AC del ticket).
 */
@injectable()
export class ListarVitrinaAdopcionPublico extends CasoDeUsoBase<ParametrosListarVitrinaAdopcionPublico, PaginaFichasAdopcion> {
  constructor(@inject('IRepositorioFichasAdopcion') private readonly repositorioFichas: IRepositorioFichasAdopcion) {
    super();
  }

  protected validar(input: ParametrosListarVitrinaAdopcionPublico): ParametrosListarVitrinaAdopcionPublico {
    return {
      pagina: Math.max(1, Math.trunc(input.pagina) || 1),
      // Tope 50 impuesto acá también (no solo en el DTO): defensa en
      // profundidad ante cualquier llamador futuro del caso de uso (Paso 2
      // del ticket).
      porPagina: Math.min(TOPE_POR_PAGINA, Math.max(1, Math.trunc(input.porPagina) || TOPE_POR_PAGINA)),
    };
  }

  protected async autorizar(): Promise<void> {
    // No-op deliberado: sin verificación de sesión ni de rol. Cualquier
    // visitante (autenticado o `anon`) puede consultar la vitrina pública.
  }

  protected async persistir(dato: ParametrosListarVitrinaAdopcionPublico): Promise<PaginaFichasAdopcion> {
    return this.repositorioFichas.listarPublico(dato.pagina, dato.porPagina);
  }
}
