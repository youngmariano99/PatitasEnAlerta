import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

/**
 * Template Method (CasoDeUsoBase) aplicado a una consulta: el `usuarioId` ya
 * llega resuelto y verificado por el route handler (sesión de Supabase
 * Auth) — no hay nada que validar ni autorizar más allá de "cada usuario
 * consulta su propio perfil", así que esos dos pasos son no-op.
 */
@injectable()
export class ObtenerPerfilPropio extends CasoDeUsoBase<string, ResumenPerfilPropio> {
  constructor(@inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil) {
    super();
  }

  protected validar(usuarioId: string): string {
    return usuarioId;
  }

  protected async autorizar(): Promise<void> {
    // No-op: el usuario autenticado siempre puede consultar su propio perfil.
  }

  protected async persistir(usuarioId: string): Promise<ResumenPerfilPropio> {
    const perfil = await this.repositorioPerfil.obtenerPerfilPropio(usuarioId);
    if (!perfil) {
      // Sesión válida pero sin fila activa en `usuarios` (cuenta dada de
      // baja entre la emisión del JWT y esta consulta) — caso anómalo sin
      // código propio en ERRORS.md; el route handler lo trata como error
      // no controlado (500 / PEA-SIS-003).
      throw new Error('No se encontró un usuario activo para la sesión autenticada.');
    }
    return perfil;
  }
}
