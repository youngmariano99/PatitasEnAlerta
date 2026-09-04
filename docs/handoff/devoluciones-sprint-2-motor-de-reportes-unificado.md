# Handoffs y Entregables del Sprint - Sprint 2: Motor de Reportes Unificado

**Objetivo:** Habilitar el reporte ciudadano de mascotas perdidas/encontradas y problemáticas urbanas, con su gestión y seguimiento de estado desde el panel municipal.
**Capacidad:** 40 Ptos | **Duración:** 1 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## 🎯 HU: Reporte exprés de mascota perdida
*Criterios de Aceptación/Descripción:*
```text
Como dueño de mascota quiero reportar que mi mascota se perdió con foto y geolocalización automática en pocos pasos para maximizar la chance de reencuentro en las primeras horas.
```

### 📄 [✔ COMPLETADA] Endpoint CrearReporte con pipeline de validación Chain of Responsibility
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `CrearReporte.ts` (src/aplicacion/casos-de-uso/reportes/CrearReporte.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
CrearReporte implementa el pipeline Chain of Responsibility exigido (esquema→rate limit→imagen→geolocalización) sobre CasoDeUsoBase, extendido con un type-param opcional para soportar validación asincrónica que transforma el shape de entrada. El formulario /reportes/nuevo es el primer uso real de Leaflet y de @upstash/ratelimit en el proyecto. Build, lint, typecheck y test:coverage (261 tests, cobertura global 86.6%/71.4%/88%/88%) verificados en caliente.

**Archivos Modificados:**
- `src/dominio/entidades/Reporte.ts`
- `src/dominio/puertos/IRepositorioReportes.ts`
- `src/dominio/puertos/IControlDeTasa.ts`
- `src/dominio/errores/erroresReportes.ts`
- `src/aplicacion/dtos/reportes/CrearReporteDto.ts`
- `src/aplicacion/pipelines/ValidacionReporte.ts`
- `src/aplicacion/casos-de-uso/reportes/CrearReporte.ts`
- `src/aplicacion/casos-de-uso/CasoDeUsoBase.ts (extendido con TValidado, sin romper compatibilidad)`
- `src/aplicacion/contenedor-di.ts`
- `src/infraestructura/adaptadores/PrismaReporteRepositorio.ts`
- `src/infraestructura/adaptadores/UpstashControlDeTasa.ts`
- `src/presentacion/componentes/mapas/SelectorUbicacionMapa.tsx`
- `app/api/reportes/route.ts`
- `app/api/openapi/route.ts`
- `app/reportes/nuevo/page.tsx`
- `middleware.ts`
- `scripts/seed/seed-reportes.sql`
- `tests/unit/ValidacionReporte.test.ts`
- `tests/unit/CrearReporte.test.ts`
- `tests/unit/PrismaReporteRepositorio.test.ts`
- `tests/unit/UpstashControlDeTasa.test.ts`
- `tests/integration/reportes.crear.test.ts`

**Contratos y API signatures:**
- `POST /api/reportes → 201 ReporteCreado | 400 PEA-REP-001/PEA-REP-002/PEA-REP-003/PEA-SIS-005 | 401 PEA-SIS-001 | 429 PEA-REP-004 | 500 PEA-SIS-003`
- `CrearReporteSchema / type ComandoCrearReporte / ReporteCreadoSchema / type ReporteCreado`
- `CrearReporte (caso de uso, Template Method + Chain of Responsibility)`
- `crearPipelineValidacionReporte(dependencias) / ValidadorReporte, ValidadorEsquemaZod, ValidadorRateLimit, ValidadorContenidoImagen, ValidadorGeolocalizacion`
- `IRepositorioReportes.crear / IControlDeTasa.permitir (puertos)`
- `Tokens DI: 'IRepositorioReportes' → PrismaReporteRepositorio, 'IControlDeTasa' → UpstashControlDeTasa`
- `CasoDeUsoBase<TInput, TOutput, TValidado = TInput> — firma extendida, retrocompatible`
- `SelectorUbicacionMapa({ centro, posicion, onSeleccionar }) — componente reutilizable para cualquier flujo con fallback de mapa`


--- 

## 🎯 HU: Reporte de mascota encontrada
*Criterios de Aceptación/Descripción:*
```text
Como vecino quiero reportar que encontré una mascota con el mismo flujo simple para que su dueño pueda encontrarla rápido.
```

### 📄 [✔ COMPLETADA] Reutilización del flujo de CrearReporte para tipo 'encontrado'
- **Rol:** Backend Developer
- **Componente/Ruta:** `CrearReporte.ts` (src/aplicacion/casos-de-uso/reportes/CrearReporte.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
REP-02 reutiliza CrearReporte sin duplicar código: único cambio real es que tipo acepta 'encontrado' y mascotaId ya era opcional. El requisito de matching zona+especie (REP-U-06) exigía un dato que el esquema no tenía — se agregó `especie` nullable a `reportes` (migración + SCHEMA.md) porque mascota_id opcional no garantiza tener de dónde derivar la especie. EvaluarCoincidenciaReporte es un Command separado, inyectado en CrearReporte y disparado de forma no bloqueante desde publicarEvento(), reutilizando el patrón Observer/no-blocking-notification ya establecido en ResolverVerificacionCommand. CasoDeUsoBase no necesitó cambios adicionales (el TValidado agregado en el ticket anterior ya cubre este caso). Frontend: mismo wizard de 3 pasos para ambas categorías, parametrizado por ?tipo= en la URL en vez de duplicar la página.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/reportes/CrearReporte.ts`
- `src/aplicacion/casos-de-uso/reportes/EvaluarCoincidenciaReporte.ts`
- `src/aplicacion/dtos/reportes/CrearReporteDto.ts`
- `src/dominio/entidades/Reporte.ts`
- `src/dominio/puertos/IRepositorioReportes.ts`
- `src/infraestructura/adaptadores/PrismaReporteRepositorio.ts`
- `src/presentacion/componentes/reportes/FormularioReporteWizard.tsx`
- `app/reportes/nuevo/page.tsx`
- `prisma/schema.prisma`
- `prisma/migrations/20260830120000_agrega_especie_a_reportes/migration.sql`
- `scripts/seed/seed-reportes.sql`
- `docs/SCHEMA.md`
- `docs/SEED.md`
- `tests/unit/CrearReporte.test.ts`
- `tests/unit/EvaluarCoincidenciaReporte.test.ts`
- `tests/unit/PrismaReporteRepositorio.test.ts`
- `tests/unit/ValidacionReporte.test.ts`
- `tests/integration/reportes.crear.test.ts`

**Contratos y API signatures:**
- `TIPOS_REPORTE_SOPORTADOS / type TipoReporte — CrearReporteDto ahora acepta tipo: 'perdido'|'encontrado'`
- `CrearReporteDto.especie (opcional) / ReporteCreado.especie (nullable)`
- `IRepositorioReportes.buscarPerdidosActivosPorZonaYEspecie(criterios): Promise<ReporteActivoResumen[]>`
- `CriteriosCoincidenciaReporte / ReporteActivoResumen`
- `EvaluarCoincidenciaReporte.ejecutar(reporteEncontrado: ReporteCreado): Promise<void>`
- `ESTADOS_REPORTE_ACTIVOS (Reporte.ts) — ['reportado','en_revision','en_atencion']`
- `FormularioReporteWizard({ tipoInicial: TipoReporte })`
- `reportes.especie TEXT NULL (columna nueva, migración incluida)`


--- 

## 🎯 HU: Reporte de problemática urbana
*Criterios de Aceptación/Descripción:*
```text
Como vecino quiero reportar una problemática urbana como un animal suelto o un accidente vial para que el municipio tenga visibilidad y pueda actuar.
```

### 📄 [✔ COMPLETADA] Extensión del motor de reportes con categoría 'problematica' y subtipo
- **Rol:** Backend Developer
- **Componente/Ruta:** `CrearReporte.ts` (src/aplicacion/casos-de-uso/reportes/CrearReporte.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
REP-03 reutiliza CrearReporte íntegramente: el único código nuevo es el superRefine del DTO (subtipo condicional) y dos líneas en persistir() (forzar mascotaId/subtipo según tipo) — cero ramas nuevas en validar()/autorizar(). Se detectó que `subtipo` (existente desde la migración inicial) nunca tuvo CHECK a nivel de BD a diferencia de tipo/estado, inconsistente con la convención documentada del proyecto y con lo que el propio ticket da por hecho ('subtipo fuera del CHECK') — se agregó la migración correspondiente con 3 constraints (valores válidos, obligatoriedad cruzada con tipo, y mascota_id siempre NULL en problematica), reforzando en BD lo que la app ya garantiza. Se encontró y corrigió un bug de test preexistente en el nuevo FormularioReporteWizard.test.tsx: dos casos no mockeaban fetch, dejando fallar la subida a Cloudinary silenciosamente. La cobertura global subió de ~86% a ~90% al agregar tests de componente para el wizard, que antes tenía 0% de cobertura.

**Archivos Modificados:**
- `src/aplicacion/dtos/reportes/CrearReporteDto.ts`
- `src/aplicacion/pipelines/ValidacionReporte.ts`
- `src/aplicacion/casos-de-uso/reportes/CrearReporte.ts`
- `src/presentacion/componentes/reportes/FormularioReporteWizard.tsx`
- `app/reportes/nuevo/page.tsx`
- `prisma/migrations/20260831090000_agrega_check_subtipo_problematica/migration.sql`
- `docs/SCHEMA.md`
- `scripts/seed/seed-reportes.sql`
- `tests/unit/ValidacionReporte.test.ts`
- `tests/unit/CrearReporte.test.ts`
- `tests/unit/EvaluarCoincidenciaReporte.test.ts`
- `tests/unit/FormularioReporteWizard.test.tsx`
- `tests/integration/reportes.crear.test.ts`

**Contratos y API signatures:**
- `TIPOS_REPORTE_SOPORTADOS ahora incluye 'problematica'`
- `SUBTIPOS_PROBLEMATICA_SOPORTADOS / type SubtipoProblematica — ['animal_suelto','foco_sanitario','accidente_vial']`
- `CrearReporteDto.subtipo (obligatorio y validado solo si tipo='problematica') / ReporteCreado.subtipo (nullable)`
- `reportes.subtipo: 2 CHECK constraints nuevos (valores válidos + obligatorio en 'problematica')`
- `reportes.mascota_id: CHECK nuevo (siempre NULL en 'problematica')`
- `FormularioReporteWizard: prop tipoInicial ahora acepta 'problematica'; nuevo radiogroup de subtipo en el paso 2`
- `app/reportes/nuevo/page.tsx: segmented control de 3 categorías reemplaza el toggle binario anterior`


--- 

## 🎯 HU: Listado y mapa de reportes activos
*Criterios de Aceptación/Descripción:*
```text
Como vecino quiero consultar el listado y mapa de reportes activos con filtros por categoría, zona y estado para orientarme sobre lo que está pasando cerca mío.
```

### 📄 [✔ COMPLETADA] Endpoint paginado de reportes con filtros y vista de mapa/tabla
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `ListarReportes.ts` (src/aplicacion/casos-de-uso/reportes/ListarReportes.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se verificó que RLS (reportes_select_publico + GRANT SELECT a anon) y el índice compuesto tipo/estado ya existían de tickets previos — el checklist los daba por nuevos pero ya estaban resueltos, así que esta actividad fue puramente aditiva sin migraciones. El hallazgo real fue que middleware.ts protegía /api/reportes por prefijo de path sin distinguir método HTTP, lo que habría bloqueado el GET público aunque el route handler nunca dependió de esa protección para el POST (que ya se autoprotege). Se resolvió con una excepción de método (RUTAS_API_LECTURA_PUBLICA) en vez de sacar la ruta de la lista protegida, preservando la protección de futuros métodos de escritura sobre el mismo path. El filtro de zona reutiliza la misma matemática de bounding box de EvaluarCoincidenciaReporte (extraída a un helper compartido). El ícono Flyweight del mapa es el primer uso explícito de ese patrón en el proyecto.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/reportes/ListarReportes.ts`
- `src/aplicacion/dtos/reportes/ListarReportesDto.ts`
- `src/dominio/entidades/Reporte.ts`
- `src/dominio/puertos/IRepositorioReportes.ts`
- `src/infraestructura/adaptadores/PrismaReporteRepositorio.ts`
- `app/api/reportes/route.ts`
- `app/api/openapi/route.ts`
- `app/reportes/page.tsx`
- `src/presentacion/componentes/mapas/MapaReportes.tsx`
- `src/presentacion/componentes/mapas/iconosReporteFlyweight.ts`
- `middleware.ts`
- `tests/unit/ListarReportes.test.ts`
- `tests/unit/PrismaReporteRepositorio.test.ts`
- `tests/unit/PaginaReportes.test.tsx`
- `tests/integration/reportes.listar.test.ts`
- `tests/integration/middleware.expiracionSesion.test.ts`

**Contratos y API signatures:**
- `GET /api/reportes?pagina&porPagina&tipo&estado&latitud&longitud&radioKm → 200 PaginaReportes | 400 PEA-SIS-005 (zona incompleta)`
- `ListarReportes (caso de uso, público — autorizar() no-op)`
- `IRepositorioReportes.listar(filtros, pagina, porPagina): Promise<PaginaReportes>`
- `FiltrosListadoReportes / FiltroZona / ReporteListado / PaginaReportes`
- `ESTADOS_REPORTE_SOPORTADOS / type EstadoReporte (Reporte.ts)`
- `ListarReportesQuerySchema / PaginaReportesSchema / ReporteListadoSchema`
- `obtenerIconoReporte(tipo, estado): L.DivIcon — Flyweight cacheado por combinación`
- `MapaReportes({ reportes, centro })`
- `middleware.ts: RUTAS_API_LECTURA_PUBLICA — GET público sobre una ruta de RUTAS_API_PROTEGIDAS`


--- 

## 🎯 HU: Notificación de coincidencia de reporte
*Criterios de Aceptación/Descripción:*
```text
Como dueño de mascota quiero recibir una notificación cuando aparece un reporte de encontrado compatible con mi mascota perdida para enterarme apenas hay una pista.
```

### 📄 [✔ COMPLETADA] Job de coincidencia zona/especie y generación de notificación
- **Rol:** Backend Developer
- **Componente/Ruta:** `DetectarCoincidenciaReporteJob.ts` (src/infraestructura/jobs/DetectarCoincidenciaReporteJob.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El ticket anterior ('encontrado') ya había implementado EvaluarCoincidenciaReporte pero awaited dentro de CrearReporte.publicarEvento(), violando el AC explícito de esta actividad ('sin bloquear el tiempo de respuesta p95'). Se extrajo el despacho a un job de infraestructura real (fire-and-forget, seguro en este proyecto porque corre como proceso Node de larga duración vía Docker, no serverless — documentado el porqué en el propio archivo). Se detectó que la RLS de notificaciones (ROLES.md 3.7) solo cubría SELECT/INSERT pero la matriz de permisos de la Sección 2 ya prometía RU(p) — se cerró esa brecha con una migración UPDATE + el caso de uso correspondiente, usando el mismo patrón anti-enumeración de RepositorioProxy (UPDATE atómico id+usuario_id, sin 'buscar primero'). El test de integración de coincidencia usa un fake que filtra de verdad (especie/radio/estado) sobre reportes creados via POST reales, no un mock directo del resultado, para cumplir genuinamente el Paso 4 del checklist.

**Archivos Modificados:**
- `src/infraestructura/jobs/DetectarCoincidenciaReporteJob.ts`
- `src/aplicacion/casos-de-uso/reportes/CrearReporte.ts`
- `src/dominio/puertos/INotificacionesRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaNotificacionesRepositorio.ts`
- `src/aplicacion/casos-de-uso/notificaciones/ListarNotificacionesPropias.ts`
- `src/aplicacion/casos-de-uso/notificaciones/MarcarNotificacionLeida.ts`
- `src/aplicacion/dtos/notificaciones/NotificacionesDto.ts`
- `app/api/notificaciones/route.ts`
- `app/api/notificaciones/[id]/route.ts`
- `app/api/openapi/route.ts`
- `src/presentacion/componentes/notificaciones/CampanaNotificaciones.tsx`
- `middleware.ts`
- `prisma/migrations/20260901090000_agrega_update_leido_notificaciones/migration.sql`
- `docs/ROLES.md`
- `scripts/seed/seed-notificaciones.sql`
- `tests/unit/DetectarCoincidenciaReporteJob.test.ts`
- `tests/unit/ListarNotificacionesPropias.test.ts`
- `tests/unit/MarcarNotificacionLeida.test.ts`
- `tests/unit/PrismaNotificacionesRepositorio.test.ts`
- `tests/unit/CampanaNotificaciones.test.tsx`
- `tests/unit/CrearReporte.test.ts`
- `tests/unit/EvaluarCoincidenciaReporte.test.ts`
- `tests/unit/ResolverVerificacionCommand.test.ts`
- `tests/integration/notificaciones.test.ts`
- `tests/integration/reportes.coincidencia.test.ts`
- `tests/integration/reportes.crear.test.ts`
- `tests/integration/admin.resolverVerificacion.test.ts`

**Contratos y API signatures:**
- `DetectarCoincidenciaReporteJob.programar(reporteEncontrado: ReporteCreado): void — fire-and-forget`
- `INotificacionesRepositorio.listarPorUsuario(usuarioId, pagina, porPagina): Promise<PaginaNotificaciones>`
- `INotificacionesRepositorio.marcarComoLeida(id, usuarioId): Promise<boolean>`
- `GET /api/notificaciones?pagina&porPagina → 200 PaginaNotificaciones | 401 PEA-SIS-001`
- `PATCH /api/notificaciones/{id} → 200 { id, leido:true } | 401 PEA-SIS-001 | 403 PEA-SIS-002`
- `ListarNotificacionesPropias / MarcarNotificacionLeida (casos de uso)`
- `CampanaNotificaciones({ usuarioId })`
- `RLS: notificaciones_marcar_leida (UPDATE, USING/WITH CHECK usuario_id = auth.uid())`
- `CrearReporte ahora inyecta DetectarCoincidenciaReporteJob en vez de EvaluarCoincidenciaReporte directamente`


--- 

## 🎯 HU: Panel municipal de reportes activos
*Criterios de Aceptación/Descripción:*
```text
Como municipio quiero visualizar todos los reportes activos en una tabla paginada y filtrable para hacer triage rápido de las emergencias.
```

### 📄 [✔ COMPLETADA] Vista Municipio con RLS de actualización y filtros server-side
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `PanelReportesMunicipio.tsx` (app/municipio/dashboard/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
El middleware nunca había verificado rol (solo sesión) — se agregó reutilizando rol_actual() vía RPC en vez de consultar usuarios/roles a mano, evitando duplicar la fuente de verdad que ya usan las políticas RLS. Se detectó que reportes_update_estado (RLS) ya existía desde el ticket de RepositorioProxy — no hizo falta migración nueva, solo completar la capa de aplicación que faltaba: la máquina de estados (antes solo documentada como intención en ERRORS.md/PEA-REP-006, nunca implementada) y el endpoint. Se priorizó reutilización explícita en dos frentes, tal como pedía el checklist: GET /api/reportes es el mismo endpoint público con un filtro más, y PanelReportesMunicipio hace su propia verificación de rol (no delega ciegamente en el middleware) para que el criterio de aceptación 'un dueño no ve el control' sea comprobable en aislamiento.

**Archivos Modificados:**
- `middleware.ts`
- `src/dominio/entidades/Reporte.ts`
- `src/dominio/errores/erroresReportes.ts`
- `src/dominio/puertos/IRepositorioReportes.ts`
- `src/infraestructura/adaptadores/PrismaReporteRepositorio.ts`
- `src/aplicacion/casos-de-uso/reportes/ActualizarEstadoReporte.ts`
- `src/aplicacion/casos-de-uso/reportes/ListarReportes.ts`
- `src/aplicacion/dtos/reportes/ActualizarEstadoReporteDto.ts`
- `src/aplicacion/dtos/reportes/ListarReportesDto.ts`
- `app/api/reportes/[id]/estado/route.ts`
- `app/api/openapi/route.ts`
- `app/municipio/dashboard/page.tsx`
- `src/presentacion/componentes/municipio/PanelReportesMunicipio.tsx`
- `tests/unit/ActualizarEstadoReporte.test.ts`
- `tests/unit/PrismaReporteRepositorio.test.ts`
- `tests/unit/ListarReportes.test.ts`
- `tests/unit/PanelReportesMunicipio.test.tsx`
- `tests/unit/PaginaDashboardMunicipio.test.tsx`
- `tests/unit/CrearReporte.test.ts`
- `tests/unit/EvaluarCoincidenciaReporte.test.ts`
- `tests/integration/reportes.actualizarEstado.test.ts`
- `tests/integration/reportes.crear.test.ts`
- `tests/integration/reportes.listar.test.ts`
- `tests/integration/reportes.coincidencia.test.ts`
- `tests/integration/middleware.expiracionSesion.test.ts`

**Contratos y API signatures:**
- `TRANSICIONES_VALIDAS_REPORTE (Reporte.ts) — máquina de estados`
- `PEA-REP-005/006/007 ahora implementados: ReporteNoEncontradoError, CambioDeEstadoInvalidoError, SoloMunicipioActualizaEstadoError`
- `IRepositorioReportes.obtenerEstadoActual(id) / .actualizarEstado(id, estadoNuevo, actualizadoPor)`
- `FiltrosListadoReportes.fechaDesde/.fechaHasta`
- `PATCH /api/reportes/{id}/estado → 200 ReporteEstadoActualizado | 400/401/403/404/409`
- `GET /api/reportes ahora acepta fechaDesde/fechaHasta además de tipo/estado/zona`
- `ActualizarEstadoReporte (caso de uso)`
- `PanelReportesMunicipio({ rol: string })`
- `middleware.ts: RUTAS_PAGINA_CON_ROL_REQUERIDO + obtenerRolActual() vía RPC rol_actual()`


--- 

## 🎯 HU: Actualización del estado de un reporte
*Criterios de Aceptación/Descripción:*
```text
Como municipio quiero actualizar el estado de un reporte siguiendo su ciclo de vida definido para que todos los stakeholders vean el avance real.
```

### 📄 [✔ COMPLETADA] Comando CambiarEstadoReporteCommand con máquina de estados
- **Rol:** Backend Developer
- **Componente/Ruta:** `CambiarEstadoReporteCommand.ts` (src/aplicacion/casos-de-uso/reportes/CambiarEstadoReporteCommand.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se modeló el patrón State (ReporteEstado) con una subclase por cada uno de los 5 valores persistidos en reportes.estado, cada una declarando su propio arreglo de transiciones válidas. CambiarEstadoReporteCommand (renombrado desde ActualizarEstadoReporte) consulta ReporteEstado.desde(estadoActual).puedeTransicionarA(destino) en persistir(), sin condicionales dispersos, y agrega publicarEvento() para loguear 'ReporteActualizado' (Observer) tras confirmar la transacción. Se corrigió la regla de negocio heredada: el camino a 'cerrado' ahora es estrictamente lineal (reportado→en_revision→en_atencion→resuelto→cerrado), rechazando con PEA-REP-006 (409) cualquier salto de estados intermedios, incluido el caso explícito del AC (reportado→cerrado directo). autorizar() sigue exigiendo rol municipio/administrador (PEA-REP-007, 403). Se actualizaron docs/SEED.md y seed-reportes.sql para generar historiales consistentes con la nueva máquina de estados, y se agregó un script standalone seed-historial-estado.sql (~380 registros, 1 a 3 transiciones por reporte) para pruebas de UI del timeline. Verificación completa: typecheck, lint, 438/438 tests (coverage 89%/77.9%/90%/90.4%), y build de producción, todos exitosos.

**Archivos Modificados:**
- `src/dominio/estados/ReporteEstado.ts (nuevo)`
- `src/aplicacion/casos-de-uso/reportes/CambiarEstadoReporteCommand.ts (renombrado desde ActualizarEstadoReporte.ts, reescrito)`
- `src/dominio/entidades/Reporte.ts (removido TRANSICIONES_VALIDAS_REPORTE, superseded por ReporteEstado)`
- `src/dominio/puertos/IRepositorioReportes.ts (comentarios actualizados)`
- `src/infraestructura/adaptadores/PrismaReporteRepositorio.ts (comentario actualizado)`
- `app/api/reportes/[id]/estado/route.ts (import y resolve actualizados)`
- `src/presentacion/componentes/municipio/PanelReportesMunicipio.tsx (usa ReporteEstado.desde().transicionesValidas)`
- `tests/unit/CambiarEstadoReporteCommand.test.ts (renombrado desde ActualizarEstadoReporte.test.ts, transición reportado→cerrado corregida a inválida, agregado test de evento)`
- `tests/unit/ReporteEstado.test.ts (nuevo)`
- `tests/unit/PanelReportesMunicipio.test.tsx (opciones del select y test de rechazo de PATCH actualizados)`
- `docs/SEED.md (sección 11: historial con cadena lineal de 1 a 3 transiciones)`
- `scripts/seed/seed-reportes.sql (bloque de historial corregido a cadena lineal)`
- `scripts/seed/seed-historial-estado.sql (nuevo, standalone, ~380 registros)`

**Contratos y API signatures:**
- `abstract class ReporteEstado { abstract readonly valor: EstadoReporte; puedeTransicionarA(destino: EstadoReporte): boolean; get transicionesValidas(): readonly EstadoReporte[]; static desde(valor: EstadoReporte): ReporteEstado }`
- `class EstadoReportado | EstadoEnRevision | EstadoEnAtencion | EstadoResuelto | EstadoCerrado extends ReporteEstado`
- `class CambiarEstadoReporteCommand extends CasoDeUsoBase<ComandoCambiarEstadoReporte, ReporteEstadoActualizado>`
- `interface ComandoCambiarEstadoReporte { reporteId: string; estadoNuevo: EstadoReporte; solicitanteId: string }`


--- 

## 🎯 HU: Historial de cambios de estado de un reporte
*Criterios de Aceptación/Descripción:*
```text
Como municipio quiero consultar el historial completo de cambios de estado de un reporte para tener trazabilidad de la gestión realizada.
```

### 📄 [✔ COMPLETADA] Endpoint de historial de estado por reporte
- **Rol:** Backend Developer
- **Componente/Ruta:** `ListarHistorialReporte.ts` (src/aplicacion/casos-de-uso/reportes/ListarHistorialReporte.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó ListarHistorialReporte siguiendo el mismo Template Method (CasoDeUsoBase) que el resto de casos de uso de reportes: valida el UUID del reporte, autoriza (dueño por comparación directa de reportadoPor, o rol municipio/administrador vía IRepositorioPerfil) y persiste devolviendo el historial ordenado ascendente por registrado_en. Se reutilizó AccesoNoAutorizadoError (PEA-SIS-002) para el caso 'ajeno al reporte' en vez de crear un código nuevo, y ReporteNoEncontradoError (PEA-REP-005) para reporte inexistente/soft-deleted, resuelto antes que la verificación de rol. Se detectó y corrigió un bug de exposición en middleware.ts: la excepción de lectura pública sobre GET /api/reportes usaba coincidencia por prefijo, lo que hubiera dejado esta nueva subruta (GET .../historial) incorrectamente accesible sin sesión — se corrigió a coincidencia exacta y se agregó un test de regresión. La UI (LineaTiempoEstadoReporte + app/reportes/[id]/page.tsx) muestra cada transición con ícono según el estado destino y la fecha en font-mono, manejando los 3 estados de error de la API (401 vía fetchConSesion redirige a login, 403 y 404 se muestran en línea con ícono ⚠️, nunca alert() nativo). Se tuvo que actualizar el fake IRepositorioReportes de 8 archivos de test preexistentes al extender la interfaz del puerto — cambio mecánico sin alterar el comportamiento de esos casos de uso. Verificación completa: typecheck, lint, 456/456 tests (coverage 88.76%/77.59%/89.72%/90.15%) y build de producción, todos exitosos.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/reportes/ListarHistorialReporte.ts (nuevo)`
- `src/aplicacion/dtos/reportes/HistorialReporteDto.ts (nuevo)`
- `app/api/reportes/[id]/historial/route.ts (nuevo)`
- `src/presentacion/componentes/reportes/LineaTiempoEstadoReporte.tsx (nuevo)`
- `app/reportes/[id]/page.tsx (nuevo)`
- `src/dominio/puertos/IRepositorioReportes.ts (extendido: HistorialEstadoItem, obtenerPropietario, listarHistorialEstado)`
- `src/infraestructura/adaptadores/PrismaReporteRepositorio.ts (implementa los 2 métodos nuevos)`
- `middleware.ts (excepción de lectura pública sobre /api/reportes pasa a coincidencia exacta, no por prefijo)`
- `app/api/openapi/route.ts (import de HistorialReporteDto)`
- `tests/unit/ListarHistorialReporte.test.ts (nuevo)`
- `tests/integration/reportes.historial.test.ts (nuevo, incluye el test 403 del Paso 4)`
- `tests/unit/LineaTiempoEstadoReporte.test.tsx (nuevo, incluye verificación de font-mono)`
- `tests/integration/middleware.expiracionSesion.test.ts (test de regresión para la excepción exacta)`
- `tests/unit/CambiarEstadoReporteCommand.test.ts, tests/unit/CrearReporte.test.ts, tests/unit/EvaluarCoincidenciaReporte.test.ts, tests/unit/ListarReportes.test.ts, tests/integration/reportes.actualizarEstado.test.ts, tests/integration/reportes.coincidencia.test.ts, tests/integration/reportes.crear.test.ts, tests/integration/reportes.listar.test.ts (fakes de IRepositorioReportes actualizados con los 2 métodos nuevos del puerto)`

**Contratos y API signatures:**
- `GET /api/reportes/{id}/historial → HistorialEstadoItem[] (200) | 401 PEA-SIS-001 | 403 PEA-SIS-002 | 404 PEA-REP-005`
- `class ListarHistorialReporte extends CasoDeUsoBase<ComandoListarHistorialReporte, HistorialEstadoItem[]>`
- `interface HistorialEstadoItem { id, estadoAnterior, estadoNuevo, usuarioId, registradoEn }`
- `IRepositorioReportes.obtenerPropietario(id): Promise<string | null>`
- `IRepositorioReportes.listarHistorialEstado(reporteId): Promise<HistorialEstadoItem[]>`
- `function LineaTiempoEstadoReporte({ reporteId }: { reporteId: string })`


--- 

## 🎯 HU: Rate limiting anti-saturación en la creación de reportes
*Criterios de Aceptación/Descripción:*
```text
Como sistema quiero limitar la cantidad de reportes por hora de un usuario no verificado para evitar la saturación del panel municipal.
```

### 📄 [✔ COMPLETADA] Decorador ConRateLimitDecorator sobre el caso de uso CrearReporte
- **Rol:** Backend Developer
- **Componente/Ruta:** `ConRateLimitDecorator.ts` (src/infraestructura/decoradores/ConRateLimitDecorator.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó el patrón Decorator envolviendo CrearReporte por composición (no herencia): ConRateLimitDecorator recibe una instancia real de CrearReporte y solo intercepta ejecutar() para evaluar, antes de delegar, un límite de 5 reportes/hora exclusivo de usuarios con estado_verificacion distinto de 'verificado' (consultado vía IRepositorioPerfil). CrearReporte.ts permanece sin ninguna modificación. Se creó un puerto nuevo (IControlDeTasaConReintento) en vez de ampliar IControlDeTasa, para no forzar a ValidadorRateLimit —su único consumidor actual, que solo necesita un booleano— a lidiar con el dato de reintentarEnSegundos que sí necesita este decorador para la cabecera Retry-After. El adaptador UpstashControlDeTasaAntiSaturacion usa un prefijo de Redis distinto del contador general, por lo que ambos límites (3/10min general vía pipeline, 5/hora anti-saturación vía decorador) conviven de forma independiente. Se detectó y corrigió una consecuencia necesaria: al cambiar POST /api/reportes para resolver el decorador en vez del caso de uso directo, dos suites de test de integración preexistentes (reportes.crear.test.ts, reportes.coincidencia.test.ts) dejaron de poder resolver la cadena de DI hasta registrar fakes de IRepositorioPerfil e IControlDeTasaConReintento — se agregaron con estados por defecto que no alteran el comportamiento de esos tests ya existentes. Verificación completa: typecheck, lint, 471/471 tests (coverage 88.95%/77.61%/89.85%/90.33%) y build de producción, todos exitosos.

**Archivos Modificados:**
- `src/infraestructura/decoradores/ConRateLimitDecorator.ts (nuevo)`
- `src/dominio/puertos/IControlDeTasaConReintento.ts (nuevo)`
- `src/infraestructura/adaptadores/UpstashControlDeTasaAntiSaturacion.ts (nuevo)`
- `src/dominio/errores/erroresReportes.ts (LimiteDeReportesExcedidoError acepta reintentarEnSegundos opcional)`
- `src/aplicacion/contenedor-di.ts (registro de IControlDeTasaConReintento)`
- `app/api/reportes/route.ts (POST resuelve ConRateLimitDecorator; cabecera Retry-After en 429)`
- `tests/unit/ConRateLimitDecorator.test.ts (nuevo)`
- `tests/unit/UpstashControlDeTasaAntiSaturacion.test.ts (nuevo)`
- `tests/integration/reportes.crear.test.ts (fakes nuevos + Paso 4: sexto intento rechazado en la misma hora)`
- `tests/integration/reportes.coincidencia.test.ts (fakes nuevos para que el POST end-to-end siga resolviendo)`

**Contratos y API signatures:**
- `class ConRateLimitDecorator { ejecutar(input: EntradaCrearReporte): Promise<ReporteCreado> }`
- `interface IControlDeTasaConReintento { evaluar(identificador): Promise<{ permitido: boolean; reintentarEnSegundos: number }> }`
- `class LimiteDeReportesExcedidoError extends ErrorDominio { constructor(reintentarEnSegundos?: number) }`
- `POST /api/reportes → 429 PEA-REP-004 + cabecera Retry-After (segundos) cuando el límite anti-saturación lo informa`


--- 

## 🎯 HU: Validación estructurada de reportes antes de publicar
*Criterios de Aceptación/Descripción:*
```text
Como sistema quiero validar el esquema y la evidencia fotográfica obligatoria antes de publicar un reporte para que no lleguen datos incompletos al panel municipal.
```

### 📄 [✔ COMPLETADA] Endurecer el pipeline Chain of Responsibility de CrearReporte
- **Rol:** Backend Developer
- **Componente/Ruta:** `ValidacionReporte.ts` (src/aplicacion/pipelines/ValidacionReporte.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se endureció el segundo eslabón del pipeline (ValidadorContenidoImagen) para verificar no solo que la fotoUrl pertenezca a la cuenta de Cloudinary del proyecto, sino que la subida real la haya hecho el mismo usuario que está reportando — cerrando el hueco donde cualquiera podía reutilizar la URL de la foto de un reporte ajeno. Se optó por agregar un método NUEVO al puerto compartido (fueSubidaPor) en vez de modificar la firma de esUrlDeImagenValida, precisamente porque ese puerto también lo usan RegistrarMascota y ActualizarMascota (Módulo 1, fuera del alcance de este ticket) y su flujo de subida nunca tagueó la foto por usuario — cambiar la firma existente los habría roto en producción. La verificación de ownership se resuelve consultando el Admin API de Cloudinary (nunca confiando en el path de la URL, manipulable por el cliente) contra la metadata context.custom.usuario_id que se graba al momento de la subida real — para lo cual fue necesario que FormularioReporteWizard.tsx (fuera del archivo destino del ticket, pero imprescindible para que el chequeo no sea vacío) adjunte esa metadata usando la sesión Supabase del propio navegador, mismo patrón ya establecido por BadgeVerificacion.tsx. ValidadorGeolocalizacion (Paso 3) se revisó y ya cumplía el criterio de aceptación desde una actividad previa, sin necesitar cambios. Verificación completa: typecheck, lint, 479/479 tests (coverage 89.04%/77.61%/89.9%/90.4%) y build de producción, todos exitosos.

**Archivos Modificados:**
- `src/dominio/puertos/IAlmacenamientoImagenes.ts (agrega fueSubidaPor)`
- `src/infraestructura/adaptadores/CloudinaryStorageAdapter.ts (implementa fueSubidaPor vía Admin API)`
- `src/aplicacion/pipelines/ValidacionReporte.ts (ValidadorContenidoImagen verifica ownership)`
- `src/presentacion/componentes/reportes/FormularioReporteWizard.tsx (adjunta context=usuario_id al subir)`
- `tests/unit/CloudinaryStorageAdapter.test.ts (tests de fueSubidaPor)`
- `tests/unit/ValidacionReporte.test.ts (AC: fotoUrl no subida por el usuario autenticado)`
- `tests/unit/FormularioReporteWizard.test.tsx (mock de crearClienteSupabaseNavegador)`
- `tests/integration/reportes.crear.test.ts (Paso 4: AC end-to-end + fake con subidaPorElUsuario configurable)`
- `tests/integration/reportes.coincidencia.test.ts, tests/unit/CrearReporte.test.ts, tests/unit/RegistrarMascota.test.ts, tests/unit/ActualizarMascota.test.ts, tests/integration/mascotas.autorizacion.test.ts, tests/integration/mascotas.baja.test.ts, tests/integration/mascotas.registro.test.ts (fakes IAlmacenamientoImagenes actualizados con el método nuevo del puerto)`

**Contratos y API signatures:**
- `interface IAlmacenamientoImagenes { esUrlDeImagenValida(url): boolean; fueSubidaPor(url, usuarioId): Promise<boolean> }`
- `class CloudinaryStorageAdapter implements IAlmacenamientoImagenes — fueSubidaPor consulta cloudinary.v2.api.resource(publicId, { context: true })`
- `ValidadorContenidoImagen (Chain of Responsibility) — corta con PEA-REP-002 (400) tanto por cuenta de Cloudinary incorrecta como por uploader distinto al reportadoPor`


--- 

