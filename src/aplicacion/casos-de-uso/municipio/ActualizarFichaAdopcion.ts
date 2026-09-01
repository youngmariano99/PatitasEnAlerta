import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  ActualizarFichaAdopcionSchema,
  type ComandoActualizarFichaAdopcion,
  type FichaAdopcionDto,
} from '@aplicacion/dtos/municipio/FichaAdopcionDto';
import type { CambiosFichaAdopcion, IRepositorioFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { FichaAdopcionNoEncontradaError, SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';

const ROLES_AUTORIZADOS = ['municipio', 'administrador'];

/** Payload crudo de la edición + el id de la ficha y quién edita, resueltos por el route handler. */
export interface EntradaActualizarFichaAdopcion {
  id: string;
  datosCrudos: unknown;
  municipioId: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (Zod parcial, fail-fast) →
 * autorizar (rol municipio/administrador, PEA-MUN-005 en caso contrario) →
 * persistir (la ficha existe — PEA-MUN-008 si no — y recién ahí el UPDATE de
 * solo los campos provistos; `estado` nunca se toca acá, ver
 * DarDeBajaFichaAdopcion.ts).
 */
@injectable()
export class ActualizarFichaAdopcion extends CasoDeUsoBase<
  EntradaActualizarFichaAdopcion,
  FichaAdopcionDto,
  ComandoActualizarFichaAdopcion
> {
  constructor(
    @inject('IRepositorioFichasAdopcion') private readonly repositorioFichas: IRepositorioFichasAdopcion,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaActualizarFichaAdopcion): ComandoActualizarFichaAdopcion {
    const cambios = ActualizarFichaAdopcionSchema.parse(input.datosCrudos);
    if (Object.keys(cambios).length === 0) {
      throw new PayloadInvalidoError('Especificá al menos un campo para actualizar.');
    }
    return { ...cambios, id: input.id, municipioId: input.municipioId };
  }

  protected async autorizar(dato: ComandoActualizarFichaAdopcion): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.municipioId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new SoloMunicipioAdministraEventosError();
    }
  }

  protected async persistir(dato: ComandoActualizarFichaAdopcion): Promise<FichaAdopcionDto> {
    const existente = await this.repositorioFichas.buscarPorId(dato.id);
    if (!existente) {
      throw new FichaAdopcionNoEncontradaError();
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, municipioId: _municipioId, ...cambios } = dato;
    const cambiosFicha: CambiosFichaAdopcion = cambios;
    const ficha = await this.repositorioFichas.actualizar(dato.id, cambiosFicha);

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
