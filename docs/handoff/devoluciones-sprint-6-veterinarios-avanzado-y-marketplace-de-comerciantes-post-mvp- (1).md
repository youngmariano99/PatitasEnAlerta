# Handoffs y Entregables del Sprint - Sprint 6: Veterinarios Avanzado y Marketplace de Comerciantes (Post-MVP)

**Objetivo:** Sumar funcionalidades comerciales para veterinarios (recordatorios, venta de productos, historia clínica compartida) y dar de alta el marketplace de comerciantes aliados.
**Capacidad:** 40 Ptos | **Duración:** 1 Semanas
**Estado del Sprint:** COMPLETADO

--- 

## HU: Recordatorios automáticos de turnos
*Criterios de Aceptación/Descripción:*
```text
Como veterinario/a quiero enviar recordatorios automáticos de turnos próximos con seguimiento de no-show para reducir el ausentismo en mi agenda.
```

### [COMPLETADA] Job de recordatorios sobre turnos próximos con seguimiento de no-show
- **Rol:** Backend Developer
- **Componente/Ruta:** `RecordatorioTurnoJob.ts` (src/infraestructura/jobs/RecordatorioTurnoJob.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
RecordatorioTurnoJob consulta turnos 'reservado' con franja_inicio en [ahora, ahora+24h) y notifica a reservado_por, con existePorReferencia como chequeo de idempotencia antes de cada INSERT (evita duplicados entre corridas sucesivas del scheduler). Se expone vía POST /api/webhooks/recordatorios-turnos, ruta excluida del middleware de sesión (matcher ya la excluía desde el scaffold) y autenticada con un secreto compartido (CRON_JOBS_SECRET) comparado contra el header x-cron-secret. ActualizarAsistioTurnoCommand sigue el mismo esqueleto de 3 pasos que CancelarTurnoCommand (validar existencia → autorizar pertenencia exclusiva al proveedor → el UPDATE condicionado por franja_fin<=now() es la última palabra, 0 filas = PEA-VETADV-005). ObtenerTasaNoShow tiene autorizar() no-op (mismo criterio que ListarMisTurnos): el agregado sobre turnos.asistio siempre está acotado a proveedorId=usuario_actual(), calculado en el momento (COUNT con dos WHERE distintos), sin persistir nada nuevo.

**Archivos Modificados:**
- `src/infraestructura/jobs/RecordatorioTurnoJob.ts`
- `src/aplicacion/casos-de-uso/turnos/ActualizarAsistioTurnoCommand.ts`
- `src/aplicacion/casos-de-uso/turnos/ObtenerTasaNoShow.ts`
- `src/aplicacion/dtos/turnos/ActualizarAsistioTurnoDto.ts`
- `src/aplicacion/dtos/turnos/TasaNoShowDto.ts`
- `src/dominio/errores/erroresVeterinariosAvanzados.ts`
- `src/dominio/puertos/IRepositorioTurnos.ts`
- `src/dominio/puertos/INotificacionesRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaTurnoRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaNotificacionesRepositorio.ts`
- `app/api/webhooks/recordatorios-turnos/route.ts`
- `app/api/turnos/marcar-asistencia/route.ts`
- `app/api/turnos/mi-tasa-no-show/route.ts`
- `.env.example`
- `docs/ERRORS.md`
- `docs/SCHEMA.md`
- `docs/SETUP.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/14_RecordatoriosTurnosNoShow_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `tests/unit/RecordatorioTurnoJob.test.ts`
- `tests/unit/ActualizarAsistioTurnoCommand.test.ts`
- `tests/unit/ObtenerTasaNoShow.test.ts`
- `tests/unit/PrismaTurnoRepositorio.test.ts`
- `tests/unit/PrismaNotificacionesRepositorio.test.ts`
- `tests/integration/webhooks.recordatoriosTurnos.test.ts`
- `tests/integration/turnos.asistencia.test.ts`
- `(+ ~35 archivos de test preexistentes actualizados solo para agregar los nuevos métodos de interfaz a sus fakes/mocks — sin cambios de comportamiento)`

**Contratos y API signatures:**
- `class RecordatorioTurnoJob { ejecutar(ahora?: Date): Promise<{ turnosEnVentana: number; notificados: number }> }`
- `IRepositorioTurnos.listarReservadosEnVentana/actualizarAsistio/calcularTasaNoShow`
- `INotificacionesRepositorio.existePorReferencia(usuarioId, tipo, referenciaTabla, referenciaId): Promise<boolean>`
- `POST /api/webhooks/recordatorios-turnos (header x-cron-secret) → 200 { turnosEnVentana, notificados } | 401`
- `POST /api/turnos/marcar-asistencia → 200 { id, asistio } | 401 | 403 PEA-SIS-002 | 404 PEA-MUN-003 | 409 PEA-VETADV-005`
- `GET /api/turnos/mi-tasa-no-show → 200 { totalConcluidos, totalNoShow, tasa } | 401`
- `TurnoAunNoConcluidoError (PEA-VETADV-005, nuevo en el catálogo)`


--- 

## HU: Venta de productos veterinarios en la plataforma
*Criterios de Aceptación/Descripción:*
```text
Como veterinario/a quiero publicar y vender productos e insumos propios de mi clínica para generar un canal de venta adicional dentro de la plataforma.
```

### [COMPLETADA] CRUD de productos_veterinario y comando GenerarPedidoCommand
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `GenerarPedidoCommand.ts` (src/aplicacion/casos-de-uso/veterinarios-avanzado/GenerarPedidoCommand.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
GenerarPedidoCommand sigue el Template Method: validar() lee el producto (obtenerActual, 404 PEA-VETADV-002 si no existe) → autorizar() exige rol 'dueño' exclusivamente → persistir() delega en IRepositorioPedidosProducto.crear(), que dentro de una única transacción Prisma hace UPDATE productos_veterinario SET stock=stock-cantidad WHERE stock>=cantidad AND deleted_at IS NULL y, solo si afectó 1 fila, INSERT en pedidos_producto con precio_unitario tomado como snapshot del producto en ese momento; null (0 filas) se traduce siempre en PEA-VETADV-001, nunca un error de sistema — mismo criterio que ReservarTurnoCommand/TurnoYaReservadoError. El CRUD de productos_veterinario sigue el mismo esqueleto de 3 pasos (validar lee+verifica existencia, autorizar compara pertenencia→403 explícito, persistir confía solo en el UPDATE/DELETE condicionado por veterinario_id) que ActualizarAsistioTurnoCommand del ticket anterior. El catálogo público (GET sin sesión) se agregó a RUTAS_API_LECTURA_PUBLICA en middleware.ts, igual que GET /api/reportes.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/veterinarios-avanzado/CrearProductoVeterinario.ts`
- `src/aplicacion/casos-de-uso/veterinarios-avanzado/ActualizarProductoVeterinario.ts`
- `src/aplicacion/casos-de-uso/veterinarios-avanzado/DarDeBajaProductoVeterinario.ts`
- `src/aplicacion/casos-de-uso/veterinarios-avanzado/ListarMisProductos.ts`
- `src/aplicacion/casos-de-uso/veterinarios-avanzado/ListarProductosActivos.ts`
- `src/aplicacion/casos-de-uso/veterinarios-avanzado/GenerarPedidoCommand.ts`
- `src/aplicacion/dtos/veterinarios-avanzado/ProductoVeterinarioDto.ts`
- `src/aplicacion/dtos/veterinarios-avanzado/ListarProductosDto.ts`
- `src/aplicacion/dtos/veterinarios-avanzado/GenerarPedidoDto.ts`
- `src/dominio/puertos/IRepositorioProductosVeterinario.ts`
- `src/dominio/puertos/IRepositorioPedidosProducto.ts`
- `src/dominio/errores/erroresVeterinariosAvanzados.ts`
- `src/infraestructura/adaptadores/PrismaProductosVeterinarioRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaPedidosProductoRepositorio.ts`
- `src/aplicacion/contenedor-di.ts`
- `middleware.ts`
- `app/api/veterinarios/productos/route.ts`
- `app/api/veterinarios/productos/mis-productos/route.ts`
- `app/api/veterinarios/productos/[id]/route.ts`
- `app/api/veterinarios/productos/[id]/pedidos/route.ts`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/15_ProductosVeterinarioYPedidos_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `tests/unit/CrearProductoVeterinario.test.ts`
- `tests/unit/ActualizarProductoVeterinario.test.ts`
- `tests/unit/DarDeBajaProductoVeterinario.test.ts`
- `tests/unit/ListarMisProductos.test.ts`
- `tests/unit/ListarProductosActivos.test.ts`
- `tests/unit/GenerarPedidoCommand.test.ts`
- `tests/unit/PrismaProductosVeterinarioRepositorio.test.ts`
- `tests/unit/PrismaPedidosProductoRepositorio.test.ts`
- `tests/integration/veterinariosAvanzado.productos.test.ts`
- `tests/integration/veterinariosAvanzado.generarPedido.test.ts`
- `tests/integration/webhooks.recordatoriosTurnos.test.ts`

**Contratos y API signatures:**
- `class GenerarPedidoCommand { ejecutar(EntradaGenerarPedido): Promise<PedidoCreado> }`
- `IRepositorioPedidosProducto.crear(datos): Promise<PedidoCreado | null> — UPDATE stock>=cantidad + INSERT en una transacción`
- `IRepositorioProductosVeterinario (crear/obtenerActual/actualizar/darDeBaja/listarPropios/listarActivos)`
- `GET /api/veterinarios/productos (público) | POST (veterinario)`
- `GET /api/veterinarios/productos/mis-productos (veterinario)`
- `PATCH /DELETE /api/veterinarios/productos/{id} (veterinario dueño, 403 si no)`
- `POST /api/veterinarios/productos/{id}/pedidos (dueño) → 201 | 404 PEA-VETADV-002 | 409 PEA-VETADV-001`
- `StockInsuficienteError (PEA-VETADV-001), ProductoNoDisponibleError (PEA-VETADV-002)`


--- 

## HU: Historia clínica interoperable entre veterinarios
*Criterios de Aceptación/Descripción:*
```text
Como veterinario/a quiero compartir el historial sanitario de una mascota con otro/a veterinario/a autorizado para brindar mejor atención cuando el paciente rota entre clínicas.
```

### [COMPLETADA] CRUD de historiales_compartidos con autorización explícita y revocable
- **Rol:** Backend Developer
- **Componente/Ruta:** `CompartirHistorial.ts` (src/aplicacion/casos-de-uso/veterinarios-avanzado/CompartirHistorial.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
CompartirHistorial (Template Method) valida en autorizar(): rol veterinario del solicitante → origen≠destino (PEA-VETADV-003, sin I/O) → mascota existe (PEA-AUTH-009) → destino es veterinario real (PEA-VET-011). persistir() delega en IRepositorioHistorialesCompartidos.crear(), un INSERT simple (sin transacción, no hay invariante numérica que proteger como en pedidos). RevocarHistorialCompartido lee el historial en autorizar() para dar 403 explícito si quien invoca no es el origen; persistir() nunca confía en esa lectura — repite `id + veterinarioOrigenId + revocadoEn IS NULL` en el propio UPDATE (mismo criterio anti-carrera que PrismaAutorizacionesLibretaRepositorio.revocar), devolviendo null tanto si no existe como si una revocación concurrente ya lo marcó, y el caso de uso colapsa ambos en PEA-VETADV-006. El feature flag es una función pura sobre process.env, invocada al inicio de ambos route handlers antes de resolver la sesión.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/veterinarios-avanzado/CompartirHistorial.ts`
- `src/aplicacion/casos-de-uso/veterinarios-avanzado/RevocarHistorialCompartido.ts`
- `src/aplicacion/dtos/veterinarios-avanzado/HistorialCompartidoDto.ts`
- `src/dominio/puertos/IRepositorioHistorialesCompartidos.ts`
- `src/infraestructura/adaptadores/PrismaHistorialesCompartidosRepositorio.ts`
- `src/infraestructura/config/featureFlags.ts`
- `src/dominio/errores/erroresVeterinariosAvanzados.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/veterinarios/historiales-compartidos/route.ts`
- `app/api/veterinarios/historiales-compartidos/[id]/revocar/route.ts`
- `docs/ERRORS.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/16_HistorialesCompartidosCRUD_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `.env.example`
- `tests/unit/CompartirHistorial.test.ts`
- `tests/unit/RevocarHistorialCompartido.test.ts`
- `tests/unit/PrismaHistorialesCompartidosRepositorio.test.ts`
- `tests/integration/veterinariosAvanzado.historialesCompartidos.test.ts`

**Contratos y API signatures:**
- `class CompartirHistorial { ejecutar(EntradaCompartirHistorial): Promise<HistorialCompartidoDto> }`
- `class RevocarHistorialCompartido { ejecutar(ComandoRevocarHistorialCompartido): Promise<HistorialCompartidoDto> }`
- `IRepositorioHistorialesCompartidos (crear/obtenerActual/revocar)`
- `POST /api/veterinarios/historiales-compartidos → 201 | 400 PEA-VETADV-003 | 403 (flag off o rol) | 404`
- `PATCH /api/veterinarios/historiales-compartidos/{id}/revocar → 200 | 403 (flag off o no-origen) | 404 PEA-VETADV-006`
- `historialesCompartidosHabilitado(): boolean — src/infraestructura/config/featureFlags.ts`
- `HistorialCompartidoConUnoMismoError (PEA-VETADV-003), HistorialCompartidoNoEncontradoError (PEA-VETADV-006)`


--- 

## HU: Registro de comercio en la plataforma
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero registrar mi comercio sujeto a verificación para operar con visibilidad legítima frente a la comunidad.
```

### [COMPLETADA] Alta de comercio sujeta a verificación
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `RegistrarComercio.ts` (src/aplicacion/casos-de-uso/comercios/RegistrarComercio.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
RegistrarComercio (Template Method) usa safeParse en validar() para distinguir el issue de tipoComercio (→ PEA-COM-002) de cualquier otro campo inválido (→ PayloadInvalidoError genérico), sin necesitar un pipeline Chain of Responsibility como el de CrearReporte (acá hay un solo campo con código propio). autorizar() exige rol 'comerciante' vía IRepositorioPerfil, mismo patrón ROL_AUTORIZADO singular que CrearProductoVeterinario. persistir() delega en IRepositorioComercios.crear(usuarioId, datos), que hace un INSERT simple sin fijar estado_verificacion — el DEFAULT 'pendiente' de la columna Prisma resuelve el AC. Se agregó '/api/comercios' a RUTAS_API_PROTEGIDAS en middleware.ts (no hay lectura pública en este ticket, solo alta).

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/comercios/RegistrarComercio.ts`
- `src/aplicacion/dtos/comercios/RegistrarComercioDto.ts`
- `src/dominio/puertos/IRepositorioComercios.ts`
- `src/infraestructura/adaptadores/PrismaComercioRepositorio.ts`
- `src/dominio/errores/erroresComercios.ts`
- `src/aplicacion/contenedor-di.ts`
- `middleware.ts`
- `app/api/comercios/route.ts`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/17_RegistroComercio_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `tests/unit/RegistrarComercio.test.ts`
- `tests/unit/PrismaComercioRepositorio.test.ts`
- `tests/integration/comercios.registrar.test.ts`

**Contratos y API signatures:**
- `class RegistrarComercio { ejecutar(EntradaRegistrarComercio): Promise<ComercioDto> }`
- `IRepositorioComercios (crear)`
- `POST /api/comercios → 201 | 400 PEA-COM-002/PEA-SIS-005 | 401 | 403 PEA-SIS-002`
- `ComercioTipoInvalidoError (PEA-COM-002)`


--- 

## HU: Publicación de catálogo de productos
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero publicar mi catálogo de productos y servicios para que los dueños de mascotas de mi zona los encuentren fácilmente.
```

### [COMPLETADA] CRUD de productos_comercio restringido al comercio propio
- **Rol:** Backend Developer
- **Componente/Ruta:** `PublicarProductoComercio.ts` (src/aplicacion/casos-de-uso/comercios/PublicarProductoComercio.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
PublicarProductoComercio.autorizar() verifica rol comerciante → comercio propio existe (obtenerPropio) → estado_verificacion==='verificado'; persistir() vuelve a resolver el comercio propio (nunca confía en la lectura de autorizar) y sanitiza descripcion antes de crear(). ActualizarProductoComercio/DarDeBajaProductoComercio siguen el esqueleto de 3 pasos ya establecido (validar lee el producto vía obtenerActual, autorizar compara comercioId contra el comercio propio → 403 explícito, persistir repite la condición id+comercioId en el propio UPDATE/soft-delete). El bloqueo PEA-COM-001 vive solo en Publicar, no en Actualizar/DarDeBaja. DOMPurify se invoca en persistir(), justo antes de escribir en la base.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/comercios/PublicarProductoComercio.ts`
- `src/aplicacion/casos-de-uso/comercios/ActualizarProductoComercio.ts`
- `src/aplicacion/casos-de-uso/comercios/DarDeBajaProductoComercio.ts`
- `src/aplicacion/dtos/comercios/ProductoComercioDto.ts`
- `src/dominio/puertos/IRepositorioProductosComercio.ts`
- `src/dominio/puertos/IRepositorioComercios.ts`
- `src/infraestructura/adaptadores/PrismaProductosComercioRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaComercioRepositorio.ts`
- `src/infraestructura/seguridad/SanitizadorHtml.ts`
- `src/dominio/errores/erroresComercios.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/comercios/productos/route.ts`
- `app/api/comercios/productos/[id]/route.ts`
- `docs/ERRORS.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/18_CrudProductosComercio_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `jest.config.ts`
- `tests/mocks/isomorphicDompurifyMock.ts`
- `tests/unit/PublicarProductoComercio.test.ts`
- `tests/unit/ActualizarProductoComercio.test.ts`
- `tests/unit/DarDeBajaProductoComercio.test.ts`
- `tests/unit/PrismaProductosComercioRepositorio.test.ts`
- `tests/unit/PrismaComercioRepositorio.test.ts`
- `tests/unit/SanitizadorHtml.test.ts`
- `tests/unit/RegistrarComercio.test.ts`
- `tests/integration/comercios.productos.test.ts`
- `tests/integration/comercios.registrar.test.ts`

**Contratos y API signatures:**
- `class PublicarProductoComercio { ejecutar(EntradaPublicarProductoComercio): Promise<ProductoComercioDto> }`
- `class ActualizarProductoComercio / DarDeBajaProductoComercio`
- `IRepositorioProductosComercio (crear/obtenerActual/actualizar/darDeBaja)`
- `IRepositorioComercios.obtenerPropio(usuarioId): Promise<ComercioPropio | null>`
- `sanitizarDescripcion(valor: string | null): string | null — src/infraestructura/seguridad/SanitizadorHtml.ts`
- `POST /api/comercios/productos → 201 | 403 PEA-COM-001/PEA-SIS-002 | 404 PEA-COM-003`
- `PATCH/DELETE /api/comercios/productos/{id} → 200 | 403 PEA-SIS-002 | 404 PEA-COM-004`
- `ComercioNoVerificadoError (PEA-COM-001), ComercioPropioNoEncontradoError (PEA-COM-003), ProductoComercioNoEncontradoError (PEA-COM-004)`


--- 

## HU: Visibilidad geolocalizada frente a dueños de mascotas
*Criterios de Aceptación/Descripción:*
```text
Como comerciante quiero obtener visibilidad frente a dueños de mascotas activos en mi zona para que mis productos lleguen al potencial cliente.
```

### [COMPLETADA] Endpoint público de comercios verificados por proximidad
- **Rol:** Backend Developer
- **Componente/Ruta:** `ListarComerciosCercanos.ts` (src/aplicacion/casos-de-uso/comercios/ListarComerciosCercanos.ts)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
IRepositorioComercios.listarVerificados aplica el WHERE estado_verificacion='verificado' + bounding box (reutilizando la aproximación km-por-grado ya usada en PrismaDirectorioAliadosRepositorio) pero deliberadamente NO ordena ni pagina — ListarComerciosCercanos.persistir() calcula la distancia Haversine para cada candidato, ordena ascendente, y recién ahí aplica slice() para la página pedida (paginación en memoria, necesaria porque el orden por distancia se calcula fuera de SQL). Sin zona, ordena por createdAt descendente y expone distanciaKm: null. La migración habilita RLS sobre comercios por primera vez, con una única política de SELECT (verificado/propio/admin) + GRANT a anon — es defensa en profundidad, ya que el propio backend usa Prisma con conexión privilegiada (DATABASE_URL), no sujeta a RLS.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/comercios/ListarComerciosCercanos.ts`
- `src/aplicacion/dtos/comercios/ListarComerciosCercanosDto.ts`
- `src/dominio/puertos/IRepositorioComercios.ts`
- `src/infraestructura/adaptadores/PrismaComercioRepositorio.ts`
- `app/api/comercios/cercanos/route.ts`
- `middleware.ts`
- `prisma/migrations/20260914150000_habilita_rls_lectura_publica_comercios/migration.sql`
- `docs/ROLES.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/19_ComerciosCercanosPublico_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `tests/unit/ListarComerciosCercanos.test.ts`
- `tests/unit/PrismaComercioRepositorio.test.ts`
- `tests/integration/comercios.cercanos.test.ts`
- `tests/unit/ActualizarProductoComercio.test.ts`
- `tests/unit/DarDeBajaProductoComercio.test.ts`
- `tests/unit/PublicarProductoComercio.test.ts`
- `tests/unit/RegistrarComercio.test.ts`
- `tests/integration/comercios.productos.test.ts`
- `tests/integration/comercios.registrar.test.ts`

**Contratos y API signatures:**
- `class ListarComerciosCercanos { ejecutar(ComandoListarComerciosCercanos): Promise<PaginaComerciosCercanosDto> }`
- `IRepositorioComercios.listarVerificados(zona?: FiltroZona): Promise<Comercio[]>`
- `GET /api/comercios/cercanos → 200 | 400 PEA-SIS-005 (público, sin sesión)`
- `Migración SQL: comercios_select_publico + GRANT SELECT ON comercios TO anon`


--- 

## HU: Búsqueda de comercios y servicios cercanos
*Criterios de Aceptación/Descripción:*
```text
Como dueño de mascota quiero buscar y contactar comercios o servicios cercanos relacionados a mi mascota para resolver mis necesidades sin salir de la plataforma.
```

### [COMPLETADA] UI de búsqueda y mapa de comercios cercanos
- **Rol:** Frontend Developer
- **Componente/Ruta:** `BuscadorComercios.tsx` (src/presentacion/componentes/comercios/BuscadorComercios.tsx)

#### Devolución / Handoff de la IA:
**Resumen Técnico:**
IRepositorioComercios.listarVerificados gana un segundo parámetro opcional textoLibre, traducido en PrismaComercioRepositorio a un OR de dos contains (mode: insensitive) sobre nombreComercio/tipoComercio — siempre parametrizado por el driver de Prisma, nunca $queryRaw. ListarComerciosCercanos.persistir() lo reenvía sin tocarlo. En el frontend, BuscadorComercios mantiene textoDebounced (300ms) que dispara el fetch con q, y aplica el filtro de tipoComercio + paginación de 10 en 10 en el cliente sobre hasta 50 candidatos (useMemo), evitando un segundo parámetro de backend no pedido por el ticket. MapaComercios y la tabla reciben el mismo array items ya filtrado, garantizando la sincronización pedida por el AC. iconosComercioFlyweight.ts cachea un L.DivIcon por tipo_comercio en un Map module-level, mismo patrón que iconosReporteFlyweight.ts.

**Archivos Modificados:**
- `src/presentacion/componentes/comercios/BuscadorComercios.tsx`
- `src/presentacion/componentes/mapas/MapaComercios.tsx`
- `src/presentacion/componentes/mapas/iconosComercioFlyweight.ts`
- `app/comercios/page.tsx`
- `src/aplicacion/dtos/comercios/ListarComerciosCercanosDto.ts`
- `src/aplicacion/casos-de-uso/comercios/ListarComerciosCercanos.ts`
- `src/dominio/puertos/IRepositorioComercios.ts`
- `src/infraestructura/adaptadores/PrismaComercioRepositorio.ts`
- `docs/SITEMAP.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/20_BuscadorComerciosCercanos_Frontend_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `tests/unit/BuscadorComercios.test.tsx`
- `tests/unit/iconosComercioFlyweight.test.ts`
- `tests/unit/ListarComerciosCercanos.test.ts`
- `tests/unit/PrismaComercioRepositorio.test.ts`
- `tests/integration/comercios.cercanos.test.ts`

**Contratos y API signatures:**
- `BuscadorComercios (componente React, sin props)`
- `MapaComercios({ comercios, centro })`
- `obtenerIconoComercio(tipoComercio: string): L.DivIcon`
- `GET /api/comercios/cercanos?q=... (nuevo query param, además de pagina/porPagina/latitud/longitud/radioKm)`
- `IRepositorioComercios.listarVerificados(zona?, textoLibre?): Promise<Comercio[]>`


--- 

