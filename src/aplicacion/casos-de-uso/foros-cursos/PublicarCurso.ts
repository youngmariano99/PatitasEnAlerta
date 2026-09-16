import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import { PublicarCursoSchema, type ComandoPublicarCurso, type CursoDto } from '@aplicacion/dtos/foros-cursos/CursoDto';
import type { Curso, IRepositorioCursos } from '@dominio/puertos/IRepositorioCursos';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { sanitizarDescripcion } from '@infraestructura/seguridad/SanitizadorHtml';

const ROLES_AUTORIZADOS = ['organizacion', 'municipio'];

/** Payload crudo del formulario + quién publica, resuelto por el route handler desde la sesión. */
export interface EntradaPublicarCurso {
  datosCrudos: unknown;
  usuarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Publicación de cursos de
 * tenencia responsable" (Módulo 8, Paso 1: alta restringida a
 * `rol_actual() IN ('organizacion','municipio')`, mismo criterio de chequeo
 * de rol que `PublicarProductoComercio`/`CrearProductoVeterinario`). No hay
 * recurso propio previo que resolver (a diferencia de `comercios`/
 * `productos_veterinario`): cualquier cuenta con uno de los dos roles
 * autorizados puede publicar, sin depender de un estado de verificación
 * adicional — docs/ROLES.md no lo exige para `cursos` (Patrón B, Sección
 * 3.3).
 *
 * `persistir()` sanitiza `descripcion` con DOMPurify (Paso 3) recién ahí,
 * justo antes de persistir — mismo criterio que el resto de los comandos de
 * este proyecto.
 */
@injectable()
export class PublicarCurso extends CasoDeUsoBase<EntradaPublicarCurso, CursoDto, ComandoPublicarCurso> {
  constructor(
    @inject('IRepositorioCursos') private readonly repositorioCursos: IRepositorioCursos,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
  ) {
    super();
  }

  protected validar(input: EntradaPublicarCurso): ComandoPublicarCurso {
    const datos = PublicarCursoSchema.parse(input.datosCrudos);
    return { ...datos, usuarioId: input.usuarioId };
  }

  protected async autorizar(dato: ComandoPublicarCurso): Promise<void> {
    const solicitante = await this.repositorioPerfil.obtenerPerfilPropio(dato.usuarioId);
    if (!solicitante || !ROLES_AUTORIZADOS.includes(solicitante.rol)) {
      throw new AccesoNoAutorizadoError();
    }
  }

  protected async persistir(dato: ComandoPublicarCurso): Promise<CursoDto> {
    const curso = await this.repositorioCursos.crear(dato.usuarioId, {
      titulo: dato.titulo,
      descripcion: sanitizarDescripcion(dato.descripcion) ?? '',
      contenidoUrl: dato.contenidoUrl,
    });

    return this.aDto(curso);
  }

  private aDto(curso: Curso): CursoDto {
    return {
      id: curso.id,
      publicadoPor: curso.publicadoPor,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      contenidoUrl: curso.contenidoUrl,
      createdAt: curso.createdAt.toISOString(),
    };
  }
}
