import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioAutorizacionesLibreta } from '@dominio/puertos/IRepositorioAutorizacionesLibreta';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';

export interface PacientePropio {
  mascotaId: string;
  nombre: string;
  especie: string;
  fotoUrl: string;
}

/**
 * Template Method (CasoDeUsoBase) — "Mis pacientes" (Módulo 4): mascotas con
 * una autorización vigente hacia el veterinario autenticado. Filtra
 * exclusivamente por `veterinarioId` de la sesión — nunca los pacientes de
 * otro veterinario (anti-IDOR, mismo criterio que `ListarAutorizacionesLibreta`
 * del lado del dueño).
 */
@injectable()
export class ListarPacientesPropios extends CasoDeUsoBase<string, PacientePropio[]> {
  constructor(
    @inject('IRepositorioAutorizacionesLibreta')
    private readonly repositorioAutorizaciones: IRepositorioAutorizacionesLibreta,
    @inject('IRepositorioMascotas') private readonly repositorioMascotas: IRepositorioMascotas,
  ) {
    super();
  }

  protected validar(veterinarioId: string): string {
    return veterinarioId;
  }

  protected async autorizar(): Promise<void> {
    // No-op: el veterinario autenticado siempre puede ver sus propios pacientes.
  }

  protected async persistir(veterinarioId: string): Promise<PacientePropio[]> {
    const autorizaciones =
      await this.repositorioAutorizaciones.listarVigentesPorVeterinario(veterinarioId);

    const mascotas = await Promise.all(
      autorizaciones.map((autorizacion) =>
        this.repositorioMascotas.buscarPorId(autorizacion.mascotaId),
      ),
    );

    // Una mascota dada de baja después de autorizar conserva la fila de
    // autorización (nunca se borra), pero `buscarPorId` ya la excluye por
    // soft delete — se filtra acá para no mostrar pacientes inexistentes.
    return mascotas
      .filter((mascota): mascota is NonNullable<typeof mascota> => mascota !== null)
      .map((mascota) => ({
        mascotaId: mascota.id,
        nombre: mascota.nombre,
        especie: mascota.especie,
        fotoUrl: mascota.fotoUrl,
      }));
  }
}
