import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { z } from 'zod';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { HistorialEstadoItem, IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { ReporteNoEncontradoError } from '@dominio/errores/erroresReportes';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const ROLES_CON_ACCESO_TOTAL = ['municipio', 'administrador'];

const ComandoSchema = z.object({
  reporteId: z.string().uuid('El identificador del reporte no es válido.'),
  solicitanteId: z.string().uuid(),
});

export interface ComandoListarHistorialReporte {
  reporteId: string;
  solicitanteId: string;
}

/**
 * Historial de cambios de estado de un reporte (Módulo 2) — línea de tiempo
 * consultada desde `app/reportes/[id]/page.tsx`. `autorizar()` sigue la
 * matriz de docs/ROLES.md ("reportes_historial_estado | R(p, de sus
 * reportes) ... municipio R(t) ... administrador R(t)"): el dueño del
 * reporte accede solo al suyo, municipio/administrador acceden a
 * cualquiera. Cualquier otro caso (dueño ajeno, veterinario, etc.) recibe
 * PEA-SIS-002 (403) — el mismo código anti-IDOR/BOLA que ya usa el resto del
 * proyecto para "no tenés permiso", en vez de inventar un código nuevo
 * específico de reportes.
 *
 * Se resuelve primero `obtenerPropietario()` (404 si el reporte no existe o
 * está soft-deleted, PEA-REP-005) y recién después el rol del solicitante —
 * mismo orden que CambiarEstadoReporteCommand mantiene entre "no existe" y
 * "no autorizado".
 */
@injectable()
export class ListarHistorialReporte extends CasoDeUsoBase<ComandoListarHistorialReporte, HistorialEstadoItem[]> {
  constructor(
    @inject('IRepositorioReportes') private readonly repositorioReportes: IRepositorioReportes,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: ComandoListarHistorialReporte): ComandoListarHistorialReporte {
    return ComandoSchema.parse(input);
  }

  protected async autorizar(dato: ComandoListarHistorialReporte): Promise<void> {
    const propietarioId = await this.repositorioReportes.obtenerPropietario(dato.reporteId);
    if (!propietarioId) {
      throw new ReporteNoEncontradoError();
    }
    if (propietarioId === dato.solicitanteId) {
      return;
    }

    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.solicitanteId);
    if (!solicitante || !ROLES_CON_ACCESO_TOTAL.includes(solicitante.rol)) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoListarHistorialReporte): Promise<HistorialEstadoItem[]> {
    return this.repositorioReportes.listarHistorialEstado(dato.reporteId);
  }
}
