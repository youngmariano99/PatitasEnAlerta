import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { Prisma } from '@prisma/client';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  RegistrarVeterinarioSchema,
  type RegistrarVeterinarioDto,
  type VeterinarioRegistrado,
} from '@aplicacion/dtos/auth/RegistrarVeterinarioDto';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IRepositorioVeterinarios } from '@dominio/puertos/IRepositorioVeterinarios';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { EmailYaRegistradoError, MatriculaYaRegistradaError } from '@dominio/errores/erroresAutenticacion';
import { logger } from '@infraestructura/logging/logger';

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast) → autorizar
 * (verificar unicidad de email, igual que RegistrarUsuario) → persistir
 * (alta en Supabase Auth + transacción usuarios/perfiles_veterinario/
 * verificaciones, con compensación si esa transacción falla).
 */
@injectable()
export class RegistrarVeterinario extends CasoDeUsoBase<RegistrarVeterinarioDto, VeterinarioRegistrado> {
  constructor(
    @inject('IRepositorioUsuarios') private readonly repositorioUsuarios: IRepositorioUsuarios,
    @inject('IRepositorioVeterinarios') private readonly repositorioVeterinarios: IRepositorioVeterinarios,
    @inject('IProveedorAutenticacion') private readonly proveedorAutenticacion: IProveedorAutenticacion,
  ) {
    super();
  }

  protected validar(input: RegistrarVeterinarioDto): RegistrarVeterinarioDto {
    return RegistrarVeterinarioSchema.parse(input);
  }

  protected async autorizar(dato: RegistrarVeterinarioDto): Promise<void> {
    const emailYaRegistrado = await this.repositorioUsuarios.existePorEmailActivo(dato.email);
    if (emailYaRegistrado) {
      throw new EmailYaRegistradoError();
    }
  }

  protected async persistir(dato: RegistrarVeterinarioDto): Promise<VeterinarioRegistrado> {
    const credenciales = await this.proveedorAutenticacion.registrarCredenciales({
      email: dato.email,
      password: dato.password,
    });

    try {
      const perfil = await this.repositorioVeterinarios.crear({
        id: credenciales.id,
        email: dato.email,
        matricula: dato.matricula,
        colegioEmisor: dato.colegioEmisor,
      });

      return {
        id: perfil.usuarioId,
        email: perfil.email,
        matricula: perfil.matricula,
        colegioEmisor: perfil.colegioEmisor,
        estadoVerificacion: perfil.estadoVerificacion,
      };
    } catch (error) {
      await this.revertirAltaEnSupabase(credenciales.id);

      // El email ya se descartó en autorizar(): cualquier conflicto de
      // unicidad que llegue hasta acá solo puede ser matrícula+colegio
      // emisor (ux_perfiles_veterinario_matricula).
      if (this.esConflictoDeUnicidad(error)) {
        throw new MatriculaYaRegistradaError();
      }
      throw error;
    }
  }

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

  private esConflictoDeUnicidad(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
