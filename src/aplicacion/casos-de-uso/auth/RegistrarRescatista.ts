import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { RegistrarUsuario } from '@aplicacion/casos-de-uso/auth/RegistrarUsuario';
import { RegistrarRescatistaSchema, type RegistrarRescatistaDto } from '@aplicacion/dtos/auth/RegistrarRescatistaDto';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { Usuario } from '@dominio/entidades/Usuario';

/**
 * Historia "Registro de rescatista/activista" (Módulo 5 — Red de
 * Colaboración, Post-MVP). El rol `rescatista` no tiene tabla de perfil
 * adicional (docs/SCHEMA.md) ni exige verificación profesional
 * (docs/ROLES.md: alta = "Autoregistro", sin columna de verificación) — es
 * exactamente el mismo flujo que RegistrarUsuario (dueño), solo cambia el
 * rol_id de la tabla `roles` (5, docs/SEED.md). Por eso extiende
 * RegistrarUsuario en vez de duplicar el Template Method completo
 * (validar → autorizar unicidad de email → persistir con compensación en
 * Supabase Auth ante fallo de persistencia): sobrescribe únicamente los dos
 * puntos de variación (qué esquema valida, qué entidad de dominio crea).
 */
@injectable()
export class RegistrarRescatista extends RegistrarUsuario {
  constructor(
    @inject('IRepositorioUsuarios') repositorioUsuarios: IRepositorioUsuarios,
    @inject('IProveedorAutenticacion') proveedorAutenticacion: IProveedorAutenticacion,
  ) {
    super(repositorioUsuarios, proveedorAutenticacion);
  }

  protected override validar(input: RegistrarRescatistaDto): RegistrarRescatistaDto {
    return RegistrarRescatistaSchema.parse(input);
  }

  protected override crearEntidad(id: string, email: string): Usuario {
    return Usuario.registrarRescatista(id, email);
  }
}
