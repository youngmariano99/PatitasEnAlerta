import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';
import type { SugerenciaCompatibilidadDto } from '@aplicacion/dtos/adopcion-compatibilidad/SugerenciaCompatibilidadDto';
import { esCuestionarioCompleto } from '@dominio/entidades/CuestionarioAdoptante';
import type { IRepositorioCuestionariosAdoptante } from '@dominio/puertos/IRepositorioCuestionariosAdoptante';
import type { IRepositorioFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioSugerenciasCompatibilidad } from '@dominio/puertos/IRepositorioSugerenciasCompatibilidad';
import type { IEstrategiaCompatibilidad } from '@dominio/estrategias/EstrategiaCompatibilidad';
import { CuestionarioIncompletoError, CuestionarioNoEncontradoError } from '@dominio/errores/erroresAdopcionCompatibilidad';

/** Tope de candidatos evaluados por generación — mismo tope de listado público que `IRepositorioFichasAdopcion.listarPublico` ya respeta (NFR de Rendimiento). */
const TOPE_CANDIDATOS = 50;

export interface ComandoGenerarSugerenciasCompatibilidad {
  usuarioId: string;
}

/**
 * Template Method (CasoDeUsoBase) — Historia "Sugerencias de compatibilidad
 * de adopción" (Módulo 9, Post-MVP). `autorizar()` es un no-op real:
 * cualquier usuario autenticado puede generar sugerencias sobre su PROPIO
 * cuestionario (docs/ROLES.md, "sugerencias_compatibilidad: dueño R(p)" —
 * generadas por la aplicación, nunca insertadas directo por el usuario
 * final); `usuarioId` sale siempre de la sesión.
 *
 * `persistir()` (Paso 2 del ticket): resuelve el cuestionario propio (404
 * PEA-ADOP-003 si nunca completó uno) y exige que esté completo (400
 * PEA-ADOP-001 si no — la regla `esCuestionarioCompleto`, ya definida por el
 * ticket anterior "CRUD de cuestionarios_adoptante propio del usuario", se
 * consume acá por primera vez), lista las fichas activas en
 * `vitrina_adopcion.estado='disponible'` (AC explícito: un animal que dejó
 * de estar disponible nunca vuelve a sugerirse — al re-generar, simplemente
 * ya no aparece entre los candidatos, sin necesidad de borrar sugerencias
 * previas: la tabla es un registro auditable INSERT-only, docs/SCHEMA.md),
 * y para cada candidato invoca la estrategia inyectada
 * (`IEstrategiaCompatibilidad`, Paso 1/3 — este caso de uso nunca importa
 * `CompatibilidadPorReglas` ni ninguna otra implementación concreta,
 * `metodo` sale de `estrategiaCompatibilidad.metodo`) e inserta la fila
 * resultante en `sugerencias_compatibilidad`.
 */
@injectable()
export class GenerarSugerenciasCompatibilidad extends CasoDeUsoBase<
  ComandoGenerarSugerenciasCompatibilidad,
  SugerenciaCompatibilidadDto[]
> {
  constructor(
    @inject('IRepositorioCuestionariosAdoptante') private readonly repositorioCuestionarios: IRepositorioCuestionariosAdoptante,
    @inject('IRepositorioFichasAdopcion') private readonly repositorioFichas: IRepositorioFichasAdopcion,
    @inject('IRepositorioSugerenciasCompatibilidad') private readonly repositorioSugerencias: IRepositorioSugerenciasCompatibilidad,
    @inject('IEstrategiaCompatibilidad') private readonly estrategiaCompatibilidad: IEstrategiaCompatibilidad,
  ) {
    super();
  }

  protected validar(input: ComandoGenerarSugerenciasCompatibilidad): ComandoGenerarSugerenciasCompatibilidad {
    return input;
  }

  protected async autorizar(): Promise<void> {
    // Sin restricción de rol: cualquier usuario autenticado genera
    // sugerencias sobre su propio cuestionario.
  }

  protected async persistir(dato: ComandoGenerarSugerenciasCompatibilidad): Promise<SugerenciaCompatibilidadDto[]> {
    const cuestionario = await this.repositorioCuestionarios.obtenerPropio(dato.usuarioId);
    if (!cuestionario) {
      throw new CuestionarioNoEncontradoError();
    }
    if (!esCuestionarioCompleto(cuestionario)) {
      throw new CuestionarioIncompletoError();
    }

    // `listarPublico` ya filtra exclusivamente `estado='disponible'`
    // (ListarVitrinaAdopcionPublico.ts) — un animal adoptado/de baja nunca
    // llega a evaluarse como candidato.
    const { items: candidatos } = await this.repositorioFichas.listarPublico(1, TOPE_CANDIDATOS);

    const sugerencias: SugerenciaCompatibilidadDto[] = [];
    for (const ficha of candidatos) {
      const score = this.estrategiaCompatibilidad.calcularScore(cuestionario, {
        nivelEnergia: ficha.nivelEnergia,
        compatibleNinos: ficha.compatibleNinos,
        compatibleOtrosAnimales: ficha.compatibleOtrosAnimales,
      });

      const sugerencia = await this.repositorioSugerencias.crear({
        cuestionarioId: cuestionario.id,
        vitrinaAdopcionId: ficha.id,
        scoreCompatibilidad: score,
        metodo: this.estrategiaCompatibilidad.metodo,
      });

      sugerencias.push({
        id: sugerencia.id,
        vitrinaAdopcionId: sugerencia.vitrinaAdopcionId,
        scoreCompatibilidad: sugerencia.scoreCompatibilidad,
        metodo: this.estrategiaCompatibilidad.metodo,
      });
    }

    return sugerencias;
  }
}
