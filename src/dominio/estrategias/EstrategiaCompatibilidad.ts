import type { DatosCuestionarioAdoptante } from '@dominio/entidades/CuestionarioAdoptante';

/** Métodos soportados (docs/SCHEMA.md, CHECK metodo sobre `sugerencias_compatibilidad`). */
export const METODOS_COMPATIBILIDAD_SOPORTADOS = ['reglas', 'semantico', 'llm'] as const;
export type MetodoCompatibilidad = (typeof METODOS_COMPATIBILIDAD_SOPORTADOS)[number];

/** Atributos de compatibilidad de una ficha candidata (`vitrina_adopcion`, columnas Post-MVP Módulo 9) — el subconjunto que cualquier estrategia necesita para puntuar. */
export interface AtributosCompatibilidadFicha {
  nivelEnergia: string | null;
  compatibleNinos: boolean | null;
  compatibleOtrosAnimales: boolean | null;
}

/**
 * Strategy (GoF) — Historia "Sugerencias de compatibilidad de adopción"
 * (Módulo 9, Post-MVP). `GenerarSugerenciasCompatibilidad.ts` depende
 * únicamente de esta abstracción: la implementación activa se resuelve por
 * configuración de `contenedor-di.ts` (Paso 3 del ticket, AC explícito —
 * "sin que el caso de uso conozca ni dependa de la estrategia concreta en
 * uso"), mismo criterio de intercambio por configuración que
 * `IGeneradorEmbeddings`/`OpenAIGeneradorEmbeddings`. `metodo` queda
 * grabado en cada fila de `sugerencias_compatibilidad` (docs/SCHEMA.md) para
 * poder comparar la efectividad de cada estrategia sin perder el histórico
 * al migrar de `reglas` a `semantico`/`llm`.
 */
export interface IEstrategiaCompatibilidad {
  readonly metodo: MetodoCompatibilidad;
  /** Score de compatibilidad entre 0 y 1 (docs/SCHEMA.md, `score_compatibilidad NUMERIC(5,4)`). */
  calcularScore(
    cuestionario: DatosCuestionarioAdoptante,
    ficha: AtributosCompatibilidadFicha,
  ): number;
}

/**
 * Implementación inicial (Paso 1 del ticket): compara campo a campo, sin
 * ningún modelo de lenguaje ni embeddings — cada criterio evaluado suma una
 * fracción igual del score total si coincide. Deliberadamente simple
 * (Sección 7 del proyecto): es la primera de tres implementaciones
 * previstas (`CompatibilidadSemantica`/`CompatibilidadLLM`, fuera de
 * alcance de esta actividad), y su única responsabilidad es fijar el
 * contrato de `IEstrategiaCompatibilidad` con un cálculo verificable.
 *
 * Criterios evaluados (los únicos con un dato comparable real en ambos
 * lados — `espacioDisponible`/`experienciaPrevia` del cuestionario no
 * tienen contraparte estructurada en `vitrina_adopcion`, así que no
 * participan del score):
 * - `presenciaNinos`: si el adoptante declaró niños en casa, exige
 *   `compatibleNinos=true` en la ficha; sin niños, cualquier ficha coincide
 *   por esta dimensión (no la descarta).
 * - `horasSoloEstimadas`: más de 6 horas solo exige `nivelEnergia='bajo'`
 *   (mascotas menos exigentes de compañía activa); entre 2 y 6, admite
 *   `'bajo'` o `'medio'`; 2 horas o menos no restringe por energía.
 * - Un dato no declarado (`null`) en cualquiera de los dos lados no
 *   penaliza — se cuenta como coincidencia, no como fallo.
 */
export class CompatibilidadPorReglas implements IEstrategiaCompatibilidad {
  readonly metodo = 'reglas' as const;

  calcularScore(
    cuestionario: DatosCuestionarioAdoptante,
    ficha: AtributosCompatibilidadFicha,
  ): number {
    const criterios = [
      this.coincideNinos(cuestionario.presenciaNinos, ficha.compatibleNinos),
      this.coincideEnergia(cuestionario.horasSoloEstimadas, ficha.nivelEnergia),
    ];

    const coincidencias = criterios.filter(Boolean).length;
    return coincidencias / criterios.length;
  }

  private coincideNinos(presenciaNinos: boolean | null, compatibleNinos: boolean | null): boolean {
    if (presenciaNinos !== true) return true;
    return compatibleNinos === true;
  }

  private coincideEnergia(horasSoloEstimadas: number | null, nivelEnergia: string | null): boolean {
    if (horasSoloEstimadas === null || nivelEnergia === null) return true;
    if (horasSoloEstimadas > 6) return nivelEnergia === 'bajo';
    if (horasSoloEstimadas > 2) return nivelEnergia === 'bajo' || nivelEnergia === 'medio';
    return true;
  }
}
