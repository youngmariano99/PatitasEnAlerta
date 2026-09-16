# Handoffs y Entregables del Sprint - Sprint 4: Veterinarios — Agenda y Libreta Sanitaria Básica

**Objetivo:** Cerrar el recorrido completo del MVP reutilizando el motor de turnera compartido para veterinarios y habilitando la libreta sanitaria digital básica, dejando margen para pulido previo a la demo.
**Capacidad:** 40 Ptos | **Duración:** 1 Semanas
**Estado del Sprint:** COMPLETADO

---

## HU: Configuración de agenda del veterinario

_Criterios de Aceptación/Descripción:_

```text
Como veterinario/a quiero configurar mis franjas horarias disponibles para que los dueños reserven turno sin llamarme.
```

### [COMPLETADA] CRUD de disponibilidad_veterinario y generación de turnos propios

- **Rol:** Full Stack Developer
- **Componente/Ruta:** `ConfigurarDisponibilidad.ts` (src/aplicacion/casos-de-uso/veterinarios/ConfigurarDisponibilidad.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Ninguno de los archivos que el contexto de sprint daba por completados existía realmente en el repo, así que construí toda la cadena desde cero siguiendo esas firmas como contrato. ConfigurarDisponibilidad hace upsert por (veterinarioId, diaSemana) sobre disponibilidad_veterinario y, tras persistir, dispara GenerarTurnosVeterinario para sincronizar turnos 'disponible' con un horizonte de 14 días. A diferencia de GenerarTurnosEvento (reconciliación por conteo contra un evento_id), la agenda veterinaria no tiene ancla externa, así que la reconciliación es por identidad de franja horaria vía el nuevo IRepositorioTurnos.listarFranjasExistentes. TurneraVeterinario (Strategy) proyecta los bloques semanales recurrentes (dia_semana + HH:mm) en franjas concretas de 20 minutos sobre el horizonte, en UTC. Autorización: solo rol 'veterinario' con estadoVerificacion='verificado' (PEA-SIS-002 / PEA-VET-007). Tuve que actualizar 9 archivos de test que implementaban IRepositorioTurnos para agregar el nuevo método a la interfaz (mocks/fakes), sin tocar su lógica de aserciones.

**Archivos Modificados:**

- `src/dominio/puertos/IRepositorioDisponibilidad.ts`
- `src/dominio/errores/erroresVeterinarios.ts`
- `src/aplicacion/dtos/veterinarios/ConfigurarDisponibilidadDto.ts`
- `src/dominio/estrategias/ProveedorTurnera.ts`
- `src/dominio/puertos/IRepositorioTurnos.ts`
- `src/infraestructura/adaptadores/PrismaTurnoRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaDisponibilidadRepositorio.ts`
- `src/aplicacion/casos-de-uso/veterinarios/GenerarTurnosVeterinario.ts`
- `src/aplicacion/casos-de-uso/veterinarios/ConfigurarDisponibilidad.ts`
- `src/aplicacion/casos-de-uso/veterinarios/DarDeBajaDisponibilidad.ts`
- `src/aplicacion/casos-de-uso/veterinarios/ListarDisponibilidadPropia.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/veterinarios/disponibilidad/route.ts`
- `app/api/veterinarios/disponibilidad/[id]/route.ts`
- `middleware.ts`
- `docs/ERRORS.md`
- `tests/integration/municipio.eventos.crear.test.ts`
- `tests/integration/turnos.cancelar.test.ts`
- `tests/integration/turnos.misTurnos.test.ts`
- `tests/integration/turnos.reprogramar.test.ts`
- `tests/integration/turnos.reservar.test.ts`
- `tests/unit/CancelarTurnoCommand.test.ts`
- `tests/unit/GenerarTurnosEvento.test.ts`
- `tests/unit/ListarMisTurnos.test.ts`
- `tests/unit/ReprogramarTurnoCommand.test.ts`
- `tests/unit/ReservarTurnoCommand.test.ts`

**Contratos y API signatures:**

- `class ConfigurarDisponibilidad extends CasoDeUsoBase<EntradaConfigurarDisponibilidad, DisponibilidadConfigurada, ComandoConfigurarDisponibilidad>`
- `class DarDeBajaDisponibilidad extends CasoDeUsoBase<ComandoDarDeBajaDisponibilidad, DisponibilidadDadaDeBaja>`
- `class ListarDisponibilidadPropia extends CasoDeUsoBase<ComandoListarDisponibilidadPropia, FranjaDisponibilidad[]>`
- `class GenerarTurnosVeterinario { ejecutar(veterinarioId: string): Promise<TurnoGenerado[]> }`
- `interface IRepositorioDisponibilidad { crear, obtenerActual, actualizar, eliminar, listarPropias, listarActivas }`
- `class TurneraVeterinario implements ProveedorTurnera<FuenteDisponibilidadVeterinario>`
- `IRepositorioTurnos.listarFranjasExistentes(proveedorId, desde, hasta): Promise<Date[]>`
- `ConfigurarDisponibilidadSchema (Zod) — POST /veterinarios/disponibilidad`
- `GET /api/veterinarios/disponibilidad, DELETE /api/veterinarios/disponibilidad/[id]`
- `PEA-VET-008 DisponibilidadNoEncontradaError (404)`
- `PEA-VET-007 CuentaVeterinariaNoVerificadaError (403), PEA-VET-001 HoraFinAntesDeInicioError (400)`
- `token DI 'IRepositorioDisponibilidad' -> PrismaDisponibilidadRepositorio`
- `token DI 'ProveedorTurneraVeterinario' -> TurneraVeterinario`

---

## HU: Listado de turnos reservados del veterinario

_Criterios de Aceptación/Descripción:_

```text
Como veterinario/a quiero consultar mi listado de turnos reservados para organizar mi jornada de atención.
```

### [COMPLETADA] Endpoint de agenda propia del veterinario

- **Rol:** Backend Developer
- **Componente/Ruta:** `ListarTurnosVeterinario.ts` (src/aplicacion/casos-de-uso/veterinarios/ListarTurnosVeterinario.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Nuevo método listarReservadosPorProveedor en IRepositorioTurnos (implementado en PrismaTurnoRepositorio con filtro proveedorId+estado='reservado', paginado y join a usuarios.email). Caso de uso ListarTurnosVeterinario replica exactamente el patrón de ListarMisTurnos (autorizar no-op, clamp de paginación tope 50). Ruta GET /api/veterinarios/turnos resuelve el caso de uso vía DI sin necesidad de registrar token nuevo (IRepositorioTurnos ya está registrado). Se actualizaron 10 fakes de test que implementaban la interfaz para no romper la compilación.

**Archivos Modificados:**

- `src/dominio/puertos/IRepositorioTurnos.ts`
- `src/infraestructura/adaptadores/PrismaTurnoRepositorio.ts`
- `src/aplicacion/casos-de-uso/veterinarios/ListarTurnosVeterinario.ts`
- `src/aplicacion/dtos/veterinarios/ListarTurnosVeterinarioDto.ts`
- `app/api/veterinarios/turnos/route.ts`
- `tests/unit/ListarTurnosVeterinario.test.ts`
- `tests/integration/veterinarios.turnos.test.ts`
- `tests/unit/CancelarTurnoCommand.test.ts`
- `tests/unit/GenerarTurnosEvento.test.ts`
- `tests/unit/ListarMisTurnos.test.ts`
- `tests/unit/ReprogramarTurnoCommand.test.ts`
- `tests/unit/ReservarTurnoCommand.test.ts`
- `tests/integration/municipio.eventos.crear.test.ts`
- `tests/integration/turnos.cancelar.test.ts`
- `tests/integration/turnos.misTurnos.test.ts`
- `tests/integration/turnos.reprogramar.test.ts`
- `tests/integration/turnos.reservar.test.ts`
- `docs/pruebas_testeos/1_AgendaPropiaVeterinario_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**

- `GET /api/veterinarios/turnos?pagina&porPagina -> PaginaTurnosReservadosVeterinario`
- `class ListarTurnosVeterinario extends CasoDeUsoBase<ComandoListarTurnosVeterinario, PaginaTurnosReservadosVeterinario>`
- `IRepositorioTurnos.listarReservadosPorProveedor(proveedorId, pagina, porPagina): Promise<PaginaTurnosReservadosVeterinario>`
- `interface TurnoReservadoVeterinario { id, franjaInicio, franjaFin, reservadoPorEmail }`
- `ListarTurnosVeterinarioQuerySchema (Zod) — pagina/porPagina (tope 50)`

---

## HU: Registro de entrada en la libreta sanitaria

_Criterios de Aceptación/Descripción:_

```text
Como veterinario/a quiero registrar una entrada en la libreta sanitaria de una mascota autorizada para que su historial no dependa del papel.
```

### [COMPLETADA] Caso de uso RegistrarEntradaLibreta con verificación de autorización activa

- **Rol:** Backend Developer
- **Componente/Ruta:** `RegistrarEntradaLibreta.ts` (src/aplicacion/casos-de-uso/veterinarios/RegistrarEntradaLibreta.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Sin cambios de código adicionales respecto de la entrega anterior. El fallo reportado en testE2e era ajeno al ticket: Playwright no tenía el binario de WebKit descargado en esta máquina ('browserType.launch: Executable doesn't exist ...webkit-2336\Playwright.exe'), algo que ocurre tras instalar/actualizar la dependencia y no está relacionado con RegistrarEntradaLibreta. Se corrió `npx playwright install` (descarga Firefox + WebKit) y ambos proyectos e2e (chromium, mobile-safari) pasan. Los logs '[WebServer] Dynamic server usage ... request.cookies' y la advertencia de 'output: standalone' son ruido esperado de `next build`/`next start` sobre rutas API autenticadas ya existentes (no rutas nuevas de este ticket) — no son fallos de test.

**Archivos Modificados:**

- `src/aplicacion/casos-de-uso/veterinarios/RegistrarEntradaLibreta.ts`
- `src/aplicacion/dtos/veterinarios/RegistrarEntradaLibretaDto.ts`
- `src/dominio/puertos/IRepositorioAutorizacionesLibreta.ts`
- `src/dominio/puertos/IRepositorioEntradasLibreta.ts`
- `src/dominio/errores/erroresVeterinarios.ts`
- `src/infraestructura/adaptadores/PrismaAutorizacionesLibretaRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaEntradasLibretaRepositorio.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/veterinarios/libreta/route.ts`
- `app/api/openapi/route.ts`
- `tests/unit/RegistrarEntradaLibreta.test.ts`
- `tests/integration/veterinarios.libreta.test.ts`
- `docs/pruebas_testeos/2_RegistrarEntradaLibreta_Backend.md`
- `docs/pruebas_testeos/INDEX.md`
- `docs/DECISIONES.md`

**Contratos y API signatures:**

- `class RegistrarEntradaLibreta extends CasoDeUsoBase<EntradaRegistrarEntradaLibreta, EntradaLibretaRegistrada, ComandoRegistrarEntradaLibreta>`
- `interface IRepositorioAutorizacionesLibreta { obtenerActual(mascotaId, veterinarioId): Promise<AutorizacionLibretaPersistida | null> }`
- `interface IRepositorioEntradasLibreta { crear(mascotaId, veterinarioId, datos): Promise<EntradaLibretaPersistida> }`
- `RegistrarEntradaLibretaSchema (Zod) — POST /veterinarios/libreta`
- `POST /api/veterinarios/libreta -> EntradaLibretaRegistrada (201)`
- `PEA-VET-003 SinAutorizacionLibretaError (403)`
- `PEA-VET-004 AutorizacionLibretaRevocadaError (403)`
- `PEA-VET-005 MascotaSinAccesoLibretaError (404)`
- `PEA-VET-006 TipoEntradaInvalidoError (400)`
- `token DI 'IRepositorioAutorizacionesLibreta' -> PrismaAutorizacionesLibretaRepositorio`
- `token DI 'IRepositorioEntradasLibreta' -> PrismaEntradasLibretaRepositorio`

---

## HU: Reserva de turno con un veterinario

_Criterios de Aceptación/Descripción:_

```text
Como dueño de mascota quiero reservar un turno con un veterinario verificado para no depender de un llamado telefónico.
```

### [COMPLETADA] Reutilización de ReservarTurnoCommand con proveedor_tipo='veterinario'

- **Rol:** Backend Developer
- **Componente/Ruta:** `ReservarTurnoCommand.ts` (src/aplicacion/casos-de-uso/turnos/ReservarTurnoCommand.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
ReservarTurnoCommand, IRepositorioTurnos.obtenerActual/reservar y el endpoint POST /api/turnos/reservar ya eran agnósticos de proveedor_tipo (TurnoActual no expone ese campo). No se tocó lógica de negocio. Se agregó cobertura de test explícita (unit + integración end-to-end vía el route handler real) para turnos con proveedorId de veterinario, y se aclaró la documentación (docstring de la clase + summary OpenAPI) para dejar constancia de la reutilización.

**Archivos Modificados:**

- `src/aplicacion/casos-de-uso/turnos/ReservarTurnoCommand.ts`
- `src/aplicacion/dtos/turnos/ReservarTurnoDto.ts`
- `tests/unit/ReservarTurnoCommand.test.ts`
- `tests/integration/turnos.reservar.test.ts`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/INDEX.md`
- `docs/pruebas_testeos/3_ReservaTurnoVeterinario_Backend.md`

**Contratos y API signatures:**

- `Sin firmas nuevas — se reutiliza tal cual: class ReservarTurnoCommand extends CasoDeUsoBase<EntradaReservarTurno, TurnoReservadoDto, ComandoReservarTurno>, POST /api/turnos/reservar -> TurnoReservadoDto (200), PEA-MUN-001 (409), PEA-MUN-003 (404)`

---

## HU: Autorización y revocación de acceso a la libreta sanitaria

_Criterios de Aceptación/Descripción:_

```text
Como dueño de mascota quiero autorizar o revocar el acceso de un veterinario a la libreta sanitaria de mi mascota para mantener el control sobre mis propios datos sanitarios.
```

### [COMPLETADA] CRUD de autorizaciones_libreta controlado por el dueño

- **Rol:** Full Stack Developer
- **Componente/Ruta:** `AutorizarVeterinario.ts` (src/aplicacion/casos-de-uso/veterinarios/AutorizarVeterinario.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se modeló el CRUD como Template Method (CasoDeUsoBase) x3, reutilizando IRepositorioMascotas.buscarPorId para el chequeo anti-IDOR de pertenencia (mismo patrón en los tres casos de uso) e IRepositorioPerfil.obtenerPerfilPropio para validar que el veterinarioId indicado corresponda a un usuario con rol 'veterinario'. Se extendió IRepositorioAutorizacionesLibreta (ya existente desde el ticket de RegistrarEntradaLibreta) con crear/revocar/listarPorMascota en vez de crear un puerto paralelo. 'Revocar' nunca hace DELETE físico: usa updateMany con WHERE revocada_en IS NULL como defensa ante carrera concurrente (mismo criterio que PrismaDisponibilidadRepositorio.eliminar). Las rutas anidan bajo /api/mascotas/[id]/autorizaciones (ya protegido por middleware.ts vía el prefijo /api/mascotas, sin cambios ahí). Se actualizaron los fakes de dos tests preexistentes (RegistrarEntradaLibreta.test.ts, veterinarios.libreta.test.ts) para satisfacer la interfaz extendida.

**Archivos Modificados:**

- `src/aplicacion/casos-de-uso/veterinarios/AutorizarVeterinario.ts`
- `src/aplicacion/casos-de-uso/veterinarios/RevocarAutorizacionLibreta.ts`
- `src/aplicacion/casos-de-uso/veterinarios/ListarAutorizacionesLibreta.ts`
- `src/aplicacion/dtos/veterinarios/AutorizarVeterinarioDto.ts`
- `src/dominio/puertos/IRepositorioAutorizacionesLibreta.ts`
- `src/dominio/errores/erroresVeterinarios.ts`
- `src/infraestructura/adaptadores/PrismaAutorizacionesLibretaRepositorio.ts`
- `app/api/mascotas/[id]/autorizaciones/route.ts`
- `app/api/mascotas/[id]/autorizaciones/[veterinarioId]/route.ts`
- `app/api/openapi/route.ts`
- `tests/unit/AutorizarVeterinario.test.ts`
- `tests/unit/RevocarAutorizacionLibreta.test.ts`
- `tests/unit/ListarAutorizacionesLibreta.test.ts`
- `tests/integration/mascotas.autorizaciones.test.ts`
- `tests/unit/RegistrarEntradaLibreta.test.ts`
- `tests/integration/veterinarios.libreta.test.ts`
- `docs/ERRORS.md`
- `docs/DECISIONES.md`
- `docs/pruebas_testeos/4_AutorizacionesLibreta_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**

- `class AutorizarVeterinario extends CasoDeUsoBase<EntradaAutorizarVeterinario, AutorizacionLibretaDto, ComandoAutorizarVeterinario>`
- `class RevocarAutorizacionLibreta extends CasoDeUsoBase<ComandoRevocarAutorizacionLibreta, AutorizacionLibretaDto>`
- `class ListarAutorizacionesLibreta extends CasoDeUsoBase<ComandoListarAutorizacionesLibreta, AutorizacionLibretaDto[]>`
- `interface IRepositorioAutorizacionesLibreta { obtenerActual, crear(mascotaId, veterinarioId), revocar(mascotaId, veterinarioId), listarPorMascota(mascotaId) }`
- `AutorizarVeterinarioSchema (Zod: { veterinarioId: uuid })`
- `AutorizacionLibretaDtoSchema (Zod: { id, mascotaId, veterinarioId, otorgadaEn, revocadaEn })`
- `POST /mascotas/{id}/autorizaciones -> AutorizacionLibretaDto (201)`
- `GET /mascotas/{id}/autorizaciones -> AutorizacionLibretaDto[] (200)`
- `DELETE /mascotas/{id}/autorizaciones/{veterinarioId} -> AutorizacionLibretaDto (200)`
- `PEA-VET-009 AutorizacionLibretaYaActivaError (409)`
- `PEA-VET-010 AutorizacionLibretaNoEncontradaError (404)`
- `PEA-VET-011 VeterinarioNoEncontradoError (404)`

---

## HU: Consulta del historial de la libreta sanitaria

_Criterios de Aceptación/Descripción:_

```text
Como dueño de mascota quiero ver la libreta sanitaria completa de mi mascota en un solo lugar para no depender del papel.
```

### [COMPLETADA] Endpoint de historial cronológico de libreta sanitaria por mascota

- **Rol:** Backend Developer
- **Componente/Ruta:** `ListarLibretaSanitaria.ts` (src/aplicacion/casos-de-uso/veterinarios/ListarLibretaSanitaria.ts)

#### Devolución / Handoff de la IA:

**Resumen Técnico:**
Se agregó listarPorMascota a IRepositorioEntradasLibreta (puerto) y su implementación Prisma (findMany+count paginado, orden fecha desc/createdAt desc como desempate, filtra deleted_at). El caso de uso ListarLibretaSanitaria sigue el mismo Template Method y el mismo chequeo de pertenencia anti-IDOR que ListarAutorizacionesLibreta.ts (mascota.dueñoId === dueñoId autenticado), y clampea paginación igual que ListarTurnosVeterinario.ts (tope 50). El endpoint es de solo lectura y exclusivo del dueño, sin acceso para veterinarios en esta actividad (así lo define docs/REQUISITOS.md explícitamente para esta historia).

**Archivos Modificados:**

- `src/aplicacion/casos-de-uso/veterinarios/ListarLibretaSanitaria.ts`
- `src/aplicacion/dtos/veterinarios/ListarLibretaSanitariaDto.ts`
- `app/api/mascotas/[id]/libreta/route.ts`
- `src/dominio/puertos/IRepositorioEntradasLibreta.ts`
- `src/infraestructura/adaptadores/PrismaEntradasLibretaRepositorio.ts`
- `app/api/openapi/route.ts`
- `tests/unit/ListarLibretaSanitaria.test.ts`
- `tests/integration/mascotas.libreta.test.ts`
- `tests/unit/RegistrarEntradaLibreta.test.ts`
- `tests/integration/veterinarios.libreta.test.ts`
- `docs/pruebas_testeos/5_HistorialLibretaSanitaria_Backend.md`
- `docs/pruebas_testeos/INDEX.md`

**Contratos y API signatures:**

- `class ListarLibretaSanitaria extends CasoDeUsoBase<ComandoListarLibretaSanitaria, PaginaEntradasLibretaDto>`
- `IRepositorioEntradasLibreta.listarPorMascota(mascotaId, pagina, porPagina): Promise<PaginaEntradasLibreta>`
- `GET /mascotas/{id}/libreta, GET /api/mascotas/[id]/libreta -> PaginaEntradasLibreta (200)`
- `ListarLibretaSanitariaQuerySchema (Zod: pagina/porPagina, tope 50)`
- `EntradaLibretaDtoSchema / PaginaEntradasLibretaSchema (OpenAPI)`
- `Reutiliza PEA-AUTH-009 (404, mascota no encontrada) y PEA-SIS-002 (403, anti-IDOR) — sin códigos nuevos`

---
