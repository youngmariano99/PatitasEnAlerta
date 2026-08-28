import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  RecuperarPasswordSchema,
  type ComandoRecuperarPassword,
} from '@aplicacion/dtos/auth/RecuperarPasswordDto';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast) → autorizar
 * (operación pública, no requiere sesión) → persistir (dispara el email de
 * recuperación vía Supabase Auth).
 *
 * Garantía de este caso de uso, no solo del adaptador: `ejecutar()` NUNCA
 * rechaza por causa del email en sí (exista o no la cuenta) — ver el
 * contrato de IProveedorAutenticacion.solicitarRecuperacionPassword. Solo
 * puede rechazar por un payload mal formado (ZodError), que el route
 * handler mapea a un 400 genérico — nunca revela nada sobre la cuenta.
 */
@injectable()
export class RecuperarPassword extends CasoDeUsoBase<ComandoRecuperarPassword, void> {
  constructor(@inject('IProveedorAutenticacion') private readonly proveedorAutenticacion: IProveedorAutenticacion) {
    super();
  }

  protected validar(input: ComandoRecuperarPassword): ComandoRecuperarPassword {
    const datos = RecuperarPasswordSchema.parse(input);
    return { ...datos, redirectTo: input.redirectTo };
  }

  protected async autorizar(): Promise<void> {
    // Operación pública/anónima — cualquiera puede solicitar la recuperación
    // de cualquier email (es, precisamente, el punto: no requiere sesión).
  }

  protected async persistir(dato: ComandoRecuperarPassword): Promise<void> {
    await this.proveedorAutenticacion.solicitarRecuperacionPassword(dato.email, dato.redirectTo);
  }
}
