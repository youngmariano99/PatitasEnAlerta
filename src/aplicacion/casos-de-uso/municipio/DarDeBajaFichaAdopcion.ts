import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { ComandoDarDeBajaFichaAdopcion, FichaAdopcionDto } from '@aplicacion/dtos/municipio/FichaAdopcionDto';
import type { IRepositorioFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { FichaAdopcionNoEncontradaError, SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';

const ROLES_AUTORIZADOS = ['municipio', 'administrador'];

/**
 * Template Method (CasoDeUsoBase): validar (no-op: `id`/`municipioId` ya
 * llegan tipados y verificados desde el route handler) → autorizar (rol
 * municipio/administrador, PEA-MUN-005 en caso contrario) → persistir (la
 * ficha existe — PEA-MUN-008 si no — y recién ahí la baja).
 *
 * Paso 3 del ticket, regla no negociable: la baja NUNCA es un DELETE físico
 * — `IRepositorioFichasAdopcion.darDeBaja` hace
 * `UPDATE vitrina_adopcion SET estado = 'baja'` (CHECK ya vigente en
 * docs/SCHEMA.md), la fila sigue existiendo para histórico/auditoría.
 */
@injectable()
export class DarDeBajaFichaAdopcion extends CasoDeUsoBase<ComandoDarDeBajaFichaAdopcion, FichaAdopcionDto> {
  constructor(
    @inject('IRepositorioFichasAdopcion') private readonly repositorioFichas: IRepositorioFichasAdopcion,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: ComandoDarDeBajaFichaAdopcion): ComandoDarDeBajaFichaAdopcion {
    return input;
  }

  protected async autorizar(dato: ComandoDarDeBajaFichaAdopcion): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.municipioId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new SoloMunicipioAdministraEventosError();
    }
  }

  protected async persistir(dato: ComandoDarDeBajaFichaAdopcion): Promise<FichaAdopcionDto> {
    const existente = await this.repositorioFichas.buscarPorId(dato.id);
    if (!existente) {
      throw new FichaAdopcionNoEncontradaError();
    }

    const ficha = await this.repositorioFichas.darDeBaja(dato.id);

    return {
      id: ficha.id,
      municipioId: ficha.municipioId,
      nombreAnimal: ficha.nombreAnimal,
      especie: ficha.especie,
      edadAproximada: ficha.edadAproximada,
      tamano: ficha.tamano,
      temperamento: ficha.temperamento,
      estadoSalud: ficha.estadoSalud,
      requisitosAdopcion: ficha.requisitosAdopcion,
      fotoUrl: ficha.fotoUrl,
      estado: ficha.estado,
      createdAt: ficha.createdAt.toISOString(),
    };
  }
}
