import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import {
  PublicarFichaAdopcionSchema,
  type ComandoPublicarFichaAdopcion,
  type FichaAdopcionDto,
} from '@aplicacion/dtos/municipio/FichaAdopcionDto';
import type { IRepositorioFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { SoloMunicipioAdministraEventosError } from '@dominio/errores/erroresMunicipio';
import { logger } from '@infraestructura/logging/logger';

const ROLES_AUTORIZADOS = ['municipio', 'administrador'];

/** Payload crudo del panel de adopciones + quién publica, resuelto por el route handler desde la sesión. */
export interface EntradaPublicarFichaAdopcion {
  datosCrudos: unknown;
  municipioId: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast — `nombreAnimal`/
 * `especie`/`fotoUrl` obligatorios, Paso 2) → autorizar (rol municipio/
 * administrador, PEA-MUN-005 en caso contrario — mismo criterio que la
 * propia RLS `vitrina_crud_municipio`, docs/ROLES.md) → persistir (insert en
 * `vitrina_adopcion` con `municipio_id = usuario_actual()`, estado inicial
 * `'disponible'` por DEFAULT de columna) → publicarEvento (Observer: loguea
 * `FichaAdopcionPublicada`).
 */
@injectable()
export class PublicarFichaAdopcion extends CasoDeUsoBase<EntradaPublicarFichaAdopcion, FichaAdopcionDto, ComandoPublicarFichaAdopcion> {
  constructor(
    @inject('IRepositorioFichasAdopcion') private readonly repositorioFichas: IRepositorioFichasAdopcion,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaPublicarFichaAdopcion): ComandoPublicarFichaAdopcion {
    const datos = PublicarFichaAdopcionSchema.parse(input.datosCrudos);
    return { ...datos, municipioId: input.municipioId };
  }

  protected async autorizar(dato: ComandoPublicarFichaAdopcion): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.municipioId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new SoloMunicipioAdministraEventosError();
    }
  }

  protected async persistir(dato: ComandoPublicarFichaAdopcion): Promise<FichaAdopcionDto> {
    const ficha = await this.repositorioFichas.crear({
      municipioId: dato.municipioId,
      nombreAnimal: dato.nombreAnimal,
      especie: dato.especie,
      edadAproximada: dato.edadAproximada ?? null,
      tamano: dato.tamano ?? null,
      temperamento: dato.temperamento ?? null,
      estadoSalud: dato.estadoSalud ?? null,
      requisitosAdopcion: dato.requisitosAdopcion ?? null,
      fotoUrl: dato.fotoUrl,
    });

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

  protected override async publicarEvento(resultado: FichaAdopcionDto): Promise<void> {
    logger.info(
      { evento: 'FichaAdopcionPublicada', fichaId: resultado.id, municipioId: resultado.municipioId },
      'Evento de dominio publicado',
    );
  }
}
