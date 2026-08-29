import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { Prisma } from '@prisma/client';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  CrearCuentaMunicipioSchema,
  type ComandoCrearCuentaMunicipio,
  type MunicipioCreado,
} from '@aplicacion/dtos/auth/CrearCuentaMunicipioDto';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IRepositorioMunicipios } from '@dominio/puertos/IRepositorioMunicipios';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { EmailYaRegistradoError, AltaInstitucionalNoAutorizadaError } from '@dominio/errores/erroresAutenticacion';
import { logger } from '@infraestructura/logging/logger';

const ROL_ADMINISTRADOR = 'administrador';

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast) → autorizar
 * (rol_actual() === 'administrador' — PEA-AUTH-011 si no; unicidad de
 * email) → persistir (alta en Supabase Auth + transacción
 * usuarios/perfiles_municipio, con compensación si esa transacción falla).
 *
 * El alta institucional en sí ES la aprobación (a diferencia del
 * veterinario, que queda 'pendiente' hasta una revisión posterior) —
 * `estado_verificacion` queda 'verificado' desde PrismaMunicipioRepositorio,
 * sin fila en `verificaciones`.
 */
@injectable()
export class CrearCuentaMunicipio extends CasoDeUsoBase<ComandoCrearCuentaMunicipio, MunicipioCreado> {
  constructor(
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
    @inject('IRepositorioUsuarios') private readonly repositorioUsuarios: IRepositorioUsuarios,
    @inject('IRepositorioMunicipios') private readonly repositorioMunicipios: IRepositorioMunicipios,
    @inject('IProveedorAutenticacion') private readonly proveedorAutenticacion: IProveedorAutenticacion,
  ) {
    super();
  }

  protected validar(input: ComandoCrearCuentaMunicipio): ComandoCrearCuentaMunicipio {
    const datos = CrearCuentaMunicipioSchema.parse(input);
    return { ...datos, solicitanteId: input.solicitanteId };
  }

  protected async autorizar(dato: ComandoCrearCuentaMunicipio): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.solicitanteId);
    if (!solicitante || solicitante.rol !== ROL_ADMINISTRADOR) {
      throw new AltaInstitucionalNoAutorizadaError();
    }

    const emailYaRegistrado = await this.repositorioUsuarios.existePorEmailActivo(dato.email);
    if (emailYaRegistrado) {
      throw new EmailYaRegistradoError();
    }
  }

  protected async persistir(dato: ComandoCrearCuentaMunicipio): Promise<MunicipioCreado> {
    const credenciales = await this.proveedorAutenticacion.registrarCredenciales({
      email: dato.email,
      password: dato.password,
    });

    try {
      const perfil = await this.repositorioMunicipios.crear({
        id: credenciales.id,
        email: dato.email,
        nombreInstitucional: dato.nombreInstitucional,
      });

      return {
        id: perfil.usuarioId,
        email: perfil.email,
        nombreInstitucional: perfil.nombreInstitucional,
        estadoVerificacion: perfil.estadoVerificacion,
      };
    } catch (error) {
      await this.revertirAltaEnSupabase(credenciales.id);

      // El email ya se descartó en autorizar(): un conflicto de unicidad acá
      // solo puede ser una carrera sobre el mismo email.
      if (this.esConflictoDeUnicidad(error)) {
        throw new EmailYaRegistradoError();
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
