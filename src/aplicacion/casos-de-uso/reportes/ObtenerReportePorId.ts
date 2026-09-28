import { inject, injectable } from 'tsyringe';
import type { IRepositorioReportes, ReporteListado } from '@dominio/puertos/IRepositorioReportes';
import { ErrorDominio } from '@dominio/errores/ErrorDominio';

export class ReporteNoEncontradoError extends ErrorDominio {
  constructor(id: string) {
    super('REPORTE_NO_ENCONTRADO', `El reporte con ID ${id} no existe o fue eliminado.`, 404);
    this.name = 'ReporteNoEncontradoError';
  }
}

@injectable()
export class ObtenerReportePorId {
  constructor(
    @inject('IRepositorioReportes')
    private readonly repositorio: IRepositorioReportes,
  ) {}

  async ejecutar(id: string): Promise<ReporteListado> {
    const reporte = await this.repositorio.obtenerPorId(id);
    if (!reporte) {
      throw new ReporteNoEncontradoError(id);
    }
    return reporte;
  }
}
