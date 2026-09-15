/** Espacios disponibles soportados (docs/SCHEMA.md, CHECK espacio_disponible sobre `cuestionarios_adoptante`). */
export const ESPACIOS_DISPONIBLES_SOPORTADOS = ['departamento', 'casa_patio_pequeño', 'casa_patio_grande'] as const;
export type EspacioDisponible = (typeof ESPACIOS_DISPONIBLES_SOPORTADOS)[number];

/** Fila de `cuestionarios_adoptante` (docs/SCHEMA.md, Módulo 9) — todos los campos de estilo de vida son opcionales, para permitir guardar avance parcial. */
export interface DatosCuestionarioAdoptante {
  horasSoloEstimadas: number | null;
  presenciaNinos: boolean | null;
  espacioDisponible: string | null;
  experienciaPrevia: string | null;
}

export interface CuestionarioAdoptante extends DatosCuestionarioAdoptante {
  id: string;
  usuarioId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Un cuestionario está "completo" cuando sus 4 campos de estilo de vida
 * están declarados — exactamente los que `EstrategiaMatchAdopcion` (Módulo
 * 9, algoritmo de compatibilidad; fuera de alcance de este ticket)
 * necesitará comparar contra los atributos de `vitrina_adopcion`
 * (`nivel_energia`/`compatible_ninos`/`compatible_otros_animales`) para
 * calcular `score_compatibilidad`. `CompletarCuestionarioAdoptante` permite
 * guardar avance parcial (docs/ERRORS.md, "Acción sugerida" de
 * PEA-ADOP-001: "permitir guardar avance parcial") — esta función es la que
 * decide cuándo ese avance ya alcanza para solicitar sugerencias (Paso 3
 * del ticket "CRUD de cuestionarios_adoptante propio del usuario").
 */
export function esCuestionarioCompleto(cuestionario: DatosCuestionarioAdoptante): boolean {
  return (
    cuestionario.horasSoloEstimadas !== null &&
    cuestionario.presenciaNinos !== null &&
    cuestionario.espacioDisponible !== null &&
    cuestionario.experienciaPrevia !== null
  );
}
