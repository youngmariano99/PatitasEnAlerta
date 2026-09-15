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
import { SoloMunicipioUOrganizacionPublicaFichaError } from '@dominio/errores/erroresMunicipio';
import { logger } from '@infraestructura/logging/logger';

const ROLES_AUTORIZADOS = ['municipio', 'organizacion'];

/** Payload crudo del panel de adopciones + quién publica, resuelto por el route handler desde la sesión. */
export interface EntradaPublicarFichaAdopcion {
  datosCrudos: unknown;
  municipioId: string;
}

/**
 * Template Method (CasoDeUsoBase): validar (Zod, fail-fast — `nombreAnimal`/
 * `especie`/`fotoUrl` obligatorios, resto opcional) → autorizar (rol
 * municipio/organizacion, PEA-MUN-009 en caso contrario — Módulo 9,
 * "Extensión de PublicarFichaAdopcion con columnas de compatibilidad", Paso
 * 2; docs/REQUISITOS.md Módulo 9 habilita a "Municipio / Organización" a
 * publicar fichas con atributos estructurados, reemplazando el
 * `['municipio','administrador']` del MVP — `administrador` solo tiene
 * `R(t)` sobre `vitrina_adopcion` en docs/ROLES.md, nunca alta directa) →
 * persistir (insert en `vitrina_adopcion` con `municipio_id =
 * usuario_actual()`, estado inicial `'disponible'` por DEFAULT de columna)
 * → publicarEvento (Observer: loguea `FichaAdopcionPublicada`).
 *
 * Paso 1/3 del ticket: `nivelEnergia`/`compatibleNinos`/
 * `compatibleOtrosAnimales`/`necesidadesMedicasDetalle` son opcionales — una
 * ficha sin ellos se publica exactamente igual que en el MVP (AC explícito:
 * "no bloquean la publicación de fichas del MVP que no los completen") — y
 * quedan disponibles como entrada estructurada para
 * `sugerencias_compatibilidad` (docs/SCHEMA.md, Módulo 9: comparadas contra
 * `cuestionarios_adoptante` por `EstrategiaMatchAdopcion` cuando se
 * implemente el algoritmo de compatibilidad).
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
      throw new SoloMunicipioUOrganizacionPublicaFichaError();
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
      nivelEnergia: dato.nivelEnergia ?? null,
      compatibleNinos: dato.compatibleNinos ?? null,
      compatibleOtrosAnimales: dato.compatibleOtrosAnimales ?? null,
      necesidadesMedicasDetalle: dato.necesidadesMedicasDetalle ?? null,
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
      nivelEnergia: ficha.nivelEnergia,
      compatibleNinos: ficha.compatibleNinos,
      compatibleOtrosAnimales: ficha.compatibleOtrosAnimales,
      necesidadesMedicasDetalle: ficha.necesidadesMedicasDetalle,
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
