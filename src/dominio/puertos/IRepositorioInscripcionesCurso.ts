/** Fila de `inscripciones_curso` (docs/SCHEMA.md, Módulo 8). Sin `deleted_at`: la baja es un DELETE físico, no soft delete. */
export interface InscripcionCurso {
  id: string;
  cursoId: string;
  usuarioId: string;
  inscritoEn: Date;
}

/**
 * Puerto hacia `inscripciones_curso` (Módulo 8, Historia "Inscripción a
 * cursos"). `crear` delega la unicidad exclusivamente en la restricción de
 * base de datos `ux_inscripcion_curso_usuario` — el caso de uso traduce la
 * violación (P2002 de Prisma) a PEA-FORO-001 (Paso 2 del ticket), sin ningún
 * chequeo de aplicación previo — a diferencia de
 * `OfrecerseComoColaboradorCommand`, cuyo índice equivalente todavía no está
 * forzado a nivel de base de datos y por eso sí necesita un pre-check.
 */
export interface IRepositorioInscripcionesCurso {
  crear(cursoId: string, usuarioId: string): Promise<InscripcionCurso>;

  /** DELETE físico condicionado a `cursoId + usuarioId` (la propia sesión, nunca un id ajeno). `false` si ninguna fila matchea. */
  darDeBaja(cursoId: string, usuarioId: string): Promise<boolean>;
}
