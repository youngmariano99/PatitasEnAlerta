# Handoffs y Entregables del Sprint - Sprint 5: Red de Colaboración entre ONGs y Rescatistas (Post-MVP)

**Objetivo:** Habilitar la coordinación entre organizaciones, rescatistas y veterinarios sobre solicitudes de recurso, incluyendo el directorio de aliados y la búsqueda semántica.
**Capacidad:** 40 Ptos | **Duración:** 1 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## HU: Publicación de solicitudes de recurso
*Criterios de Aceptación/Descripción:*
```text
Como organización/refugio quiero publicar solicitudes de recursos como tránsito, insumos o asistencia veterinaria para que otros stakeholders de la red puedan ofrecerse.
```

### [COMPLETADA] Caso de uso PublicarSolicitudRecurso (Post-MVP, Módulo 5)
- **Rol:** Backend Developer
- **Componente/Ruta:** `PublicarSolicitudRecurso.ts` (src/aplicacion/casos-de-uso/red-colaboracion/PublicarSolicitudRecurso.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
Caso de uso siguiendo el Template Method CasoDeUsoBase (validar Zod → autorizar rol 'organizacion' vía IRepositorioPerfil → persistir en solicitudes_recurso → loguear evento de dominio). El modelo Prisma SolicitudRecurso ya existía (scaffolded desde el modelado inicial), así que solo se agregó el puerto (acotado a 'crear', no todo el CRUD) y su adaptador. Autorización reutiliza AccesoNoAutorizadoError (PEA-SIS-002) porque ERRORS.md Módulo 5 no cubre este caso puntual. Sin RLS para solicitudes_recurso todavía — deliberado, ver docs/DECISIONES.md.

**Archivos Modificados:**
- `src/dominio/entidades/SolicitudRecurso.ts`
- `src/dominio/puertos/IRepositorioSolicitudesRecurso.ts`
- `src/infraestructura/adaptadores/PrismaSolicitudesRecursoRepositorio.ts`
- `src/aplicacion/dtos/red-colaboracion/PublicarSolicitudRecursoDto.ts`
- `src/aplicacion/casos-de-uso/red-colaboracion/PublicarSolicitudRecurso.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/red-colaboracion/solicitudes/route.ts`
- `middleware.ts`
- `tests/unit/PublicarSolicitudRecurso.test.ts`
- `tests/integration/red-colaboracion.solicitudes.crear.test.ts`
- `docs/pruebas_testeos/6_PublicarSolicitudRecurso_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `docs/DECISIONES.md`

**Contratos y API signatures:**
- `class PublicarSolicitudRecurso extends CasoDeUsoBase<EntradaPublicarSolicitudRecurso, SolicitudRecursoPublicada, ComandoPublicarSolicitudRecurso>`
- `interface IRepositorioSolicitudesRecurso { crear(datos: DatosNuevaSolicitudRecurso): Promise<SolicitudRecurso> }`
- `POST /api/red-colaboracion/solicitudes — body { tipo: 'transito'|'insumos'|'asistencia_veterinaria'|'adopcion', descripcion: string, reporteId?: uuid } → 201 SolicitudRecursoPublicada`


--- 

## HU: Directorio de aliados verificados
*Criterios de Aceptación/Descripción:*
```text
Como organización/refugio quiero consultar un directorio de aliados verificados filtrable por rol y zona para construir mi propia red de confianza.
```

### [COMPLETADA] Endpoint de directorio filtrable por rol y zona
- **Rol:** Backend Developer
- **Componente/Ruta:** `ListarDirectorioAliados.ts` (src/aplicacion/casos-de-uso/red-colaboracion/ListarDirectorioAliados.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
Porción vertical completa siguiendo el patrón de PublicarSolicitudRecurso: puerto+adaptador Prisma nuevo (sin entidad de dominio, ya que es un listado de solo lectura como ListarReportes), DTO Zod con paginación tope 50 y filtro de zona todo-o-nada (reutiliza el patrón exacto de ListarReportesDto), caso de uso Template Method con autorizar() vía IRepositorioPerfil (anti-IDOR), y endpoint GET protegido por el prefijo /api/red-colaboracion ya existente en middleware.ts (no requirió cambios ahí). El repositorio filtra por rolId (constantes numéricas, mismo criterio que PrismaVeterinarioRepositorio) en vez de por relación rol.nombre, y aplica 'verificados' de forma no negociable (OR entre estado_verificacion='verificado' y rol=rescatista). Se agregaron columnas nullable latitud/longitud a usuarios (migración aditiva) porque no existía ninguna fuente de zona para veterinario/organizacion/rescatista.

**Archivos Modificados:**
- `src/dominio/puertos/IRepositorioDirectorioAliados.ts`
- `src/infraestructura/adaptadores/PrismaDirectorioAliadosRepositorio.ts`
- `src/aplicacion/dtos/red-colaboracion/ListarDirectorioAliadosDto.ts`
- `src/aplicacion/casos-de-uso/red-colaboracion/ListarDirectorioAliados.ts`
- `app/api/red-colaboracion/directorio/route.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/openapi/route.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260909130000_agrega_ubicacion_a_usuarios/migration.sql`
- `tests/unit/ListarDirectorioAliados.test.ts`
- `tests/integration/red-colaboracion.directorio.listar.test.ts`
- `docs/SCHEMA.md`
- `docs/SEED.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/7_DirectorioAliados_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**
- `GET /api/red-colaboracion/directorio?pagina&porPagina&rol&latitud&longitud&radioKm → 200 PaginaDirectorioAliados | 400 PEA-SIS-005 | 401 PEA-SIS-001 | 403 PEA-SIS-002`
- `class ListarDirectorioAliados extends CasoDeUsoBase<EntradaListarDirectorioAliados, PaginaDirectorioAliados, ComandoListarDirectorioAliados>`
- `interface IRepositorioDirectorioAliados { listar(filtros: FiltrosDirectorioAliados, pagina: number, porPagina: number): Promise<PaginaDirectorioAliados> }`
- `ROLES_DIRECTORIO_ALIADOS = ['organizacion', 'veterinario', 'rescatista']`
- `ListarDirectorioAliadosQuerySchema / AliadoDirectorioSchema / PaginaDirectorioAliadosSchema`
- `Usuario.latitud / Usuario.longitud (Float?, nuevas columnas nullable en prisma/schema.prisma)`


--- 

## HU: Hilo de coordinación de una colaboración
*Criterios de Aceptación/Descripción:*
```text
Como organización/refugio quiero coordinar los detalles de una colaboración aceptada en un hilo dedicado para no perder contexto en canales externos.
```

### [COMPLETADA] Vista de seguimiento de colaboraciones con historial persistente
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `ActualizarEstadoColaboracionCommand.ts` (src/aplicacion/casos-de-uso/red-colaboracion/ActualizarEstadoColaboracionCommand.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó ActualizarEstadoColaboracionCommand con el mismo diseño Command+State que CambiarEstadoReporteCommand/ReporteEstado: la transición de estado nunca se decide con un switch, sino preguntándole a ColaboracionEstado.desde(actual).puedeTransicionarA(nuevo). La autorización exige que el solicitante sea la organización dueña de la solicitud_recurso asociada (única con permiso U sobre colaboraciones según docs/ROLES.md, sin bypass de administrador a diferencia de reportes). Se agregó la tabla colaboraciones_historial_estado (INSERT-only, migración aditiva) porque es literalmente el 'historial persistente' del título del ticket, y un segundo caso de uso ListarHistorialColaboracion (+ endpoint GET) porque sin él el historial se escribe pero no hay 'vista' que lo muestre — mismo patrón que ListarHistorialReporte junto a CambiarEstadoReporteCommand. IRepositorioColaboraciones.obtenerActual resuelve la organización dueña con dos consultas Prisma secuenciales (colaboracion→solicitudId→organizacionId) en vez de agregar una relación Prisma, para no modificar el modelo SolicitudRecurso de un ticket previo. actualizarEstado hace UPDATE+INSERT en una misma transacción, re-leyendo el estado dentro de ella (mismo criterio anti-race-condition que PrismaReporteRepositorio).

**Archivos Modificados:**
- `src/dominio/entidades/Colaboracion.ts`
- `src/dominio/estados/ColaboracionEstado.ts`
- `src/dominio/errores/erroresRedColaboracion.ts`
- `src/dominio/puertos/IRepositorioColaboraciones.ts`
- `src/infraestructura/adaptadores/PrismaColaboracionesRepositorio.ts`
- `src/aplicacion/casos-de-uso/red-colaboracion/ActualizarEstadoColaboracionCommand.ts`
- `src/aplicacion/casos-de-uso/red-colaboracion/ListarHistorialColaboracion.ts`
- `src/aplicacion/dtos/red-colaboracion/ActualizarEstadoColaboracionDto.ts`
- `src/aplicacion/dtos/red-colaboracion/HistorialColaboracionDto.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/red-colaboracion/colaboraciones/[id]/estado/route.ts`
- `app/api/red-colaboracion/colaboraciones/[id]/historial/route.ts`
- `app/api/openapi/route.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260909140000_agrega_historial_estado_colaboraciones/migration.sql`
- `tests/unit/ActualizarEstadoColaboracionCommand.test.ts`
- `tests/unit/ListarHistorialColaboracion.test.ts`
- `tests/integration/red-colaboracion.colaboraciones.estado.test.ts`
- `tests/integration/red-colaboracion.colaboraciones.historial.test.ts`
- `docs/SCHEMA.md`
- `docs/ROLES.md`
- `docs/ERRORS.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/8_SeguimientoColaboraciones_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**
- `class ActualizarEstadoColaboracionCommand extends CasoDeUsoBase<ComandoActualizarEstadoColaboracion, ColaboracionEstadoActualizado>`
- `class ListarHistorialColaboracion extends CasoDeUsoBase<ComandoListarHistorialColaboracion, HistorialEstadoColaboracionItem[]>`
- `interface IRepositorioColaboraciones { obtenerActual(colaboracionId): Promise<ColaboracionActual|null>; actualizarEstado(colaboracionId, estadoNuevo, actualizadoPor): Promise<ColaboracionEstadoActualizado>; listarHistorialEstado(colaboracionId): Promise<HistorialEstadoColaboracionItem[]> }`
- `ESTADOS_COLABORACION_SOPORTADOS = ['propuesta','aceptada','rechazada','completada']`
- `class ColaboracionEstado (State: EstadoPropuesta/EstadoAceptada/EstadoRechazada/EstadoCompletada)`
- `PATCH /api/red-colaboracion/colaboraciones/{id}/estado — body { estado } → 200 ColaboracionEstadoActualizado | 400 PEA-SIS-005 | 401 PEA-SIS-001 | 403 PEA-RED-004 | 404 PEA-RED-005 | 409 PEA-RED-006`
- `GET /api/red-colaboracion/colaboraciones/{id}/historial → 200 HistorialEstadoColaboracionItem[] | 401 PEA-SIS-001 | 403 PEA-SIS-002 | 404 PEA-RED-005`
- `PEA-RED-005 / PEA-RED-006 (nuevos en docs/ERRORS.md, Módulo 5)`
- `tabla colaboraciones_historial_estado (modelo Prisma ColaboracionHistorialEstado)`


--- 

## HU: Búsqueda semántica de solicitudes y reportes históricos
*Criterios de Aceptación/Descripción:*
```text
Como organización/refugio quiero buscar solicitudes o reportes históricos por similitud semántica de descripción para encontrar coincidencias aunque el texto exacto varíe.
```

### [COMPLETADA] Búsqueda híbrida con pgvector sobre descripcion_embedding
- **Rol:** Backend Developer
- **Componente/Ruta:** `BuscarReportesSimilares.ts` (src/aplicacion/casos-de-uso/red-colaboracion/BuscarReportesSimilares.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
BuscarReportesSimilares.ts (Template Method, CasoDeUsoBase) valida el query (Zod), autoriza por rol vía IRepositorioPerfil y persiste generando un vector con IGeneradorEmbeddings (OpenAIGeneradorEmbeddings, fetch nativo) para delegar en IRepositorioReportes.buscarPorSimilitudSemantica ($queryRaw parametrizado, distancia coseno + filtros exactos + umbral 0.25). tests/integration/reportes.crear.test.ts se dividió en tres archivos para respetar el límite de 300 líneas. Corrección de esta iteración: `npm run test:e2e` fallaba con timeout de 120s en el webServer de Playwright (`npm run build && npm run start` ya no entraba en esa ventana por el crecimiento acumulado de rutas del proyecto en sprints anteriores — no por código de este ticket específicamente). Se subió `webServer.timeout` en playwright.config.ts de 120_000 a 300_000 ms. Re-verificado de punta a punta: typecheck/lint limpios, test:coverage en verde (130 suites, 926 tests, cobertura 82.67%/71.43%/81.93%/84.01%), y test:e2e ahora pasa (2 tests, chromium + mobile-safari, ~1.7 min).

**Archivos Modificados:**
- `.env.example`
- `playwright.config.ts`
- `src/dominio/puertos/IGeneradorEmbeddings.ts`
- `src/infraestructura/adaptadores/OpenAIGeneradorEmbeddings.ts`
- `src/dominio/puertos/IRepositorioReportes.ts`
- `src/infraestructura/adaptadores/PrismaReporteRepositorio.ts`
- `src/dominio/errores/erroresTransversales.ts`
- `src/aplicacion/dtos/red-colaboracion/BuscarReportesSimilaresDto.ts`
- `src/aplicacion/casos-de-uso/red-colaboracion/BuscarReportesSimilares.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/red-colaboracion/reportes/similares/route.ts`
- `app/api/openapi/route.ts`
- `docs/SCHEMA.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/9_BusquedaSemanticaReportes_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `tests/unit/BuscarReportesSimilares.test.ts`
- `tests/integration/red-colaboracion.reportes.similares.test.ts`
- `tests/integration/reportes.crear.fixtures.ts`
- `tests/integration/reportes.crear.test.ts`
- `tests/integration/reportes.crear.problematica.test.ts`
- `tests/integration/reportes.actualizarEstado.test.ts`
- `tests/integration/reportes.coincidencia.test.ts`
- `tests/integration/reportes.historial.test.ts`
- `tests/integration/reportes.listar.test.ts`
- `tests/unit/CambiarEstadoReporteCommand.test.ts`
- `tests/unit/CrearReporte.test.ts`
- `tests/unit/EvaluarCoincidenciaReporte.test.ts`
- `tests/unit/ListarHistorialReporte.test.ts`
- `tests/unit/ListarReportes.test.ts`

**Contratos y API signatures:**
- `GET /api/red-colaboracion/reportes/similares?consulta&tipo&estado&especie&latitud&longitud&radioKm&limite → 200 ReporteSimilar[] | 400 PEA-SIS-005 | 401 PEA-SIS-001 | 403 PEA-SIS-002 | 503 PEA-SIS-004`
- `class BuscarReportesSimilares extends CasoDeUsoBase<EntradaBuscarReportesSimilares, ReporteSimilar[], ComandoBuscarReportesSimilares>`
- `interface IGeneradorEmbeddings { generarEmbedding(texto: string): Promise<number[]> }`
- `interface IRepositorioReportes { ...; buscarPorSimilitudSemantica(criterios: CriteriosBusquedaSemantica): Promise<ReporteSimilar[]> }`
- `class ServicioExternoNoDisponibleError (PEA-SIS-004, 503) en erroresTransversales.ts`
- `ROLES_CON_ACCESO_A_BUSQUEDA_SEMANTICA = ['organizacion','veterinario','rescatista','municipio','administrador']`
- `container.registerSingleton<IGeneradorEmbeddings>('IGeneradorEmbeddings', OpenAIGeneradorEmbeddings)`
- `OPENAI_API_KEY en .env.example`
- `playwright.config.ts: webServer.timeout = 300_000 (antes 120_000)`


--- 

## HU: Registro de rescatista/activista
*Criterios de Aceptación/Descripción:*
```text
Como rescatista/activista quiero registrarme con un rol orientado a la coordinación en terreno para participar en la Red de Colaboración.
```

### [COMPLETADA] Alta de usuario con rol 'rescatista' vía Abstract Factory de formularios
- **Rol:** Backend Developer
- **Componente/Ruta:** `PerfilFormularioFactory.ts` (src/aplicacion/fabricas/PerfilFormularioFactory.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
PerfilFormularioFactory suma una fábrica concreta 'rescatista' que expone RegistrarRescatistaSchema (mismo shape que dueño: email+password, generado con .extend({}) para tener identidad de esquema propia sin duplicar validadores). RegistrarUsuario se refactorizó extrayendo el paso variable de la creación de la entidad de dominio a un método protegido crearEntidad(), permitiendo que RegistrarRescatista lo extienda por herencia y reutilice íntegro el Template Method (validar → autorizar unicidad de email → persistir con compensación en Supabase Auth), cambiando solo el rol_id (5) y el esquema de validación. El endpoint POST /api/auth/registro despacha el nuevo caso de uso vía el mismo patrón ya usado para veterinario. No se tocó RLS ni ninguna tabla: rescatista no tiene perfil adicional según SCHEMA.md/SEED.md.

**Archivos Modificados:**
- `src/aplicacion/fabricas/PerfilFormularioFactory.ts`
- `src/aplicacion/casos-de-uso/auth/RegistrarUsuario.ts`
- `src/aplicacion/casos-de-uso/auth/RegistrarRescatista.ts`
- `src/aplicacion/dtos/auth/RegistrarRescatistaDto.ts`
- `src/dominio/entidades/Usuario.ts`
- `app/api/auth/registro/route.ts`
- `tests/unit/PerfilFormularioFactory.test.ts`
- `tests/unit/RegistrarRescatista.test.ts`
- `tests/integration/auth.registroRescatista.test.ts`
- `docs/SITEMAP.md`
- `docs/pruebas_testeos/10_RegistroRescatista_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**
- `PerfilFormularioFactory.crear('rescatista'): z.ZodTypeAny`
- `RegistrarRescatistaSchema / type RegistrarRescatistaDto (src/aplicacion/dtos/auth/RegistrarRescatistaDto.ts)`
- `class RegistrarRescatista extends RegistrarUsuario (src/aplicacion/casos-de-uso/auth/RegistrarRescatista.ts)`
- `Usuario.registrarRescatista(id, email): Usuario / export const ROL_RESCATISTA_ID = 5`
- `protected crearEntidad(id, email): Usuario — nuevo hook en RegistrarUsuario (Template Method)`
- `POST /api/auth/registro ahora acepta { rol: 'rescatista' }`


--- 

## HU: Ofrecimiento como colaborador
*Criterios de Aceptación/Descripción:*
```text
Como rescatista/activista quiero ofrecerme como colaborador ante una solicitud publicada para que la organización sepa que cuenta con un recurso disponible.
```

### [COMPLETADA] Comando OfrecerseComoColaboradorCommand
- **Rol:** Backend Developer
- **Componente/Ruta:** `OfrecerseComoColaboradorCommand.ts` (src/aplicacion/casos-de-uso/red-colaboracion/OfrecerseComoColaboradorCommand.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
OfrecerseComoColaboradorCommand sigue el Template Method (CasoDeUsoBase): autoriza rol (rescatista|veterinario, vía IRepositorioPerfil) → verifica que la solicitud exista y esté 'abierta' (PEA-RED-003/001) → verifica no-duplicado con IRepositorioColaboraciones.existePropuestaDe (PEA-RED-002, chequeo de aplicación previo al INSERT, sin migración de índice único — mismo precedente que ux_autorizacion_activa/PEA-VET-009) → persiste con IRepositorioColaboraciones.crear (INSERT en colaboraciones, estado inicial 'propuesta', resuelve organizacionId con una segunda consulta a solicitudes_recurso igual que obtenerActual) → publicarEvento inserta una notificación tipo='colaboracion_propuesta' para la organización dueña, con try/catch para no hacer fallar el alta si la notificación falla. Sin cambios en contenedor-di.ts: todos los puertos usados ya estaban registrados.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/red-colaboracion/OfrecerseComoColaboradorCommand.ts`
- `src/aplicacion/dtos/red-colaboracion/OfrecerseComoColaboradorDto.ts`
- `src/dominio/puertos/IRepositorioColaboraciones.ts`
- `src/dominio/puertos/IRepositorioSolicitudesRecurso.ts`
- `src/dominio/errores/erroresRedColaboracion.ts`
- `src/infraestructura/adaptadores/PrismaColaboracionesRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaSolicitudesRecursoRepositorio.ts`
- `app/api/red-colaboracion/solicitudes/[id]/colaboraciones/route.ts`
- `tests/unit/OfrecerseComoColaboradorCommand.test.ts`
- `tests/integration/red-colaboracion.colaboraciones.ofrecerse.test.ts`
- `tests/unit/PublicarSolicitudRecurso.test.ts`
- `tests/unit/ActualizarEstadoColaboracionCommand.test.ts`
- `tests/unit/ListarHistorialColaboracion.test.ts`
- `tests/integration/red-colaboracion.colaboraciones.estado.test.ts`
- `tests/integration/red-colaboracion.colaboraciones.historial.test.ts`
- `tests/integration/red-colaboracion.solicitudes.crear.test.ts`
- `tests/integration/auth.registroRescatista.test.ts`
- `docs/SCHEMA.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/11_OfrecimientoComoColaborador_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**
- `class OfrecerseComoColaboradorCommand extends CasoDeUsoBase<ComandoOfrecerseComoColaborador, ColaboracionPropuesta>`
- `IRepositorioColaboraciones.existePropuestaDe(solicitudId, stakeholderId): Promise<boolean>`
- `IRepositorioColaboraciones.crear(datos: DatosNuevaColaboracion): Promise<ColaboracionPropuesta>`
- `IRepositorioSolicitudesRecurso.obtenerActual(solicitudId): Promise<SolicitudActual | null>`
- `POST /api/red-colaboracion/solicitudes/{id}/colaboraciones → 201 ColaboracionPropuesta | 401 PEA-SIS-001 | 403 PEA-SIS-002 | 404 PEA-RED-003 | 409 PEA-RED-001/002`
- `SolicitudNoEncontradaError (PEA-RED-003), SolicitudYaCubiertaError (PEA-RED-001), ColaboracionYaPropuestaError (PEA-RED-002)`


--- 

## HU: Métricas personales de contribución
*Criterios de Aceptación/Descripción:*
```text
Como rescatista/activista quiero consultar mis propias métricas de contribución sin comparación pública para tener evidencia de mi esfuerzo sin generar presión competitiva.
```

### [COMPLETADA] Endpoint de métricas propias sin comparación pública
- **Rol:** Backend Developer
- **Componente/Ruta:** `ObtenerMetricasPropias.ts` (src/aplicacion/casos-de-uso/red-colaboracion/ObtenerMetricasPropias.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
ObtenerMetricasPropias sigue el Template Method con autorizar() no-op (mismo criterio que ListarMisTurnos/ReservarTurnoCommand): la pertenencia no se verifica con una consulta aparte, la impone IRepositorioColaboraciones.obtenerMetricasPropias mismo, que agrega SIEMPRE con WHERE stakeholder_id=stakeholderId AND estado='completada'. El adaptador resuelve el desglose por tipo con dos consultas secuenciales (colaboraciones → solicitudes_recurso), mismo patrón ya establecido para no crear una relación Prisma Colaboracion→SolicitudRecurso. Deliberadamente sin patrón Builder (no hay filtros de período/zona que lo justifiquen, a diferencia de DashboardMunicipalBuilder). El endpoint no exige rol específico: cualquier usuario autenticado sin colaboraciones propias recibe el agregado vacío, nunca un error ni datos ajenos.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/red-colaboracion/ObtenerMetricasPropias.ts`
- `src/aplicacion/dtos/red-colaboracion/ObtenerMetricasPropiasDto.ts`
- `src/dominio/puertos/IRepositorioColaboraciones.ts`
- `src/infraestructura/adaptadores/PrismaColaboracionesRepositorio.ts`
- `app/api/red-colaboracion/metricas/route.ts`
- `app/red-colaboracion/metricas/page.tsx`
- `middleware.ts`
- `tests/unit/ObtenerMetricasPropias.test.ts`
- `tests/integration/red-colaboracion.metricas.test.ts`
- `tests/integration/middleware.expiracionSesion.test.ts`
- `tests/integration/red-colaboracion.colaboraciones.estado.test.ts`
- `tests/integration/red-colaboracion.colaboraciones.historial.test.ts`
- `tests/integration/red-colaboracion.colaboraciones.ofrecerse.test.ts`
- `tests/unit/ActualizarEstadoColaboracionCommand.test.ts`
- `tests/unit/ListarHistorialColaboracion.test.ts`
- `tests/unit/OfrecerseComoColaboradorCommand.test.ts`
- `docs/SITEMAP.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/12_MetricasPropias_Backend_Frontend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**
- `class ObtenerMetricasPropias extends CasoDeUsoBase<ComandoObtenerMetricasPropias, MetricasColaboracionPropias>`
- `IRepositorioColaboraciones.obtenerMetricasPropias(stakeholderId): Promise<MetricasColaboracionPropias>`
- `GET /api/red-colaboracion/metricas → 200 { totalCompletadas, porTipo } | 401 PEA-SIS-001`
- `app/red-colaboracion/metricas/page.tsx (protegida, redirige a /auth/login sin sesión)`


--- 

## HU: Filtrado de solicitudes de asistencia veterinaria
*Criterios de Aceptación/Descripción:*
```text
Como veterinario/a quiero recibir y filtrar solicitudes de asistencia veterinaria de la Red por zona y especialidad para no saturarme con pedidos que no puedo atender.
```

### [COMPLETADA] Endpoint de solicitudes filtradas por zona y especialidad para veterinarios
- **Rol:** Backend Developer
- **Componente/Ruta:** `ListarSolicitudesVeterinarias.ts` (src/aplicacion/casos-de-uso/red-colaboracion/ListarSolicitudesVeterinarias.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
ListarSolicitudesVeterinarias sigue el Template Method: valida query (paginación + zona todo-o-nada, mismo esquema que ListarDirectorioAliadosDto) → autoriza exclusivamente rol_actual()='veterinario' vía IRepositorioPerfil (PEA-SIS-002 para cualquier otro rol) → persiste delegando el filtro completo (tipo='asistencia_veterinaria' AND estado='abierta' + zona opcional + paginación server-side) en IRepositorioSolicitudesRecurso.listarAsistenciaVeterinariaAbiertas. El adaptador Prisma resuelve la 'zona' de una solicitud vía la organización dueña (usuarios.latitud/longitud, sin relación Prisma SolicitudRecurso→Usuario): primero resuelve los ids de organizaciones dentro del bounding box, después filtra solicitudes por esos ids — mismo criterio de dos consultas secuenciales ya establecido en el módulo. Endpoint en ruta propia (no agregado al route.ts existente de POST /solicitudes) para no mezclar historias de tickets distintos en un mismo archivo.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/red-colaboracion/ListarSolicitudesVeterinarias.ts`
- `src/aplicacion/dtos/red-colaboracion/ListarSolicitudesVeterinariasDto.ts`
- `src/dominio/puertos/IRepositorioSolicitudesRecurso.ts`
- `src/infraestructura/adaptadores/PrismaSolicitudesRecursoRepositorio.ts`
- `app/api/red-colaboracion/solicitudes/veterinaria/route.ts`
- `tests/unit/ListarSolicitudesVeterinarias.test.ts`
- `tests/integration/red-colaboracion.solicitudes.veterinaria.test.ts`
- `tests/unit/OfrecerseComoColaboradorCommand.test.ts`
- `tests/unit/PublicarSolicitudRecurso.test.ts`
- `tests/integration/auth.registroRescatista.test.ts`
- `tests/integration/red-colaboracion.colaboraciones.ofrecerse.test.ts`
- `tests/integration/red-colaboracion.solicitudes.crear.test.ts`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/13_SolicitudesVeterinariasFiltradas_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**
- `class ListarSolicitudesVeterinarias extends CasoDeUsoBase<EntradaListarSolicitudesVeterinarias, PaginaSolicitudesVeterinarias, ComandoListarSolicitudesVeterinarias>`
- `IRepositorioSolicitudesRecurso.listarAsistenciaVeterinariaAbiertas(zona, pagina, porPagina): Promise<PaginaSolicitudesVeterinarias>`
- `GET /api/red-colaboracion/solicitudes/veterinaria?pagina&porPagina&latitud&longitud&radioKm → 200 PaginaSolicitudesVeterinarias | 400 PEA-SIS-005 | 401 PEA-SIS-001 | 403 PEA-SIS-002`


--- 

