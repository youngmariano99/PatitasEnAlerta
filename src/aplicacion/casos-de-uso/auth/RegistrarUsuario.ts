import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { Prisma } from '@prisma/client';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  RegistrarDuenoSchema,
  type RegistrarDuenoDto,
  type UsuarioRegistrado,
} from '@aplicacion/dtos/auth/RegistrarDuenoDto';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { Usuario } from '@dominio/entidades/Usuario';
import { EmailYaRegistradoError } from '@dominio/errores/erroresAutenticacion';
import { logger } from '@infraestructura/logging/logger';

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast) → autorizar
 * (verificar unicidad de email, AUTH-01) → persistir (alta en Supabase Auth
 * + insert en `usuarios`, con compensación si el segundo paso falla).
 */
@injectable()
export class RegistrarUsuario extends CasoDeUsoBase<RegistrarDuenoDto, UsuarioRegistrado> {
  constructor(
    @inject('IRepositorioUsuarios') private readonly repositorioUsuarios: IRepositorioUsuarios,
    @inject('IProveedorAutenticacion') private readonly proveedorAutenticacion: IProveedorAutenticacion,
  ) {
    super();
  }

  protected validar(input: RegistrarDuenoDto): RegistrarDuenoDto {
    // input llega como `unknown` en tiempo de ejecución (payload de la request);
    // el cast de TypeScript en el llamador es solo documental — esta línea es
    // la que efectivamente lo rechaza (400) antes de tocar Supabase o la BD.
    return RegistrarDuenoSchema.parse(input);
  }

  protected async autorizar(dato: RegistrarDuenoDto): Promise<void> {
    const yaRegistrado = await this.repositorioUsuarios.existePorEmailActivo(dato.email);
    if (yaRegistrado) {
      throw new EmailYaRegistradoError();
    }
  }

  protected async persistir(dato: RegistrarDuenoDto): Promise<UsuarioRegistrado> {
    const credenciales = await this.proveedorAutenticacion.registrarCredenciales({
      email: dato.email,
      password: dato.password,
    });

    try {
      const usuario = Usuario.registrarDueño(credenciales.id, dato.email);
      const usuarioCreado = await this.repositorioUsuarios.crear(usuario);
      return { id: usuarioCreado.id, email: usuarioCreado.email, rolId: usuarioCreado.rolId };
    } catch (error) {
      await this.revertirAltaEnSupabase(credenciales.id);

      if (this.esConflictoDeEmailEnBaseDeDatos(error)) {
        throw new EmailYaRegistradoError();
      }
      throw error;
    }
  }

  /**
   * Compensación (no hay transacción real posible entre Supabase Auth y
   * Postgres, son dos sistemas distintos): si el insert local falla después
   * de crear las credenciales, se revierte el alta para no dejar una cuenta
   * huérfana en Supabase Auth sin fila correspondiente en `usuarios`.
   */
  private async revertirAltaEnSupabase(usuarioId: string): Promise<void> {
    try {
      await this.proveedorAutenticacion.eliminarCredenciales(usuarioId);
    } catch (errorRollback) {
      logger.error(
        { err: errorRollback, usuarioId },
        'No se pudo revertir el alta en Supabase Auth tras un error de persistencia',
      );
    }
  }

  private esConflictoDeEmailEnBaseDeDatos(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
