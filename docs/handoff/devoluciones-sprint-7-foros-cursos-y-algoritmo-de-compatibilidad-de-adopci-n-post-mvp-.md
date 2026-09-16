# Handoffs y Entregables del Sprint - Sprint 7: Foros, Cursos y Algoritmo de Compatibilidad de Adopción (Post-MVP)

**Objetivo:** Completar la visión de ecosistema con contenido educativo para dueños de mascotas y el motor inicial de sugerencias de compatibilidad de adopción.
**Capacidad:** 40 Ptos | **Duración:** 1 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## HU: Publicación de cursos de tenencia responsable
*Criterios de Aceptación/Descripción:*
```text
Como organización o municipio quiero publicar cursos de tenencia responsable y cuidado de mascotas para educar a la comunidad de tutores.
```

### [COMPLETADA] CRUD de cursos restringido a Organización/Municipio
- **Rol:** Backend Developer
- **Componente/Ruta:** `PublicarCurso.ts` (src/aplicacion/casos-de-uso/foros-cursos/PublicarCurso.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
PublicarCurso.ts sigue el Template Method de CasoDeUsoBase (mismo esqueleto que PublicarProductoComercio.ts): validar() parsea con Zod (contenidoUrl como z.string().url() nullable/opcional), autorizar() resuelve el perfil vía IRepositorioPerfil y exige rol 'organizacion' o 'municipio' (lanza AccesoNoAutorizadoError / PEA-SIS-002 en cualquier otro caso, reutilizado — sin código nuevo de error), persistir() sanitiza descripcion con DOMPurify (sanitizarDescripcion) y llama a IRepositorioCursos.crear(). A diferencia de PublicarProductoComercio, no hay recurso propio previo que resolver (comercio/comercio_id): cualquier cuenta con uno de los dos roles autorizados publica directamente, sin dependencia de un estado de verificación adicional (docs/ROLES.md, Patrón B). El puerto IRepositorioCursos y su adaptador Prisma (PrismaCursosRepositorio) son nuevos — el modelo Prisma `Curso` ya existía en el schema. Ruta nueva /api/foros-cursos/cursos (POST) registrada, siguiendo el mismo formato de manejo de errores (ZodError → PayloadInvalidoError/400, ErrorDominio → su propio código/status, resto → PEA-SIS-003/500) que el resto de endpoints del proyecto.

**Archivos Modificados:**
- `src/dominio/puertos/IRepositorioCursos.ts`
- `src/infraestructura/adaptadores/PrismaCursosRepositorio.ts`
- `src/aplicacion/dtos/foros-cursos/CursoDto.ts`
- `src/aplicacion/casos-de-uso/foros-cursos/PublicarCurso.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/foros-cursos/cursos/route.ts`
- `tests/unit/PublicarCurso.test.ts`
- `tests/integration/cursos.publicar.test.ts`
- `docs/pruebas_testeos/21_PublicacionCursos_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**
- `POST /api/foros-cursos/cursos — body { titulo, descripcion, contenidoUrl? } → 201 CursoDto`
- `class PublicarCurso extends CasoDeUsoBase<EntradaPublicarCurso, CursoDto, ComandoPublicarCurso>`
- `interface IRepositorioCursos { crear(publicadoPor: string, datos: DatosCurso): Promise<Curso> }`
- `PublicarCursoSchema (Zod, OpenAPI 'PublicarCursoDto')`


--- 

## HU: Publicación de contenido educativo en el foro
*Criterios de Aceptación/Descripción:*
```text
Como organización o municipio quiero publicar contenido educativo dentro de un foro moderado para acompañar a la comunidad con información confiable.
```

### [COMPLETADA] Caso de uso CrearTemaForo con moderación de Administrador
- **Rol:** Backend Developer
- **Componente/Ruta:** `ModerarTemaCommand.ts` (src/aplicacion/casos-de-uso/foros-cursos/ModerarTemaCommand.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
Tres casos de uso Template Method sobre temas_foro. CrearTemaForo.ts: sin restricción de rol (docs/ROLES.md, Módulo 8 — cualquier autenticado), autorizar() no-op documentado (mismo criterio que CrearReporte), validar() mapea titulo/contenido vacíos a PEA-FORO-003 vía el patrón aErrorDeNegocio ya establecido en ConfigurarDisponibilidad.ts, persistir() sanitiza ambos campos con DOMPurify. ModerarTemaCommand.ts (archivo objetivo del ticket): autorizar() exige rol_actual()='administrador' vía IRepositorioPerfil; persistir() hace UPDATE condicionado (id + deletedAt IS NULL) sin lectura previa, mismo criterio 'nunca confiar en una lectura previa' que DarDeBajaProductoComercio — 404/PEA-FORO-002 si no matchea ninguna fila. EditarTemaForo.ts (no listado como archivo destino, pero requerido por el AC explícito del Paso 3): validar() hace la única lectura vía obtenerActual() (404/PEA-FORO-002 si el id nunca existió); autorizar() compara primero pertenencia (403/PEA-SIS-002) y luego el flag moderado (403/PEA-FORO-004) — en ese orden, para no revelar el estado de moderación de un tema ajeno; persistir() hace el UPDATE condicionado por id+creadoPor+deletedAt IS NULL como última palabra, relanzando PEA-FORO-004 si hubo carrera. IRepositorioTemasForo.obtenerActual() es deliberadamente distinto de los demás obtenerActual() del proyecto: incluye filas soft-deleted (campo moderado: boolean) porque acá 'borrado' no siempre significa 'no encontrado' — es exactamente la distinción que pide el AC del Paso 3.

**Archivos Modificados:**
- `src/dominio/errores/erroresForosCursos.ts`
- `src/dominio/puertos/IRepositorioTemasForo.ts`
- `src/infraestructura/adaptadores/PrismaTemasForoRepositorio.ts`
- `src/aplicacion/dtos/foros-cursos/TemaForoDto.ts`
- `src/aplicacion/casos-de-uso/foros-cursos/CrearTemaForo.ts`
- `src/aplicacion/casos-de-uso/foros-cursos/EditarTemaForo.ts`
- `src/aplicacion/casos-de-uso/foros-cursos/ModerarTemaCommand.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/foros-cursos/temas/route.ts`
- `app/api/foros-cursos/temas/[id]/route.ts`
- `app/api/foros-cursos/temas/[id]/moderar/route.ts`
- `tests/unit/CrearTemaForo.test.ts`
- `tests/unit/EditarTemaForo.test.ts`
- `tests/unit/ModerarTemaCommand.test.ts`
- `tests/integration/temasForo.moderar.test.ts`
- `docs/pruebas_testeos/22_ModeracionTemasForo_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**
- `POST /api/foros-cursos/temas — body { titulo, contenido } → 201 TemaForoDto`
- `PATCH /api/foros-cursos/temas/{id} — body { titulo, contenido } → 200 TemaForoDto | 403 PEA-FORO-004 si moderado`
- `POST /api/foros-cursos/temas/{id}/moderar — exclusivo administrador → 200 { id }`
- `class CrearTemaForo / EditarTemaForo / ModerarTemaCommand extends CasoDeUsoBase`
- `interface IRepositorioTemasForo { crear, obtenerActual, actualizar, moderar }`


--- 

## HU: Consulta del foro de bienestar animal
*Criterios de Aceptación/Descripción:*
```text
Como dueño de mascota quiero consultar el foro y resolver dudas sobre el bienestar de mi mascota para encontrar respuestas confiables en un solo lugar.
```

### [COMPLETADA] Endpoint paginado de temas_foro y respuestas_foro
- **Rol:** Backend Developer
- **Componente/Ruta:** `ListarForo.ts` (src/aplicacion/casos-de-uso/foros-cursos/ListarForo.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
ListarForo.ts sigue el patrón de ListarReportes/ListarSolicitudesVeterinarias: validar() clampea pagina/porPagina (tope 50) con defensa en profundidad sobre el Schema Zod (que ya lo clampea con .catch()); autorizar() no-op documentado (sin restricción de rol, solo exige sesión — verificada en el route handler antes de invocar el caso de uso); persistir() delega en IRepositorioTemasForo.listar(), que filtra deletedAt IS NULL (un tema moderado no aparece en el listado público) y ordena por createdAt descendente. ListarRespuestasForo.ts (no nombrado literalmente en el ticket, agregado por necesidad de tipo de retorno distinto) valida el temaId como UUID, sin verificar existencia del tema (un id inexistente devuelve lista vacía, mismo resultado observable que un tema sin respuestas — no hay AC que pida distinguirlos); persistir() usa IRepositorioTemasForo.listarRespuestas(), que filtra por temaId + deletedAt IS NULL vía ix_respuestas_tema, ordenado por createdAt ascendente (orden cronológico de un hilo). El GET se agregó al route.ts existente de /api/foros-cursos/temas (ya tenía POST del ticket anterior) y un nuevo route.ts anidado para /respuestas, mismo patrón que app/api/red-colaboracion/solicitudes/[id]/colaboraciones. Fix de seguridad: se agregó '/api/foros-cursos' a RUTAS_API_PROTEGIDAS en middleware.ts — el ticket anterior había creado tres endpoints (POST temas, PATCH temas/[id], POST temas/[id]/moderar) que dependían únicamente del chequeo obtenerUsuarioAutenticado() dentro de cada route handler, sin la capa de middleware exigida por CLAUDE.md como defensa en profundidad anti-IDOR/BOLA. Se sumó un caso a middleware.expiracionSesion.test.ts que ya cubre ese patrón para el resto de prefijos protegidos.

**Archivos Modificados:**
- `src/dominio/puertos/IRepositorioTemasForo.ts`
- `src/infraestructura/adaptadores/PrismaTemasForoRepositorio.ts`
- `src/aplicacion/dtos/foros-cursos/ListarForoDto.ts`
- `src/aplicacion/casos-de-uso/foros-cursos/ListarForo.ts`
- `src/aplicacion/casos-de-uso/foros-cursos/ListarRespuestasForo.ts`
- `app/api/foros-cursos/temas/route.ts`
- `app/api/foros-cursos/temas/[id]/respuestas/route.ts`
- `middleware.ts`
- `tests/integration/middleware.expiracionSesion.test.ts`
- `tests/integration/temasForo.moderar.test.ts`
- `tests/unit/CrearTemaForo.test.ts`
- `tests/unit/EditarTemaForo.test.ts`
- `tests/unit/ModerarTemaCommand.test.ts`
- `tests/unit/ListarForo.test.ts`
- `tests/unit/ListarRespuestasForo.test.ts`
- `tests/integration/foro.listar.test.ts`
- `docs/pruebas_testeos/23_ListadoForoPaginado_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `docs/DECISIONES.md`

**Contratos y API signatures:**
- `GET /api/foros-cursos/temas?pagina&porPagina — 200 { items, total, pagina, porPagina } (tope 50)`
- `GET /api/foros-cursos/temas/{id}/respuestas — 200 RespuestaForoListado[]`
- `class ListarForo / ListarRespuestasForo extends CasoDeUsoBase`
- `IRepositorioTemasForo.listar(pagina, porPagina) / listarRespuestas(temaId)`


--- 

## HU: Inscripción a cursos
*Criterios de Aceptación/Descripción:*
```text
Como dueño de mascota quiero inscribirme a cursos publicados por organizaciones o el municipio para aprender más sobre el cuidado de mi mascota.
```

### [COMPLETADA] Caso de uso InscribirseCurso con restricción de unicidad
- **Rol:** Backend Developer
- **Componente/Ruta:** `InscribirseCurso.ts` (src/aplicacion/casos-de-uso/foros-cursos/InscribirseCurso.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
InscribirseCurso.ts: validar() solo exige cursoId UUID (del path); autorizar() no-op documentado (sin restricción de rol, docs/ROLES.md — Cualquier autenticado: CRD(p) sobre inscripciones_curso); persistir() es el único punto de verdad — intenta el INSERT directo y traduce P2002 (Prisma.PrismaClientKnownRequestError.code) a YaInscriptoEnCursoError (409/PEA-FORO-001) y P2003 a TemaForoNoEncontradoError (404/PEA-FORO-002, reutilizada de un ticket anterior de este mismo módulo — su mensaje 'No encontramos ese curso o esa publicación' ya cubre ambos casos semánticamente, y el catálogo de ERRORS.md prohíbe inventar códigos nuevos). DarDeBajaInscripcionCurso.ts hace un DELETE físico (la tabla no tiene deleted_at) condicionado a cursoId+usuarioId de la sesión — sin necesidad de un chequeo de pertenencia aparte, porque el usuarioId nunca sale del cliente. Ambos casos de uso comparten el esquema Zod ParametrosInscripcionSchema (solo cursoId) vía InscripcionCursoDto.ts. Ruta anidada nueva /api/foros-cursos/cursos/{id}/inscripciones (POST/DELETE), ya cubierta por RUTAS_API_PROTEGIDAS (agregado en el ticket anterior de este módulo, prefijo /api/foros-cursos).

**Archivos Modificados:**
- `src/dominio/puertos/IRepositorioInscripcionesCurso.ts`
- `src/infraestructura/adaptadores/PrismaInscripcionesCursoRepositorio.ts`
- `src/aplicacion/dtos/foros-cursos/InscripcionCursoDto.ts`
- `src/aplicacion/casos-de-uso/foros-cursos/InscribirseCurso.ts`
- `src/aplicacion/casos-de-uso/foros-cursos/DarDeBajaInscripcionCurso.ts`
- `src/dominio/errores/erroresForosCursos.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/foros-cursos/cursos/[id]/inscripciones/route.ts`
- `tests/unit/InscribirseCurso.test.ts`
- `tests/unit/DarDeBajaInscripcionCurso.test.ts`
- `tests/integration/cursos.inscripciones.test.ts`
- `docs/pruebas_testeos/24_InscripcionACursos_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `docs/DECISIONES.md`

**Contratos y API signatures:**
- `POST /api/foros-cursos/cursos/{id}/inscripciones — 201 InscripcionCursoDto | 409 PEA-FORO-001 | 404 PEA-FORO-002`
- `DELETE /api/foros-cursos/cursos/{id}/inscripciones — 200 { cursoId } | 404 PEA-FORO-002`
- `class InscribirseCurso / DarDeBajaInscripcionCurso extends CasoDeUsoBase`
- `IRepositorioInscripcionesCurso.crear(cursoId, usuarioId) / darDeBaja(cursoId, usuarioId)`
- `class YaInscriptoEnCursoError (PEA-FORO-001)`


--- 

## HU: Publicación de ficha de adopción con atributos de compatibilidad
*Criterios de Aceptación/Descripción:*
```text
Como municipio u organización quiero publicar una ficha de adopción con atributos estructurados de temperamento y compatibilidad para alimentar el algoritmo de sugerencias.
```

### [COMPLETADA] Extensión de PublicarFichaAdopcion con columnas de compatibilidad (Módulo 9)
- **Rol:** Backend Developer
- **Componente/Ruta:** `PublicarFichaAdopcion.ts` (src/aplicacion/casos-de-uso/municipio/PublicarFichaAdopcion.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
PublicarFichaAdopcion.ts: ROLES_AUTORIZADOS pasa de ['municipio','administrador'] a ['municipio','organizacion'] (AC literal del ticket), lanzando la nueva SoloMunicipioUOrganizacionPublicaFichaError (PEA-MUN-009) en vez de la compartida SoloMunicipioAdministraEventosError (PEA-MUN-005, que sigue vigente sin cambios para ActualizarFichaAdopcion/DarDeBajaFichaAdopcion/CrearEvento/ObtenerDashboardMunicipal — ninguno de esos cuatro casos de uso fue tocado). Los 4 campos nuevos (nivelEnergia: enum ['bajo','medio','alto'] vía NIVELES_ENERGIA_SOPORTADOS, compatibleNinos/compatibleOtrosAnimales: boolean, necesidadesMedicasDetalle: texto opcional vía opcionalDeTexto) se agregaron a PublicarFichaAdopcionSchema — ActualizarFichaAdopcionSchema los hereda automáticamente por ser un .partial() del mismo schema, así que ActualizarFichaAdopcion.ts no necesitó cambios de lógica (su persistir() ya hace spread genérico de 'cambios' hacia el repositorio), solo el mapeo de salida al nuevo shape del DTO. La cadena completa (entidad FichaAdopcion, IRepositorioFichasAdopcion, PrismaFichaAdopcionRepositorio) se extendió porque PublicarFichaAdopcion.persistir() depende de ella — un caso de uso sin esa cadena actualizada no compila ni persiste los campos nuevos. Se actualizó docs/ROLES.md (organizacion gana C(p) sobre vitrina_adopcion, nota explicativa) y docs/SEED.md (bloque existente de 60 vitrina_adopcion, agregadas las 4 columnas de compatibilidad completas en ~50% de las filas vía random() < 0.5, resto NULL a propósito).

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/municipio/PublicarFichaAdopcion.ts`
- `src/aplicacion/casos-de-uso/municipio/ActualizarFichaAdopcion.ts`
- `src/aplicacion/casos-de-uso/municipio/DarDeBajaFichaAdopcion.ts`
- `src/aplicacion/dtos/municipio/FichaAdopcionDto.ts`
- `src/dominio/entidades/FichaAdopcion.ts`
- `src/dominio/puertos/IRepositorioFichasAdopcion.ts`
- `src/dominio/errores/erroresMunicipio.ts`
- `src/infraestructura/adaptadores/PrismaFichaAdopcionRepositorio.ts`
- `tests/unit/PublicarFichaAdopcion.test.ts`
- `tests/unit/ActualizarFichaAdopcion.test.ts`
- `tests/unit/DarDeBajaFichaAdopcion.test.ts`
- `tests/unit/ListarVitrinaAdopcionPublico.test.ts`
- `tests/unit/PrismaFichaAdopcionRepositorio.test.ts`
- `tests/integration/municipio.adopciones.test.ts`
- `tests/integration/adopciones.listarPublico.test.ts`
- `docs/ERRORS.md`
- `docs/ROLES.md`
- `docs/SEED.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/16_FichaAdopcionAtributosCompatibilidad_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**
- `POST /api/municipio/adopciones — body admite ahora nivelEnergia?/compatibleNinos?/compatibleOtrosAnimales?/necesidadesMedicasDetalle? → 201 FichaAdopcion (incluye los 4 campos) | 403 PEA-MUN-009`
- `class SoloMunicipioUOrganizacionPublicaFichaError (PEA-MUN-009, 403)`
- `IRepositorioFichasAdopcion.crear/actualizar — DatosNuevaFichaAdopcion/CambiosFichaAdopcion incluyen los 4 campos nullable`
- `FichaAdopcion.reconstruir — firma extendida con nivelEnergia/compatibleNinos/compatibleOtrosAnimales/necesidadesMedicasDetalle`


--- 

## HU: Cuestionario de estilo de vida del adoptante
*Criterios de Aceptación/Descripción:*
```text
Como adoptante potencial quiero completar un cuestionario sobre mi estilo de vida y entorno para recibir sugerencias de animales realmente compatibles conmigo.
```

### [COMPLETADA] CRUD de cuestionarios_adoptante propio del usuario
- **Rol:** Backend Developer
- **Componente/Ruta:** `CompletarCuestionarioAdoptante.ts` (src/aplicacion/casos-de-uso/adopcion-compatibilidad/CompletarCuestionarioAdoptante.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
CompletarCuestionarioAdoptante.ts: validar() parsea con Zod (espacioDisponible restringido a ESPACIOS_DISPONIBLES_SOPORTADOS = ['departamento','casa_patio_pequeño','casa_patio_grande'], todos los campos opcionales/nullable — permite guardar avance parcial); autorizar() no-op documentado (cualquier autenticado, docs/ROLES.md 'dueño (adoptante): CRUD(p)'); persistir() resuelve un upsert: obtenerPropio(usuarioId) primero, luego actualizar() o crear() según exista — mismo patrón que ConfigurarDisponibilidad/IRepositorioDisponibilidad. El AC 'solo puede acceder al propio' se cumple por construcción arquitectónica: usuarioId sale siempre de la sesión (nunca de un id en el body/URL), nunca hay forma de tocar el cuestionario de otro usuario. Paso 3 (PEA-ADOP-001 al solicitar sugerencias incompletas) se implementó como la función pura esCuestionarioCompleto() en @dominio/entidades/CuestionarioAdoptante.ts — true solo si los 4 campos de estilo de vida están declarados — más el error CuestionarioIncompletoError ya catalogado; deliberadamente NO se construyó el endpoint real de 'solicitar sugerencias' (requiere EstrategiaMatchAdopcion, el algoritmo de compatibilidad Strategy reglas/semántico/LLM, que no existe todavía y no es parte de este ticket) — se verificó con test unitario directo sobre la función. ObtenerCuestionarioPropio.ts (GET) se agregó porque el AC #3 menciona explícitamente la acción de 'consultar', que no tenía ningún caso de uso hasta ahora.

**Archivos Modificados:**
- `src/dominio/entidades/CuestionarioAdoptante.ts`
- `src/dominio/errores/erroresAdopcionCompatibilidad.ts`
- `src/dominio/puertos/IRepositorioCuestionariosAdoptante.ts`
- `src/infraestructura/adaptadores/PrismaCuestionarioAdoptanteRepositorio.ts`
- `src/aplicacion/dtos/adopcion-compatibilidad/CuestionarioAdoptanteDto.ts`
- `src/aplicacion/casos-de-uso/adopcion-compatibilidad/CompletarCuestionarioAdoptante.ts`
- `src/aplicacion/casos-de-uso/adopcion-compatibilidad/ObtenerCuestionarioPropio.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/adopcion-compatibilidad/cuestionario/route.ts`
- `middleware.ts`
- `tests/integration/middleware.expiracionSesion.test.ts`
- `tests/unit/CompletarCuestionarioAdoptante.test.ts`
- `tests/unit/ObtenerCuestionarioPropio.test.ts`
- `tests/unit/CuestionarioAdoptante.test.ts`
- `tests/integration/cuestionarioAdoptante.completar.test.ts`
- `docs/pruebas_testeos/17_CuestionarioAdoptante_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `docs/DECISIONES.md`

**Contratos y API signatures:**
- `POST /api/adopcion-compatibilidad/cuestionario — body { horasSoloEstimadas?, presenciaNinos?, espacioDisponible?, experienciaPrevia? } → 201 CuestionarioAdoptanteDto (upsert)`
- `GET /api/adopcion-compatibilidad/cuestionario — 200 CuestionarioAdoptanteDto | 404 PEA-ADOP-003`
- `function esCuestionarioCompleto(datos: DatosCuestionarioAdoptante): boolean`
- `class CuestionarioIncompletoError (PEA-ADOP-001) / CuestionarioNoEncontradoError (PEA-ADOP-003)`
- `IRepositorioCuestionariosAdoptante { obtenerPropio, crear, actualizar }`


--- 

## HU: Sugerencias de compatibilidad de adopción
*Criterios de Aceptación/Descripción:*
```text
Como adoptante potencial quiero recibir sugerencias de compatibilidad basadas en mi cuestionario y en los atributos del animal para reducir el riesgo de una adopción fallida.
```

### [COMPLETADA] EstrategiaMatchAdopcion con Strategy intercambiable (reglas → semántico → LLM)
- **Rol:** Backend Developer
- **Componente/Ruta:** `GenerarSugerenciasCompatibilidad.ts` (src/aplicacion/casos-de-uso/adopcion-compatibilidad/GenerarSugerenciasCompatibilidad.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
IEstrategiaCompatibilidad/CompatibilidadPorReglas (src/dominio/estrategias/EstrategiaCompatibilidad.ts, mismo archivo agrupando interfaz+implementación que ProveedorTurnera.ts): calcularScore compara cuestionario.presenciaNinos vs ficha.compatibleNinos y cuestionario.horasSoloEstimadas vs ficha.nivelEnergia (los únicos 2 criterios con dato estructurado real en ambos lados) — score = fracción de coincidencias (0/0.5/1), null en cualquier lado no penaliza. GenerarSugerenciasCompatibilidad.ts: autorizar() no-op (cualquier autenticado, sobre su propio cuestionario); persistir() resuelve el cuestionario propio (404 PEA-ADOP-003 si no existe), exige esCuestionarioCompleto() (400 PEA-ADOP-001, consumiendo por primera vez la regla definida en el ticket anterior), obtiene candidatos vía IRepositorioFichasAdopcion.listarPublico(1,50) — que ya filtra estado='disponible', sin duplicar ese WHERE — y por cada candidato invoca EXCLUSIVAMENTE this.estrategiaCompatibilidad (inyectada por token, nunca CompatibilidadPorReglas importado directo) insertando una fila en sugerencias_compatibilidad vía IRepositorioSugerenciasCompatibilidad.crear(). DI: un único token IEstrategiaCompatibilidad (patrón de intercambio-por-configuración de IGeneradorEmbeddings, no el de dos tokens simultáneos de ProveedorTurnera, porque acá solo hay UNA estrategia activa a la vez) — migrar a CompatibilidadSemantica/CompatibilidadLLM en el futuro es cambiar una sola línea en contenedor-di.ts.

**Archivos Modificados:**
- `src/dominio/estrategias/EstrategiaCompatibilidad.ts`
- `src/dominio/puertos/IRepositorioSugerenciasCompatibilidad.ts`
- `src/infraestructura/adaptadores/PrismaSugerenciasCompatibilidadRepositorio.ts`
- `src/aplicacion/dtos/adopcion-compatibilidad/SugerenciaCompatibilidadDto.ts`
- `src/aplicacion/casos-de-uso/adopcion-compatibilidad/GenerarSugerenciasCompatibilidad.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/adopcion-compatibilidad/sugerencias/route.ts`
- `tests/unit/CompatibilidadPorReglas.test.ts`
- `tests/unit/GenerarSugerenciasCompatibilidad.test.ts`
- `tests/integration/sugerenciasCompatibilidad.generar.test.ts`
- `docs/pruebas_testeos/18_SugerenciasCompatibilidad_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `docs/DECISIONES.md`

**Contratos y API signatures:**
- `POST /api/adopcion-compatibilidad/sugerencias — 201 SugerenciaCompatibilidadDto[] | 400 PEA-ADOP-001 | 404 PEA-ADOP-003`
- `interface IEstrategiaCompatibilidad { metodo, calcularScore(cuestionario, ficha) }`
- `class CompatibilidadPorReglas implements IEstrategiaCompatibilidad (metodo='reglas')`
- `IRepositorioSugerenciasCompatibilidad.crear(datos): Promise<SugerenciaCompatibilidad>`
- `container.registerSingleton<IEstrategiaCompatibilidad>('IEstrategiaCompatibilidad', CompatibilidadPorReglas)`


--- 

