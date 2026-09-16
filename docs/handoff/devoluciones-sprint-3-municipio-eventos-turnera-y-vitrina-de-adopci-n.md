# Handoffs y Entregables del Sprint - Sprint 3: Municipio — Eventos, Turnera y Vitrina de Adopción

**Objetivo:** Entregar al municipio sus herramientas operativas centrales (eventos, motor de turnera, dashboard y vitrina de adopción) que serán el eje de la presentación.
**Capacidad:** 40 Ptos | **Duración:** 1 Semanas
**Estado del Sprint:** COMPLETADO

---

## HU: Alta rápida de operativos municipales

_Criterios de Aceptación/Descripción:_

```text
Como municipio quiero cargar un operativo con fecha, dirección, cupos y requisitos en segundos para convocar a la comunidad sin fricción administrativa.
```

### [COMPLETADA] Endpoint CrearEvento restringido a Municipio

- **Rol:** Full Stack Developer
- **Componente/Ruta:** `CrearEvento.ts` (src/aplicacion/casos-de-uso/municipio/CrearEvento.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementó CrearEvento siguiendo el mismo Template Method (CasoDeUsoBase) que el resto de casos de uso de escritura: valida el payload con Zod (mapeando explícitamente una fecha pasada a PEA-MUN-004, ya que ERRORS.md la documenta como error de capa Aplicación/Zod, replicando el patrón de ValidadorEsquemaZod en ValidacionReporte.ts), autoriza contra rol municipio/administrador vía IRepositorioPerfil (PEA-MUN-005), y persiste vía un nuevo repositorio Prisma. La tabla eventos, su CHECK (cupos_totales > 0) y ambas políticas RLS (eventos_select_publico, eventos_crud_municipio) ya existían desde el modelado inicial del proyecto — se verificó esto contra prisma/schema.prisma y la migración de RLS antes de escribir código, evitando una migración redundante. El AC de 'disponible en el calendario en cuestión de segundos' se satisface por diseño: la RLS pública no exige ningún estado intermedio, así que el propio INSERT ya deja el evento visible sin necesidad de caché ni paso de aprobación. Se detectó que /api/municipio no estaba en RUTAS_API_PROTEGIDAS de middleware.ts (aunque la página /municipio/eventos/nuevo sí lo estaba vía el prefijo de rol) y se corrigió para mantener la defensa en profundidad ya establecida en el resto de la API. Verificación completa: typecheck, lint, 506/506 tests (coverage 89.37%/78.31%/90.3%/90.71%) y build de producción, todos exitosos.

**Archivos Modificados:**

- `src/aplicacion/dtos/municipio/CrearEventoDto.ts (nuevo)`
- `src/aplicacion/casos-de-uso/municipio/CrearEvento.ts (nuevo)`
- `src/dominio/entidades/Evento.ts (nuevo)`
- `src/dominio/errores/erroresMunicipio.ts (nuevo)`
- `src/dominio/puertos/IRepositorioEventos.ts (nuevo)`
- `src/infraestructura/adaptadores/PrismaEventoRepositorio.ts (nuevo)`
- `app/api/municipio/eventos/route.ts (nuevo)`
- `app/municipio/eventos/nuevo/page.tsx (nuevo)`
- `scripts/seed/seed-eventos.sql (nuevo)`
- `src/aplicacion/contenedor-di.ts (registro de IRepositorioEventos)`
- `middleware.ts (protege /api/municipio)`
- `app/api/openapi/route.ts (import de CrearEventoDto)`
- `tests/unit/CrearEvento.test.ts (nuevo)`
- `tests/unit/PrismaEventoRepositorio.test.ts (nuevo)`
- `tests/unit/PaginaNuevoEvento.test.tsx (nuevo)`
- `tests/integration/municipio.eventos.crear.test.ts (nuevo, incluye el 403 del Paso 4)`
- `tests/integration/middleware.expiracionSesion.test.ts (caso nuevo para /api/municipio/eventos)`

**Contratos y API signatures:**

- `POST /api/municipio/eventos → EventoCreado (201) | 400 PEA-SIS-005/PEA-MUN-004 | 401 PEA-SIS-001 | 403 PEA-MUN-005`
- `class CrearEvento extends CasoDeUsoBase<EntradaCrearEvento, EventoCreado, ComandoCrearEvento>`
- `interface IRepositorioEventos { crear(datos: DatosNuevoEvento): Promise<Evento> }`
- `class FechaEventoPasadaError extends ErrorDominio (PEA-MUN-004, 400)`
- `class SoloMunicipioAdministraEventosError extends ErrorDominio (PEA-MUN-005, 403)`

---

## HU: Configuración de cupos por tipo de operativo

_Criterios de Aceptación/Descripción:_

```text
Como municipio quiero configurar los cupos de cada operativo de forma independiente por tipo para ajustar la capacidad real de cada campaña.
```

### [COMPLETADA] Generación de turnos disponibles a partir de cupos_totales del evento

- **Rol:** Backend Developer
- **Componente/Ruta:** `GenerarTurnosEvento.ts` (src/aplicacion/casos-de-uso/municipio/GenerarTurnosEvento.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementó el Motor de Turnera compartido como patrón Strategy genérico sobre la fuente de disponibilidad (ProveedorTurnera<TFuente>), con TurneraMunicipio como primera implementación concreta — deliberadamente tipada por parámetro genérico en vez de una interfaz con forma fija, para no forzar a una futura TurneraVeterinario (Módulo 4, disponibilidad semanal recurrente, fuera de este alcance) a encajar en un contrato pensado solo para eventos puntuales. GenerarTurnosEvento separa el cálculo (delegado 100% a la estrategia) de la reconciliación contra lo ya persistido (genérica, vive acá): solo inserta la diferencia entre el objetivo y lo que ya existe en estado 'disponible', nunca actualiza ni borra, lo que además de cumplir el AC de la actividad hace que la operación sea segura de repetir para el mismo evento sin necesidad de un endpoint de edición todavía inexistente. Se detectó que Prisma 5.16 (sin el preview feature createManyAndReturn) no permite recuperar filas insertadas con createMany, por lo que PrismaTurnoRepositorio inserta con creates individuales dentro de una única transacción — mantiene atomicidad sin depender de una feature no habilitada en el schema. El seed nuevo se acotó explícitamente a proveedor_tipo='municipio' (150 de los 260 turnos documentados en SEED.md), dejando la mitad veterinario para cuando se implemente el Módulo 4, en vez de inventar datos de un módulo que todavía no existe. Verificación completa: typecheck, lint, 522/522 tests (coverage 89.53%/78.16%/90.47%/90.85%) y build de producción, todos exitosos.

**Archivos Modificados:**

- `src/dominio/estrategias/ProveedorTurnera.ts (nuevo — Strategy + TurneraMunicipio)`
- `src/dominio/puertos/IRepositorioTurnos.ts (nuevo)`
- `src/infraestructura/adaptadores/PrismaTurnoRepositorio.ts (nuevo)`
- `src/aplicacion/casos-de-uso/municipio/GenerarTurnosEvento.ts (nuevo)`
- `src/aplicacion/casos-de-uso/municipio/CrearEvento.ts (invoca GenerarTurnosEvento tras el INSERT)`
- `src/aplicacion/contenedor-di.ts (registro de IRepositorioTurnos y ProveedorTurneraMunicipio)`
- `scripts/seed/seed-turnos-municipio.sql (nuevo)`
- `tests/unit/TurneraMunicipio.test.ts (nuevo)`
- `tests/unit/GenerarTurnosEvento.test.ts (nuevo, incluye el AC de 10 cupos y el Paso 3)`
- `tests/unit/PrismaTurnoRepositorio.test.ts (nuevo)`
- `tests/unit/CrearEvento.test.ts (nuevo parámetro de constructor + test de invocación a GenerarTurnosEvento)`
- `tests/integration/municipio.eventos.crear.test.ts (Paso 4: verifica exactamente 10 filas en turnos end-to-end)`

**Contratos y API signatures:**

- `interface ProveedorTurnera<TFuente> { readonly proveedorTipo; calcularFranjasObjetivo(fuente: TFuente): DatosFranjaTurno[] }`
- `class TurneraMunicipio implements ProveedorTurnera<FuenteDisponibilidadEvento>`
- `interface IRepositorioTurnos { contarDisponiblesPorEvento(eventoId): Promise<number>; crearLote(turnos): Promise<TurnoGenerado[]> }`
- `class GenerarTurnosEvento { ejecutar(evento: { id, municipioId, fecha, cuposTotales }): Promise<TurnoGenerado[]> }`
- `DI tokens: 'IRepositorioTurnos' → PrismaTurnoRepositorio, 'ProveedorTurneraMunicipio' → TurneraMunicipio`

---

## HU: Gestión de la vitrina de adopción institucional

_Criterios de Aceptación/Descripción:_

```text
Como municipio quiero publicar, editar y dar de baja fichas de animales en adopción para visibilizar a los animales bajo mi custodia con total transparencia.
```

### [COMPLETADA] CRUD de vitrina_adopcion restringido a Municipio

- **Rol:** Full Stack Developer
- **Componente/Ruta:** `PublicarFichaAdopcion.ts` (src/aplicacion/casos-de-uso/municipio/PublicarFichaAdopcion.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementaron los cuatro casos de uso de la vitrina de adopción institucional siguiendo el mismo Template Method (CasoDeUsoBase) que el resto de casos de uso de escritura del proyecto, reutilizando la política RLS vitrina_crud_municipio y el modelo Prisma VitrinaAdopcion que ya existían desde el modelado inicial del Módulo 3 — no fue necesaria ninguna migración. Se detectó una laguna real en docs/ERRORS.md: no existía un código 404 específico para 'ficha de adopción no encontrada' (PEA-MUN-003 está textualmente acotado a 'evento o turno'), así que se agregó PEA-MUN-008 siguiendo el mismo patrón numérico y de mensaje que el resto de entidades del proyecto — es el único código nuevo de esta actividad, todo lo demás (incluido el 403 de autorización) reutiliza códigos ya existentes. A diferencia del ticket previo de ActualizarMascota/DarDeBajaMascota (que deliberadamente se quedó solo en la capa de aplicación, documentado explícitamente en su propio DTO), esta actividad sí requería construir la capa HTTP completa (rutas POST/GET/PATCH/DELETE) porque el propio ticket pide explícitamente la página del panel (Paso 3) y un test de integración (Paso 4) — ninguno de los dos es posible sin rutas reales. Se agregó también ListarFichasAdopcion (fuera del checklist literal pero imprescindible) para que el panel municipal tenga algo que listar, distinguiéndose de una futura vitrina pública (Post-MVP) en que el municipio ve TODAS sus fichas sin importar el estado. Verificación completa: typecheck, lint, 578/578 tests (coverage 88.29%/75.89%/89.52%/89.44%) y build de producción, todos exitosos.

**Archivos Modificados:**

- `src/dominio/entidades/FichaAdopcion.ts (nuevo)`
- `src/dominio/puertos/IRepositorioFichasAdopcion.ts (nuevo)`
- `src/dominio/errores/erroresMunicipio.ts (agrega FichaAdopcionNoEncontradaError)`
- `src/infraestructura/adaptadores/PrismaFichaAdopcionRepositorio.ts (nuevo)`
- `src/aplicacion/dtos/municipio/FichaAdopcionDto.ts (nuevo)`
- `src/aplicacion/casos-de-uso/municipio/PublicarFichaAdopcion.ts (nuevo)`
- `src/aplicacion/casos-de-uso/municipio/ActualizarFichaAdopcion.ts (nuevo)`
- `src/aplicacion/casos-de-uso/municipio/DarDeBajaFichaAdopcion.ts (nuevo)`
- `src/aplicacion/casos-de-uso/municipio/ListarFichasAdopcion.ts (nuevo)`
- `src/aplicacion/contenedor-di.ts (registro de IRepositorioFichasAdopcion)`
- `app/api/municipio/adopciones/route.ts (nuevo: GET/POST)`
- `app/api/municipio/adopciones/[id]/route.ts (nuevo: PATCH/DELETE)`
- `app/municipio/adopciones/page.tsx (nuevo)`
- `app/api/openapi/route.ts (import de FichaAdopcionDto)`
- `docs/ERRORS.md (agrega PEA-MUN-008)`
- `scripts/seed/seed-vitrina-adopcion.sql (nuevo)`
- `tests/unit/PublicarFichaAdopcion.test.ts, ActualizarFichaAdopcion.test.ts, DarDeBajaFichaAdopcion.test.ts, ListarFichasAdopcion.test.ts, PrismaFichaAdopcionRepositorio.test.ts, PaginaAdopcionesMunicipio.test.tsx (nuevos)`
- `tests/integration/municipio.adopciones.test.ts (nuevo, incluye el 403 del Paso 4)`

**Contratos y API signatures:**

- `POST /api/municipio/adopciones → FichaAdopcion (201) | 400 PEA-SIS-005 | 401 PEA-SIS-001 | 403 PEA-MUN-005`
- `GET /api/municipio/adopciones → PaginaFichasAdopcion (200) | 401 | 403`
- `PATCH /api/municipio/adopciones/{id} → FichaAdopcion (200) | 400 | 401 | 403 | 404 PEA-MUN-008`
- `DELETE /api/municipio/adopciones/{id} → FichaAdopcion con estado='baja' (200) | 401 | 403 | 404 PEA-MUN-008`
- `class PublicarFichaAdopcion | ActualizarFichaAdopcion | DarDeBajaFichaAdopcion | ListarFichasAdopcion extends CasoDeUsoBase`
- `interface IRepositorioFichasAdopcion { crear, buscarPorId, actualizar, darDeBaja, listarPorMunicipio }`
- `class FichaAdopcionNoEncontradaError extends ErrorDominio (PEA-MUN-008, 404)`

---

## HU: Dashboard analítico con mapas de calor

_Criterios de Aceptación/Descripción:_

```text
Como municipio quiero consultar un dashboard con mapas de calor de incidentes filtrable por categoría y período para decidir dónde enfocar mis recursos.
```

### [COMPLETADA] Builder de consultas agregadas sobre vistas materializadas

- **Rol:** Backend Developer
- **Componente/Ruta:** `DashboardMunicipalBuilder.ts` (src/aplicacion/builders/DashboardMunicipalBuilder.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementó el patrón Builder para armar consultas agregadas del dashboard municipal exclusivamente contra vistas materializadas, con la garantía estructural (por firma de constructor, no solo por convención) de que el caso de uso jamás puede depender de un puerto sobre tablas transaccionales en vivo. Se detectó una laguna real: las vistas materializadas estaban documentadas en SCHEMA.md pero nunca migradas a la base de datos, y su definición original no tenía ninguna dimensión geográfica pese a que la historia de producto (MUN-04, mapas de calor por zona) y el propio AC de este ticket (filtro por zona) la requerían — se extendió la vista con una grilla zona_lat/zona_lng (redondeo a 2 decimales) y se documentó el cambio en SCHEMA.md antes de escribir la migración. Se creó la primera Edge Function del proyecto (Deno, fuera del árbol de compilación/lint de Next.js — se excluyó explícitamente de tsconfig.json y .eslintrc.json) que invoca una función Postgres SECURITY DEFINER vía RPC para refrescar ambas vistas con REFRESH CONCURRENTLY, lo que exigió agregar índices UNIQUE a cada una (requisito de Postgres para ese modo de refresco sin bloquear lecturas). La página app/municipio/dashboard/page.tsx ya existía de un ticket anterior (panel de reportes del Módulo 2) — se extendió en vez de reemplazarla, y se corrigieron/actualizaron los tests preexistentes que dicha extensión afectaba (mensaje de error ampliado, nuevo componente en la misma página). El test de rendimiento del Paso 4 no depende de una base de datos real (fuera del alcance de Jest): simula miles de filas ya agregadas en memoria y mide el p95 del código de aplicación, demostrando que el tiempo no escala con el volumen histórico porque nunca se calcula nada pesado en el camino del request — la garantía de fondo (Postgres nunca escanea reportes/turnos en vivo) queda asegurada por el diseño del puerto, no por el test en sí. Verificación completa: typecheck, lint, 610/610 tests (coverage 88.97%/77.59%/89.6%/90.22%) y build de producción, todos exitosos.

**Archivos Modificados:**

- `src/aplicacion/builders/DashboardMunicipalBuilder.ts (nuevo)`
- `src/aplicacion/casos-de-uso/municipio/ObtenerDashboardMunicipal.ts (nuevo)`
- `src/aplicacion/dtos/municipio/DashboardMunicipalDto.ts (nuevo)`
- `src/dominio/puertos/IRepositorioDashboardMunicipal.ts (nuevo)`
- `src/infraestructura/adaptadores/PrismaDashboardMunicipalRepositorio.ts (nuevo)`
- `src/dominio/errores/erroresMunicipio.ts (mensaje de PEA-MUN-005 ampliado)`
- `src/aplicacion/contenedor-di.ts (registro de IRepositorioDashboardMunicipal)`
- `prisma/schema.prisma (modelos MetricaReportePeriodo/MetricaTurnoPeriodo)`
- `prisma/migrations/20260901120000_agrega_vistas_materializadas_dashboard/migration.sql (nueva)`
- `app/api/municipio/dashboard/route.ts (nuevo)`
- `app/api/openapi/route.ts (import de DashboardMunicipalDto)`
- `app/municipio/dashboard/page.tsx (extendido, no reemplazado)`
- `src/presentacion/componentes/municipio/DashboardAnaliticoMunicipal.tsx (nuevo)`
- `src/presentacion/componentes/mapas/MapaCalorMunicipal.tsx (nuevo)`
- `supabase/functions/refresh-metricas-dashboard/index.ts (nuevo, Edge Function Deno)`
- `scripts/seed/refresh-metricas-dashboard.sql (nuevo)`
- `tsconfig.json / .eslintrc.json (excluyen supabase/functions/**)`
- `docs/SCHEMA.md, docs/ERRORS.md, docs/SETUP.md (actualizados)`
- `tests/unit/DashboardMunicipalBuilder.test.ts, ObtenerDashboardMunicipal.test.ts, PrismaDashboardMunicipalRepositorio.test.ts, DashboardAnaliticoMunicipal.test.tsx (nuevos)`
- `tests/integration/municipio.dashboard.test.ts (nuevo, incluye el test de rendimiento del Paso 4)`
- `tests/unit/PaginaDashboardMunicipio.test.tsx, PaginaAdopcionesMunicipio.test.tsx, PaginaNuevoEvento.test.tsx (ajustados por el nuevo componente/mensaje)`

**Contratos y API signatures:**

- `class DashboardMunicipalBuilder { conPeriodo(desde?, hasta?); conTipoReporte(tipo?); conZona(zona?); construir(repositorio): Promise<DashboardMunicipal> }`
- `interface IRepositorioDashboardMunicipal { obtenerMetricasReportes(filtros): Promise<MetricaReportePeriodo[]>; obtenerMetricasTurnos(filtros): Promise<MetricaTurnoPeriodo[]> }`
- `GET /api/municipio/dashboard → DashboardMunicipal (200) | 400 PEA-SIS-005 | 401 PEA-SIS-001 | 403 PEA-MUN-005`
- `CREATE MATERIALIZED VIEW mv_metricas_reportes_periodo (periodo, tipo, estado, zona_lat, zona_lng, total)`
- `CREATE MATERIALIZED VIEW mv_metricas_turnos_periodo (periodo, proveedor_tipo, estado, total)`
- `FUNCTION refrescar_metricas_dashboard() — invocada por supabase/functions/refresh-metricas-dashboard/ vía RPC`

---

## HU: Exportación de resumen de actividad

_Criterios de Aceptación/Descripción:_

```text
Como municipio quiero exportar un resumen de la actividad del período en CSV para comunicarlo a la comunidad o a medios.
```

### [COMPLETADA] Visitor de exportación a CSV del dashboard municipal

- **Rol:** Backend Developer
- **Componente/Ruta:** `ExportadorReporteVisitor.ts` (src/aplicacion/visitors/ExportadorReporteVisitor.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementó ExportadorReporteVisitor con patrón Visitor de doble despacho real (ElementoMetricaReporte/ElementoMetricaTurno como elementos visitables, AgregadoDashboardMunicipal como estructura recorrida), que genera un CSV con dos secciones (reportes y turnos) escapado según RFC 4180. El caso de uso ExportarDashboardMunicipal valida el rango de fechas con Zod (ambas requeridas, fin > inicio, mapeado a PEA-MUN-007/400), autoriza solo roles municipio/administrador, y reutiliza el mismo DashboardMunicipalBuilder que ObtenerDashboardMunicipal para garantizar estructuralmente que el CSV coincide con los datos en pantalla. El endpoint GET /api/municipio/dashboard/exportar responde con Content-Disposition: attachment y un nombre de archivo con la fecha de generación — primera respuesta no-JSON del backend. Se agregó un botón 'Exportar CSV' en el dashboard, habilitado solo con ambas fechas completas. Cobertura: 3 archivos de test nuevos (16 unit + 7 integración), 95 suites / 633 tests totales en verde, typecheck/lint/build limpios.

**Archivos Modificados:**

- `src/dominio/errores/erroresMunicipio.ts`
- `src/aplicacion/dtos/municipio/ExportarDashboardMunicipalDto.ts`
- `src/aplicacion/visitors/ExportadorReporteVisitor.ts`
- `src/aplicacion/casos-de-uso/municipio/ExportarDashboardMunicipal.ts`
- `app/api/municipio/dashboard/exportar/route.ts`
- `app/api/openapi/route.ts`
- `src/presentacion/componentes/municipio/DashboardAnaliticoMunicipal.tsx`
- `tests/unit/ExportadorReporteVisitor.test.ts`
- `tests/unit/ExportarDashboardMunicipal.test.ts`
- `tests/integration/municipio.dashboard.exportar.test.ts`

**Contratos y API signatures:**

- `interface VisitorDashboardMunicipal { visitarMetricaReporte(fila: MetricaReportePeriodo): void; visitarMetricaTurno(fila: MetricaTurnoPeriodo): void; }`
- `class ElementoMetricaReporte { constructor(fila: MetricaReportePeriodo); aceptar(visitor: VisitorDashboardMunicipal): void }`
- `class ElementoMetricaTurno { constructor(fila: MetricaTurnoPeriodo); aceptar(visitor: VisitorDashboardMunicipal): void }`
- `class AgregadoDashboardMunicipal { constructor(metricasReportes: MetricaReportePeriodo[], metricasTurnos: MetricaTurnoPeriodo[]); elementosReportes(): ElementoMetricaReporte[]; elementosTurnos(): ElementoMetricaTurno[] }`
- `class ExportadorReporteVisitor implements VisitorDashboardMunicipal { generarCsv(agregado: AgregadoDashboardMunicipal): string }`
- `class ExportarDashboardMunicipal extends CasoDeUsoBase<{datosCrudos: unknown; municipioId: string}, {csv: string; nombreArchivo: string}, ...>`
- `class RangoFechasInvalidoExportacionError extends ErrorDominio (PEA-MUN-007, 400)`
- `GET /api/municipio/dashboard/exportar?periodoDesde&periodoHasta -> text/csv con Content-Disposition: attachment`

---

## HU: Calendario público de operativos

_Criterios de Aceptación/Descripción:_

```text
Como vecino quiero consultar el calendario y mapa de operativos municipales sin necesidad de iniciar sesión para enterarme fácilmente dónde y cuándo asistir.
```

### [COMPLETADA] Endpoint público de eventos con acceso anónimo

- **Rol:** Full Stack Developer
- **Componente/Ruta:** `ListarEventosPublico.ts` (src/aplicacion/casos-de-uso/municipio/ListarEventosPublico.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementó ListarEventosPublico (Template Method vía CasoDeUsoBase) con autorizar() como no-op explícito, replicando el criterio ya usado en ListarReportes para exponer una consulta anónima real. IRepositorioEventos se extendió con listar()/FiltrosListadoEventos/PaginaEventos y PrismaEventoRepositorio implementa la paginación server-side (tope 50, orden por fecha ascendente) sobre eventos activos (deleted_at IS NULL). La RLS eventos_select_publico + GRANT SELECT ON eventos TO anon ya estaban aplicadas desde una migración previa, así que Paso 1 del ticket no requirió SQL nuevo. Se agregó GET al route.ts existente de /api/municipio/eventos (el POST de CrearEvento no cambia) y se ajustó middleware.ts con una excepción de coincidencia EXACTA (no por prefijo) tanto para el endpoint (RUTAS_API_LECTURA_PUBLICA) como para la página (nueva RUTAS_PAGINA_LECTURA_PUBLICA), dejando /municipio/eventos/nuevo y el resto de /municipio protegidos sin cambios. La página pública app/municipio/eventos/page.tsx ofrece vista de calendario (agenda por día) y mapa Leaflet (nuevo Flyweight de íconos por tipo, iconosEventoFlyweight.ts, mismo patrón que iconosReporteFlyweight.ts). El seed de 15 eventos ya existía en scripts/seed/seed-eventos.sql con el volumen exacto pedido, así que el requerimiento de datos semilla no necesitó cambios. Se actualizaron los fakes de IRepositorioEventos en tests preexistentes (CrearEvento.test.ts, municipio.eventos.crear.test.ts) para cumplir la interfaz ampliada, y se sumaron/ajustaron pruebas en middleware.expiracionSesion.test.ts para cubrir la nueva excepción de acceso público sin romper la cobertura de expiración de sesión existente. 97 suites / 652 tests en verde, typecheck/lint/build limpios.

**Archivos Modificados:**

- `src/dominio/puertos/IRepositorioEventos.ts`
- `src/infraestructura/adaptadores/PrismaEventoRepositorio.ts`
- `src/aplicacion/dtos/municipio/ListarEventosPublicoDto.ts`
- `src/aplicacion/casos-de-uso/municipio/ListarEventosPublico.ts`
- `app/api/municipio/eventos/route.ts`
- `app/api/openapi/route.ts`
- `middleware.ts`
- `src/presentacion/componentes/mapas/iconosEventoFlyweight.ts`
- `src/presentacion/componentes/mapas/MapaEventos.tsx`
- `app/municipio/eventos/page.tsx`
- `docs/SITEMAP.md`
- `tests/unit/ListarEventosPublico.test.ts`
- `tests/unit/CrearEvento.test.ts`
- `tests/integration/municipio.eventos.listarPublico.test.ts`
- `tests/integration/municipio.eventos.crear.test.ts`
- `tests/integration/middleware.expiracionSesion.test.ts`

**Contratos y API signatures:**

- `interface FiltrosListadoEventos { tipo?: string; fechaDesde?: Date; fechaHasta?: Date }`
- `interface EventoListado { id, municipioId, titulo, tipo, direccion, latitud, longitud, fecha, cuposTotales, requisitos }`
- `interface PaginaEventos { items: EventoListado[]; total; pagina; porPagina }`
- `IRepositorioEventos.listar(filtros: FiltrosListadoEventos, pagina: number, porPagina: number): Promise<PaginaEventos>`
- `class ListarEventosPublico extends CasoDeUsoBase<ParametrosListarEventosPublico, PaginaEventos>`
- `GET /api/municipio/eventos?pagina&porPagina&tipo&fechaDesde&fechaHasta -> 200 PaginaEventos | 400 PEA-SIS-005 — sin autenticación`
- `obtenerIconoEvento(tipo: string): L.DivIcon (Flyweight)`
- `MapaEventos({ eventos, centro })`

---

## HU: Reserva de turno en un operativo municipal

_Criterios de Aceptación/Descripción:_

```text
Como vecino quiero reservar un turno dentro de un operativo con cupo disponible para asegurarme un lugar sin hacer fila.
```

### [COMPLETADA] Comando ReservarTurnoCommand con control optimista de concurrencia

- **Rol:** Backend Developer
- **Componente/Ruta:** `ReservarTurnoCommand.ts` (src/aplicacion/casos-de-uso/turnos/ReservarTurnoCommand.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementó ReservarTurnoCommand (Command GoF + Template Method vía CasoDeUsoBase) con autorizar() como no-op explícito: cualquier usuario autenticado puede reservar un turno 'disponible' para sí mismo, sin restricción de rol, consistente con la RLS turnos_update ya vigente. persistir() implementa el control optimista de concurrencia literal de docs/SCHEMA.md: lee version/estado actuales vía obtenerActual() y ejecuta un UPDATE condicionado (reservar()) que devuelve null ante 0 filas afectadas — mapeado a TurnoYaReservadoError (PEA-MUN-001, 409) en vez de un error de sistema. Un turno inexistente o soft-deleted resuelve en EventoOTurnoNoEncontradoError (PEA-MUN-003, 404). Ambos códigos ya existían verbatim en docs/ERRORS.md, así que solo se agregaron las clases de dominio. publicarEvento (Observer) inserta la notificación tipo='turno_confirmado' desacoplada de la transacción de reserva, mismo criterio que ResolverVerificacionCommand. Se agregó POST /api/turnos/reservar (reservadoPor siempre de la sesión) y se protegió el nuevo prefijo /api/turnos en middleware.ts. El test de integración crítico (tests/integration/turnos.reservar.test.ts) dispara dos requests concurrentes REALES vía Promise.all contra el mismo turnoId, usando un repositorio en memoria cuyo reservar() no tiene ningún await entre la comprobación de version/estado y la escritura — replicando fielmente la atomicidad de un UPDATE...WHERE de Postgres frente a dos transacciones concurrentes — y verifica que exactamente una de las dos reciba 200 y la otra 409/PEA-MUN-001 (validado repitiendo la corrida 5 veces sin fallas). Se ajustaron fakes de IRepositorioTurnos en tests preexistentes (GenerarTurnosEvento.test.ts, municipio.eventos.crear.test.ts) para cumplir la interfaz ampliada, sin cambios de comportamiento en esos casos de uso. El seed de turnos con estado='disponible' (scripts/seed/seed-turnos-municipio.sql) ya existía con el criterio pedido por el ticket, así que no requirió cambios. 99 suites / 670 tests en verde, typecheck/lint/build limpios.

**Archivos Modificados:**

- `src/dominio/puertos/IRepositorioTurnos.ts`
- `src/dominio/errores/erroresMunicipio.ts`
- `src/infraestructura/adaptadores/PrismaTurnoRepositorio.ts`
- `src/aplicacion/dtos/turnos/ReservarTurnoDto.ts`
- `src/aplicacion/casos-de-uso/turnos/ReservarTurnoCommand.ts`
- `app/api/turnos/reservar/route.ts`
- `app/api/openapi/route.ts`
- `middleware.ts`
- `tests/unit/ReservarTurnoCommand.test.ts`
- `tests/unit/PrismaTurnoRepositorio.test.ts`
- `tests/unit/GenerarTurnosEvento.test.ts`
- `tests/integration/turnos.reservar.test.ts`
- `tests/integration/municipio.eventos.crear.test.ts`
- `tests/integration/middleware.expiracionSesion.test.ts`

**Contratos y API signatures:**

- `interface TurnoActual { id, estado, version }`
- `interface TurnoReservado { id, estado, reservadoPor, version }`
- `IRepositorioTurnos.obtenerActual(turnoId: string): Promise<TurnoActual | null>`
- `IRepositorioTurnos.reservar(turnoId: string, reservadoPor: string, versionEsperada: number): Promise<TurnoReservado | null>`
- `class ReservarTurnoCommand extends CasoDeUsoBase<EntradaReservarTurno, TurnoReservadoDto, ComandoReservarTurno>`
- `class TurnoYaReservadoError extends ErrorDominio (PEA-MUN-001, 409)`
- `class EventoOTurnoNoEncontradoError extends ErrorDominio (PEA-MUN-003, 404)`
- `POST /api/turnos/reservar { turnoId } -> 200 TurnoReservado | 400/401/404/409 — requiere sesión, reservadoPor sale siempre de ella`

---

## HU: Monitoreo en tiempo real del turno reservado

_Criterios de Aceptación/Descripción:_

```text
Como vecino quiero monitorear el estado de mi turno reservado en tiempo real para saber si sigue vigente sin tener que consultar por teléfono.
```

### [COMPLETADA] Suscripción Realtime a turnos propios

- **Rol:** Frontend Developer
- **Componente/Ruta:** `MisTurnos.tsx` (app/turnos/mis-turnos/page.tsx)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementó ListarMisTurnos (Template Method vía CasoDeUsoBase) con autorizar() como no-op explícito, replicando el criterio de ListarNotificacionesPropias: la pertenencia la impone el propio repositorio (siempre filtra por reservado_por), no un chequeo aparte. IRepositorioTurnos se extendió con listarPropios()/TurnoPropio/PaginaTurnosPropios y PrismaTurnoRepositorio implementa la paginación server-side (tope 50, orden por franja_inicio ascendente) uniendo el título del evento cuando corresponde. GET /api/turnos/mis-turnos ya queda protegido por el prefijo /api/turnos agregado en el ticket anterior, sin cambios a middleware.ts. La pieza central del ticket, app/turnos/mis-turnos/page.tsx (componente MisTurnos), replica la excepción arquitectónica ya documentada en BadgeVerificacion.tsx/CampanaNotificaciones.tsx: se suscribe directo a Supabase Realtime (Postgres Changes, evento UPDATE, filter reservado_por=eq.<usuarioId>) para reflejar sin recargar cuando un turno cambia de estado, resolviendo el usuarioId propio vía supabase.auth.getUser() en el cliente (mismo criterio que FormularioReporteWizard.tsx) ya que la página necesita ese id incluso con la lista inicial vacía. Cada estado se muestra siempre con ícono + texto (paleta slate/blue/red del Design System), nunca solo color. El test Paso 4 (tests/unit/MisTurnos.test.tsx) sigue el mismo patrón ya usado en este repo para verificar comportamiento Realtime: captura el callback registrado en el canal mockeado y lo invoca manualmente para simular una cancelación 'desde otra sesión', verificando que la UI se actualiza sin ningún refetch. El seed de turnos reservados por dueños (scripts/seed/seed-turnos-municipio.sql) ya cumplía el volumen y criterio pedidos, así que no requirió cambios. Se ajustaron fakes de IRepositorioTurnos en tests preexistentes (GenerarTurnosEvento, ReservarTurnoCommand, municipio.eventos.crear, turnos.reservar) para cumplir la interfaz ampliada, sin cambios de comportamiento. 102 suites / 691 tests en verde, typecheck/lint/build limpios.

**Archivos Modificados:**

- `src/dominio/puertos/IRepositorioTurnos.ts`
- `src/infraestructura/adaptadores/PrismaTurnoRepositorio.ts`
- `src/aplicacion/dtos/turnos/ListarMisTurnosDto.ts`
- `src/aplicacion/casos-de-uso/turnos/ListarMisTurnos.ts`
- `app/api/turnos/mis-turnos/route.ts`
- `app/turnos/mis-turnos/page.tsx`
- `app/api/openapi/route.ts`
- `tests/unit/ListarMisTurnos.test.ts`
- `tests/unit/PrismaTurnoRepositorio.test.ts`
- `tests/unit/MisTurnos.test.tsx`
- `tests/integration/turnos.misTurnos.test.ts`
- `tests/integration/municipio.eventos.crear.test.ts`
- `tests/integration/turnos.reservar.test.ts`
- `tests/unit/GenerarTurnosEvento.test.ts`
- `tests/unit/ReservarTurnoCommand.test.ts`

**Contratos y API signatures:**

- `interface TurnoPropio { id, proveedorTipo, proveedorId, eventoId, eventoTitulo, franjaInicio, franjaFin, estado }`
- `interface PaginaTurnosPropios { items: TurnoPropio[]; total; pagina; porPagina }`
- `IRepositorioTurnos.listarPropios(reservadoPor: string, pagina: number, porPagina: number): Promise<PaginaTurnosPropios>`
- `class ListarMisTurnos extends CasoDeUsoBase<ComandoListarMisTurnos, PaginaTurnosPropios>`
- `GET /api/turnos/mis-turnos?pagina&porPagina -> 200 PaginaTurnosPropios | 401 — requiere sesión, filtra exclusivamente por reservado_por`
- `export default function MisTurnos() — app/turnos/mis-turnos/page.tsx, suscripción Realtime canal `turnos-propios-<usuarioId>` (postgres_changes UPDATE, filter reservado_por=eq.<usuarioId>)`

---

## HU: Consulta pública de la vitrina de adopción

_Criterios de Aceptación/Descripción:_

```text
Como vecino quiero consultar la vitrina de adopción institucional y sus fichas detalladas para conocer a los animales disponibles antes de decidir adoptar.
```

### [COMPLETADA] Endpoint público paginado de vitrina_adopcion

- **Rol:** Full Stack Developer
- **Componente/Ruta:** `ListarVitrinaAdopcionPublico.ts` (src/aplicacion/casos-de-uso/municipio/ListarVitrinaAdopcionPublico.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementó ListarVitrinaAdopcionPublico (Template Method vía CasoDeUsoBase) con autorizar() como no-op explícito, replicando el criterio ya usado en ListarReportes/ListarEventosPublico para exponer una consulta anónima real. IRepositorioFichasAdopcion se extendió con listarPublico(), que filtra EXCLUSIVAMENTE por estado='disponible' sin importar el municipio (a diferencia de listarPorMunicipio, que ve todos los estados de las fichas propias del panel). PrismaFichaAdopcionRepositorio implementa la paginación server-side (tope 50) reutilizando ix_vitrina_municipio_estado — efectivo pese a no filtrar por municipio_id porque la instancia es single-tenant. GET /api/adopciones vive fuera de /api/municipio, por lo que queda público sin ningún cambio a middleware.ts; la RLS vitrina_select_publico + GRANT SELECT ON vitrina_adopcion TO anon ya estaban aplicadas desde una migración previa, así que Paso 1 del ticket no requirió SQL nuevo. La página pública app/adopciones/page.tsx ofrece una galería de solo lectura (grilla de tarjetas) con estado vacío de borde discontinuo cuando no hay fichas disponibles. Se corrigió un comentario desactualizado en ListarFichasAdopcion.ts que describía la vitrina pública como fuera de alcance. El seed de 60 fichas (disponible/adoptado/baja) ya existía con el volumen exacto pedido, así que el requerimiento de datos semilla no necesitó cambios. Se actualizaron los fakes de IRepositorioFichasAdopcion en cinco archivos de test preexistentes para cumplir la interfaz ampliada, sin cambios de comportamiento en el panel municipal. 105 suites / 711 tests en verde, typecheck/lint/build limpios.

**Archivos Modificados:**

- `src/dominio/puertos/IRepositorioFichasAdopcion.ts`
- `src/infraestructura/adaptadores/PrismaFichaAdopcionRepositorio.ts`
- `src/aplicacion/dtos/municipio/FichaAdopcionDto.ts`
- `src/aplicacion/casos-de-uso/municipio/ListarVitrinaAdopcionPublico.ts`
- `src/aplicacion/casos-de-uso/municipio/ListarFichasAdopcion.ts`
- `app/api/adopciones/route.ts`
- `app/adopciones/page.tsx`
- `tests/unit/ListarVitrinaAdopcionPublico.test.ts`
- `tests/unit/PrismaFichaAdopcionRepositorio.test.ts`
- `tests/unit/PaginaAdopciones.test.tsx`
- `tests/unit/ActualizarFichaAdopcion.test.ts`
- `tests/unit/DarDeBajaFichaAdopcion.test.ts`
- `tests/unit/ListarFichasAdopcion.test.ts`
- `tests/unit/PublicarFichaAdopcion.test.ts`
- `tests/integration/adopciones.listarPublico.test.ts`
- `tests/integration/municipio.adopciones.test.ts`

**Contratos y API signatures:**

- `IRepositorioFichasAdopcion.listarPublico(pagina: number, porPagina: number): Promise<PaginaFichasAdopcion>`
- `class ListarVitrinaAdopcionPublico extends CasoDeUsoBase<ParametrosListarVitrinaAdopcionPublico, PaginaFichasAdopcion>`
- `ListarVitrinaAdopcionPublicoQuerySchema (pagina/porPagina, tope 50)`
- `GET /api/adopciones?pagina&porPagina -> 200 PaginaFichasAdopcion — sin autenticación, siempre estado='disponible'`
- `export default function PaginaAdopciones() — app/adopciones/page.tsx`

---

## HU: Cancelación o reprogramación de turno propio

_Criterios de Aceptación/Descripción:_

```text
Como vecino quiero cancelar o reprogramar mi propio turno para liberar el cupo si no puedo asistir.
```

### [COMPLETADA] Comando CancelarTurnoCommand

- **Rol:** Backend Developer
- **Componente/Ruta:** `CancelarTurnoCommand.ts` (src/aplicacion/casos-de-uso/turnos/CancelarTurnoCommand.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se implementó CancelarTurnoCommand (Command + Template Method) donde validar() lee el turno y decide 404 (PEA-MUN-003) para no-encontrado/soft-deleted/no-reservado (incluye 'ya cancelado', mandato explícito del Paso 4), autorizar() reutiliza esa lectura para el chequeo de pertenencia (reservado_por o proveedor_id, 403/PEA-SIS-002 en caso contrario) y persistir() ejecuta un UPDATE condicionado por control optimista. Decisión de diseño central: al cancelar, reservado_por se preserva sin limpiar (nunca null) — necesario para que la suscripción Realtime de 'Mis turnos' (ticket anterior, filtro reservado_por=eq.<id>) siga recibiendo el evento UPDATE cuando el proveedor cancela un turno ajeno, y para conservar auditoría de quién había reservado. publicarEvento notifica turno_cancelado al proveedor solo cuando cancela el reservante. Se creó además ReprogramarTurnoCommand, modelando 'reprogramar' literalmente como pide el ticket: cancelar + reservar dentro de una única transacción Prisma vía un nuevo método IRepositorioTurnos.reprogramar, con rollback explícito (excepción interna capturada) si cualquiera de los dos pasos falla — verificado con un test de integración que confirma que el turno actual permanece intacto si la reserva del nuevo no puede completarse. Ambos comandos exponen sus propios endpoints POST, ya cubiertos por la protección existente del prefijo /api/turnos. El seed de turnos con estado='reservado' ya existía con el criterio exacto pedido, así que no requirió cambios. Se actualizaron los fakes de IRepositorioTurnos en seis archivos de test preexistentes para cumplir la interfaz ampliada (TurnoActual con reservadoPor/proveedorId, más los dos métodos nuevos), sin cambios de comportamiento en esos casos de uso. 109 suites / 750 tests en verde, typecheck/lint/build limpios.

**Archivos Modificados:**

- `src/dominio/puertos/IRepositorioTurnos.ts`
- `src/infraestructura/adaptadores/PrismaTurnoRepositorio.ts`
- `src/aplicacion/dtos/turnos/CancelarTurnoDto.ts`
- `src/aplicacion/dtos/turnos/ReprogramarTurnoDto.ts`
- `src/aplicacion/casos-de-uso/turnos/CancelarTurnoCommand.ts`
- `src/aplicacion/casos-de-uso/turnos/ReprogramarTurnoCommand.ts`
- `app/api/turnos/cancelar/route.ts`
- `app/api/turnos/reprogramar/route.ts`
- `app/api/openapi/route.ts`
- `tests/unit/CancelarTurnoCommand.test.ts`
- `tests/unit/ReprogramarTurnoCommand.test.ts`
- `tests/unit/PrismaTurnoRepositorio.test.ts`
- `tests/integration/turnos.cancelar.test.ts`
- `tests/integration/turnos.reprogramar.test.ts`
- `tests/integration/municipio.eventos.crear.test.ts`
- `tests/integration/turnos.misTurnos.test.ts`
- `tests/integration/turnos.reservar.test.ts`
- `tests/unit/GenerarTurnosEvento.test.ts`
- `tests/unit/ListarMisTurnos.test.ts`
- `tests/unit/ReservarTurnoCommand.test.ts`

**Contratos y API signatures:**

- `interface TurnoCancelado { id, estado, reservadoPor, proveedorId, version }`
- `interface TurnoReprogramado { turnoCancelado: TurnoCancelado; turnoReservado: TurnoReservado }`
- `IRepositorioTurnos.cancelar(turnoId: string, versionEsperada: number): Promise<TurnoCancelado | null>`
- `IRepositorioTurnos.reprogramar(turnoActualId, turnoNuevoId, usuarioId, versionActualEsperada, versionNuevaEsperada): Promise<TurnoReprogramado | null>`
- `class CancelarTurnoCommand extends CasoDeUsoBase<EntradaCancelarTurno, ResultadoCancelarTurno, ComandoCancelarTurnoValidado>`
- `class ReprogramarTurnoCommand extends CasoDeUsoBase<EntradaReprogramarTurno, TurnoReprogramado, ComandoReprogramarTurnoValidado>`
- `POST /api/turnos/cancelar { turnoId } -> 200 TurnoCancelado | 400/401/403/404`
- `POST /api/turnos/reprogramar { turnoActualId, turnoNuevoId } -> 200 TurnoReprogramado | 400/401/403/404/409`

---
