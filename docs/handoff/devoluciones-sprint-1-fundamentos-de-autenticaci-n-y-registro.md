# Handoffs y Entregables del Sprint - Sprint 1: Fundamentos de Autenticación y Registro

**Objetivo:** Levantar el núcleo de identidad, verificación y seguridad (sesión, anti-IDOR/BOLA) sobre el que se apoyan todos los módulos siguientes, incluyendo el registro de mascotas.
**Capacidad:** 40 Ptos | **Duración:** 1 Semanas
**Estado del Sprint:** ACTIVO

--- 

## 🎯 HU: Registro de dueño de mascota con validación fail-fast
*Criterios de Aceptación/Descripción:*
```text
Como dueño de mascota quiero registrarme con mi email y contraseña con validación en tiempo real para empezar a usar la plataforma sin fricción y sin cometer errores de carga.
```

### 📄 [✔ COMPLETADA] Endpoint y formulario de registro con validación Zod en capa de aplicación y cliente
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `RegistrarUsuario.ts` (src/aplicacion/casos-de-uso/auth/RegistrarUsuario.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
AUTH-01 completo y verificado en caliente: npm run typecheck, lint y test pasan limpio para todo el código nuevo (npm run build compila correctamente vía webpack). Se corrigieron 4 bugs preexistentes del scaffold que bloqueaban la verificación de cualquier ticket (schema.prisma con 'ñ' inválido para Prisma, jest.config.ts con clave inválida, faltaban @types/jest y ts-node, faltaba polyfill de setImmediate para pino bajo jsdom). Se flagueó por separado (fuera de este ticket) un bug de tipado en middleware.ts que sigue bloqueando el build completo. Se detectó y documentó una inconsistencia entre el patrón de email semilla con 'ñ' (docs/SEED.md) y la validación estándar de Zod — no afecta el funcionamiento real porque el seed no pasa por esta validación.

**Archivos Modificados:**
- `src/dominio/errores/ErrorDominio.ts`
- `src/dominio/errores/erroresAutenticacion.ts`
- `src/dominio/entidades/Usuario.ts`
- `src/dominio/puertos/IRepositorioUsuarios.ts`
- `src/dominio/puertos/IProveedorAutenticacion.ts`
- `src/aplicacion/dtos/openapi-registry.ts`
- `src/aplicacion/dtos/auth/RegistrarDuenoDto.ts`
- `src/aplicacion/casos-de-uso/auth/RegistrarUsuario.ts`
- `src/infraestructura/adaptadores/PrismaUsuarioRepositorio.ts`
- `src/infraestructura/adaptadores/SupabaseAuthAdapter.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/auth/registro/route.ts`
- `app/api/openapi/route.ts`
- `src/presentacion/componentes/formularios/CampoTexto.tsx`
- `app/auth/registro/page.tsx`
- `tests/integration/auth.registro.test.ts`
- `scripts/seed/seed-duenos.sql`
- `prisma/schema.prisma (fix: identificador Prisma 'dueñoId' -> 'duenoId', sin cambio de columna DB)`
- `jest.config.ts (fix: clave inválida 'setupFilesAfterEach' eliminada)`
- `package.json (agregado: @types/jest, ts-node como devDependencies)`
- `tests/jest.setup.ts (agregado: polyfill de setImmediate para pino bajo jsdom)`

**Contratos y API signatures:**
- `POST /api/auth/registro → 201 UsuarioRegistrado | 400 PEA-SIS-005 | 409 PEA-AUTH-001 | 500 PEA-SIS-003`
- `GET /api/openapi → documento OpenAPI 3.0 generado desde el registry`
- `RegistrarDuenoSchema / type RegistrarDuenoDto`
- `UsuarioRegistradoSchema / type UsuarioRegistrado`
- `IRepositorioUsuarios, IProveedorAutenticacion (puertos)`
- `RegistrarUsuario (caso de uso, resuelto vía tsyringe)`
- `Tokens DI: 'IRepositorioUsuarios' → PrismaUsuarioRepositorio, 'IProveedorAutenticacion' → SupabaseAuthAdapter`
- `ErrorDominio, EmailYaRegistradoError (PEA-AUTH-001), PayloadInvalidoError (PEA-SIS-005)`
- `CampoTexto — componente de formulario reutilizable`
- `Prisma: Mascota.duenoId (antes dueñoId; columna DB sin cambios)`


--- 

## 🎯 HU: Registro de ficha básica de mascota
*Criterios de Aceptación/Descripción:*
```text
Como dueño de mascota quiero registrar la ficha básica de mi mascota con foto para tenerla disponible en reportes y en la libreta sanitaria.
```

### 📄 [✔ COMPLETADA] Alta de mascota con carga de imagen a Cloudinary
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `RegistrarMascota.ts` (src/aplicacion/casos-de-uso/mascotas/RegistrarMascota.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
AUTH-04 completo y verificado en caliente (typecheck/lint/test:coverage/build limpios). RegistrarMascota sigue el Template Method: valida (Zod) -> autoriza (fotoUrl debe pertenecer a nuestra cuenta de Cloudinary, vía CloudinaryStorageAdapter sin llamadas de red) -> persiste (dueñoId siempre derivado de la sesión, nunca del body). Primera ruta de API con verificación de sesión propia (ContextoAutenticacionSupabase) y primera implementación de los errores transversales PEA-SIS-001/002. El formulario sube la imagen a Cloudinary con upload preset unsigned antes del submit. Cobertura agregada desde este commit: unit tests de caso de uso y ambos adaptadores nuevos, test de integración end-to-end de la ruta (401/400/403/201), test de la página con Cloudinary y la API mockeadas.

**Archivos Modificados:**
- `src/dominio/entidades/Mascota.ts`
- `src/dominio/puertos/IRepositorioMascotas.ts`
- `src/dominio/puertos/IAlmacenamientoImagenes.ts`
- `src/dominio/errores/erroresMascotas.ts`
- `src/dominio/errores/erroresTransversales.ts`
- `src/aplicacion/dtos/mascotas/RegistrarMascotaDto.ts`
- `src/aplicacion/casos-de-uso/mascotas/RegistrarMascota.ts`
- `src/infraestructura/adaptadores/PrismaMascotaRepositorio.ts`
- `src/infraestructura/adaptadores/CloudinaryStorageAdapter.ts`
- `src/infraestructura/adaptadores/ContextoAutenticacionSupabase.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/mascotas/route.ts`
- `app/mascotas/nueva/page.tsx`
- `scripts/seed/seed-mascotas.sql`
- `.env.example`
- `.github/workflows/ci.yml`
- `tests/unit/RegistrarMascota.test.ts`
- `tests/unit/CloudinaryStorageAdapter.test.ts`
- `tests/unit/PrismaMascotaRepositorio.test.ts`
- `tests/unit/PaginaNuevaMascota.test.tsx`
- `tests/integration/mascotas.registro.test.ts`

**Contratos y API signatures:**
- `POST /api/mascotas → 201 MascotaRegistrada | 400 PEA-AUTH-010/PEA-SIS-005 | 401 PEA-SIS-001 | 403 PEA-SIS-002 | 500 PEA-SIS-003`
- `RegistrarMascotaSchema / type DatosMascotaDto / type ComandoRegistrarMascota`
- `MascotaRegistradaSchema / type MascotaRegistrada`
- `IRepositorioMascotas, IAlmacenamientoImagenes (puertos)`
- `Tokens DI: 'IRepositorioMascotas' → PrismaMascotaRepositorio, 'IAlmacenamientoImagenes' → CloudinaryStorageAdapter`
- `obtenerUsuarioAutenticado(request) — helper reutilizable para futuras rutas de API que necesiten la sesión actual`
- `NoAutenticadoError (PEA-SIS-001), AccesoNoAutorizadoError (PEA-SIS-002) — reutilizables por cualquier módulo futuro`
- `FotoObligatoriaError (PEA-AUTH-010)`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (nuevas env vars públicas)`


--- 

## 🎯 HU: Edición y baja lógica de mascotas propias
*Criterios de Aceptación/Descripción:*
```text
Como dueño de mascota quiero editar o dar de baja la ficha de mi mascota para mantener mi información actualizada sin perder el historial.
```

### 📄 [✔ COMPLETADA] Casos de uso ActualizarMascota y DarDeBajaMascota con soft delete
- **Rol:** Backend Developer
- **Componente/Ruta:** `DarDeBajaMascota.ts` (src/aplicacion/casos-de-uso/mascotas/DarDeBajaMascota.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
AUTH-05 completo y verificado en caliente. ActualizarMascota y DarDeBajaMascota siguen el mismo Template Method que RegistrarMascota, con verificación de propiedad (dueñoId) en el paso autorizar() antes de cualquier escritura — 404 si no existe/ya fue dada de baja, 403 si no es el dueño. IRepositorioMascotas.actualizar confía en la semántica de Prisma donde 'undefined' significa 'no tocar el campo', verificado con un test dedicado. darDeBaja ejecuta un UPDATE con deletedAt = new Date(), nunca un delete físico, también verificado explícitamente. Ticket delimitado a capa de aplicación/dominio: no incluye route handlers HTTP porque el checklist no los pidió, a diferencia de los dos tickets anteriores.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/mascotas/ActualizarMascota.ts`
- `src/aplicacion/casos-de-uso/mascotas/DarDeBajaMascota.ts`
- `src/aplicacion/dtos/mascotas/ActualizarMascotaDto.ts`
- `src/aplicacion/dtos/zod-helpers.ts`
- `src/aplicacion/dtos/mascotas/RegistrarMascotaDto.ts`
- `src/dominio/puertos/IRepositorioMascotas.ts`
- `src/dominio/errores/erroresMascotas.ts`
- `src/infraestructura/adaptadores/PrismaMascotaRepositorio.ts`
- `scripts/seed/seed-mascotas.sql`
- `tests/unit/ActualizarMascota.test.ts`
- `tests/unit/DarDeBajaMascota.test.ts`
- `tests/unit/PrismaMascotaRepositorio.test.ts`
- `tests/unit/RegistrarMascota.test.ts`
- `tests/integration/mascotas.registro.test.ts`
- `tests/integration/mascotas.baja.test.ts`

**Contratos y API signatures:**
- `ActualizarMascotaSchema / type CambiosMascotaDto / type ComandoActualizarMascota / type ComandoDarDeBajaMascota`
- `ActualizarMascota (caso de uso) — Template Method: validar (Zod parcial) → autorizar propiedad → persistir`
- `DarDeBajaMascota (caso de uso) — Template Method: validar (uuid) → autorizar propiedad → soft delete`
- `IRepositorioMascotas ampliado: buscarPorId, listarPorDueño, actualizar, darDeBaja (type CambiosMascota)`
- `MascotaNoEncontradaError (PEA-AUTH-009, 404)`
- `opcionalDeTexto (src/aplicacion/dtos/zod-helpers.ts) — extraído para reuso entre alta y edición`


--- 

## 🎯 HU: Recuperación segura de contraseña
*Criterios de Aceptación/Descripción:*
```text
Como dueño de mascota quiero recuperar mi contraseña de forma segura para no perder el acceso a mi cuenta sin exponer si un email está registrado.
```

### 📄 [✔ COMPLETADA] Flujo de recuperación de contraseña vía Supabase Auth
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `RecuperarPassword.ts` (src/aplicacion/casos-de-uso/auth/RecuperarPassword.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
AUTH-06 completo y verificado en caliente. RecuperarPassword sigue el Template Method habitual; el requisito anti-enumeración se implementó como un invariante del contrato de IProveedorAutenticacion (nunca rechaza) en vez de una excepción capturada puntualmente, reforzado con un catch-all en el route handler que responde igual ante cualquier falla no controlada. La página de nueva contraseña valida el token de un solo uso escuchando el evento PASSWORD_RECOVERY de Supabase Auth antes de habilitar el submit, y es la única (junto con la carga de imágenes de AUTH-04) que interactúa directo con un SDK de terceros desde el cliente, por diseño explícito del ticket (no duplicar la lógica de expiración de Supabase). Se corrigieron los fakes de IProveedorAutenticacion en tests preexistentes (AUTH-01) para incorporar el método nuevo de la interfaz.

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/auth/RecuperarPassword.ts`
- `src/aplicacion/dtos/auth/RecuperarPasswordDto.ts`
- `src/dominio/puertos/IProveedorAutenticacion.ts`
- `src/infraestructura/adaptadores/SupabaseAuthAdapter.ts`
- `src/infraestructura/adaptadores/ClienteSupabaseNavegador.ts`
- `app/api/auth/recuperar-password/route.ts`
- `app/auth/recuperar-password/page.tsx`
- `app/auth/recuperar-password/nueva/page.tsx`
- `docs/SITEMAP.md`
- `tests/unit/RecuperarPassword.test.ts`
- `tests/unit/SupabaseAuthAdapter.test.ts`
- `tests/unit/PaginaRecuperarPassword.test.tsx`
- `tests/unit/PaginaNuevaPassword.test.tsx`
- `tests/integration/auth.recuperarPassword.test.ts`
- `tests/integration/auth.registro.test.ts`
- `tests/unit/RegistrarUsuario.test.ts`

**Contratos y API signatures:**
- `POST /api/auth/recuperar-password → 200 { mensaje } (siempre idéntico) | 400 PEA-SIS-005`
- `RecuperarPasswordSchema / type RecuperarPasswordDto / type ComandoRecuperarPassword`
- `RecuperarPassword (caso de uso) — contrato: ejecutar() nunca rechaza por causa del email`
- `IProveedorAutenticacion.solicitarRecuperacionPassword(email, redirectTo) — contrato: nunca rechaza la promesa`
- `crearClienteSupabaseNavegador() — único punto de acceso a Supabase Auth desde el navegador`
- `Ruta nueva /auth/recuperar-password/nueva (documentada en SITEMAP.md)`


--- 

## 🎯 HU: Registro de veterinario con matrícula profesional
*Criterios de Aceptación/Descripción:*
```text
Como veterinario/a quiero registrarme cargando mi matrícula y colegio emisor para operar con autoridad profesional verificable en la plataforma.
```

### 📄 [✔ COMPLETADA] Alta de perfil veterinario con Abstract Factory de formularios por rol
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `PerfilFormularioFactory.ts` (src/aplicacion/fabricas/PerfilFormularioFactory.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
AUTH-02 completo y verificado en caliente. PerfilFormularioFactory implementa un Abstract Factory real (fábricas concretas por rol detrás de una interfaz común, confirmado con esquemas no-idénticos en test). RegistrarVeterinario reutiliza el Template Method y el patrón de rollback compensatorio de RegistrarUsuario; el conflicto de matrícula+colegio se distingue del de email haciendo el pre-chequeo de email ANTES de la transacción, evitando depender de la forma exacta de meta.target en el error P2002 de Prisma. PrismaVeterinarioRepositorio usa prisma.$transaction para las 3 escrituras atómicas. Se extendió /api/auth/registro y su página (mismo endpoint físico del ticket AUTH-01) con un selector de rol en vez de crear una ruta nueva, preservando lo ya documentado en SITEMAP.md.

**Archivos Modificados:**
- `src/aplicacion/fabricas/PerfilFormularioFactory.ts`
- `src/aplicacion/casos-de-uso/auth/RegistrarVeterinario.ts`
- `src/aplicacion/dtos/auth/RegistrarVeterinarioDto.ts`
- `src/dominio/entidades/PerfilVeterinario.ts`
- `src/dominio/puertos/IRepositorioVeterinarios.ts`
- `src/dominio/errores/erroresAutenticacion.ts`
- `src/infraestructura/adaptadores/PrismaVeterinarioRepositorio.ts`
- `src/infraestructura/adaptadores/marcadorCredencialSupabase.ts`
- `src/infraestructura/adaptadores/PrismaUsuarioRepositorio.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/auth/registro/route.ts`
- `app/auth/registro/page.tsx`
- `scripts/seed/seed-veterinarios.sql`
- `tests/unit/PerfilFormularioFactory.test.ts`
- `tests/unit/RegistrarVeterinario.test.ts`
- `tests/unit/PrismaVeterinarioRepositorio.test.ts`
- `tests/integration/auth.registroVeterinario.test.ts`
- `tests/unit/PaginaRegistroDueno.test.tsx`

**Contratos y API signatures:**
- `PerfilFormularioFactory.crear(rol: 'dueño'|'veterinario'|'municipio'): z.ZodTypeAny`
- `RegistrarVeterinarioSchema / type RegistrarVeterinarioDto / VeterinarioRegistradoSchema / type VeterinarioRegistrado`
- `RegistrarVeterinario (caso de uso)`
- `IRepositorioVeterinarios.crear(datos) — transacción usuarios+perfiles_veterinario+verificaciones`
- `MatriculaYaRegistradaError (PEA-AUTH-006, 409)`
- `MARCADOR_CREDENCIAL_GESTIONADA_POR_SUPABASE (extraído, compartido entre repositorios de usuarios/veterinarios)`
- `POST /api/auth/registro ahora acepta { rol: 'dueño'|'veterinario', ... } — mismo endpoint, despacho por rol`


--- 

## 🎯 HU: Visualización del estado de verificación profesional
*Criterios de Aceptación/Descripción:*
```text
Como veterinario/a quiero ver el estado de mi verificación profesional de forma permanente para saber cuándo puedo operar con todas las funciones habilitadas.
```

### 📄 [✔ COMPLETADA] Badge de verificación persistente en el perfil del veterinario
- **Rol:** Frontend Developer
- **Componente/Ruta:** `BadgeVerificacion.tsx` (src/presentacion/componentes/auth/BadgeVerificacion.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
AUTH-07 completo y verificado en caliente. BadgeVerificacion siempre comunica el estado con ícono+texto (nunca solo color) y se suscribe directo a Supabase Realtime (postgres_changes filtrado por id propio) para actualizarse sin recargar — misma excepción arquitectónica ya establecida para operaciones inherentemente client-side (Cloudinary en AUTH-04, recuperación de password en AUTH-06). GET /api/perfil reutiliza ContextoAutenticacionSupabase (AUTH-04) para resolver la sesión y expone solo lo que el badge necesita como estado inicial. Se documentó en SCHEMA.md el requisito de habilitar la publicación de Realtime sobre `usuarios`, sin el cual el feature no funciona en un proyecto real; quedó una tarea de seguimiento para verificar esto y el evento PASSWORD_RECOVERY de AUTH-06 contra un proyecto Supabase real, ya que este entorno no tiene esa conectividad.

**Archivos Modificados:**
- `app/api/perfil/route.ts`
- `src/aplicacion/casos-de-uso/perfil/ObtenerPerfilPropio.ts`
- `src/dominio/puertos/IRepositorioPerfil.ts`
- `src/infraestructura/adaptadores/PrismaPerfilRepositorio.ts`
- `src/presentacion/componentes/auth/BadgeVerificacion.tsx`
- `src/aplicacion/contenedor-di.ts`
- `docs/SCHEMA.md`
- `scripts/seed/seed-veterinarios.sql`
- `tests/unit/BadgeVerificacion.test.tsx`
- `tests/unit/ObtenerPerfilPropio.test.ts`
- `tests/unit/PrismaPerfilRepositorio.test.ts`
- `tests/integration/perfil.propio.test.ts`

**Contratos y API signatures:**
- `GET /api/perfil → 200 { id, email, rol, estadoVerificacion, verificadoEn } | 401 PEA-SIS-001 | 500 PEA-SIS-003`
- `BadgeVerificacion({ usuarioId, estadoInicial }) — componente cliente, tipo EstadoVerificacion exportado`
- `IRepositorioPerfil.obtenerPerfilPropio(usuarioId) / ResumenPerfilPropio`
- `ObtenerPerfilPropio (caso de uso, token DI 'IRepositorioPerfil' → PrismaPerfilRepositorio)`


--- 

## 🎯 HU: Alta de cuenta institucional del municipio
*Criterios de Aceptación/Descripción:*
```text
Como administrador de plataforma quiero dar de alta la cuenta institucional del municipio para que acceda con permisos elevados sin habilitar autoregistro público.
```

### 📄 [✔ COMPLETADA] Endpoint restringido a Administrador para alta de cuenta Municipio
- **Rol:** Backend Developer
- **Componente/Ruta:** `CrearCuentaMunicipio.ts` (src/aplicacion/casos-de-uso/auth/CrearCuentaMunicipio.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
AUTH-03 completo y verificado en caliente. CrearCuentaMunicipio reutiliza IRepositorioPerfil (AUTH-07) para verificar rol_actual()==='administrador' del solicitante antes de autorizar, y el patrón Template Method + rollback compensatorio ya establecido para altas (RegistrarUsuario, RegistrarVeterinario). PrismaMunicipioRepositorio usa prisma.$transaction para las 2 escrituras atómicas; a diferencia del veterinario, el municipio queda estado_verificacion='verificado' directo (el alta la hace un administrador, sin cola de aprobación separada). Se confirmó con un test dedicado que /auth/registro sigue sin ofrecer 'Municipio' como opción de autoregistro (comportamiento ya correcto desde AUTH-02, sin necesidad de cambios).

**Archivos Modificados:**
- `src/aplicacion/casos-de-uso/auth/CrearCuentaMunicipio.ts`
- `src/aplicacion/dtos/auth/CrearCuentaMunicipioDto.ts`
- `src/aplicacion/fabricas/PerfilFormularioFactory.ts`
- `src/dominio/entidades/PerfilMunicipio.ts`
- `src/dominio/puertos/IRepositorioMunicipios.ts`
- `src/dominio/errores/erroresAutenticacion.ts`
- `src/infraestructura/adaptadores/PrismaMunicipioRepositorio.ts`
- `src/aplicacion/contenedor-di.ts`
- `app/api/admin/municipio/route.ts`
- `scripts/seed/seed-municipio.sql`
- `tests/unit/CrearCuentaMunicipio.test.ts`
- `tests/unit/PrismaMunicipioRepositorio.test.ts`
- `tests/integration/auth.crearCuentaMunicipio.test.ts`
- `tests/unit/PaginaRegistroDueno.test.tsx`

**Contratos y API signatures:**
- `POST /api/admin/municipio → 201 MunicipioCreado | 400 PEA-SIS-005 | 401 PEA-SIS-001 | 403 PEA-AUTH-011 | 409 PEA-AUTH-001`
- `CrearCuentaMunicipioSchema / type CrearCuentaMunicipioDto / type ComandoCrearCuentaMunicipio / MunicipioCreadoSchema`
- `CrearCuentaMunicipio (caso de uso)`
- `IRepositorioMunicipios.crear(datos) — transacción usuarios+perfiles_municipio`
- `AltaInstitucionalNoAutorizadaError (PEA-AUTH-011, 403)`
- `PerfilFormularioFactory.crear('municipio') ahora devuelve CrearCuentaMunicipioSchema (antes era un esquema inline sin uso real)`


--- 

## 🎯 HU: Cola de verificaciones pendientes
*Criterios de Aceptación/Descripción:*
```text
Como administrador de plataforma quiero revisar una cola de verificaciones pendientes y aprobar o rechazar con motivo para mantener la confianza de la red.
```

### 📄 [✔ COMPLETADA] Panel de verificaciones con aprobación/rechazo auditado
- **Rol:** Full Stack Developer
- **Componente/Ruta:** `ResolverVerificacionCommand.ts` (src/aplicacion/casos-de-uso/auth/ResolverVerificacionCommand.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
AUTH-08 completo y verificado en caliente. ResolverVerificacionCommand sigue el Template Method existente (validar/autorizar/persistir) y usa por primera vez el hook publicarEvento() de CasoDeUsoBase como implementación real del patrón Observer, notificando sin acoplar ni fallar la resolución si la notificación en sí falla. La regla de auditoría 'nunca sobrescribir' se aplica a nivel de repositorio (chequeo de estado dentro de la transacción), con un código de error nuevo (PEA-AUTH-013) documentado en ERRORS.md porque no existía ninguno aplicable. Se agregó la relación Prisma Verificacion.usuario, ausente en el schema, necesaria para el JOIN que el panel requiere. Se detectó y corrigió un bug preexistente de 4 tickets: los DTOs nunca se importaban desde app/api/openapi/route.ts, por lo que sus registros OpenAPI nunca se ejecutaban en runtime.

**Archivos Modificados:**
- `app/admin/verificaciones/page.tsx`
- `app/api/admin/verificaciones/route.ts`
- `app/api/admin/verificaciones/[id]/route.ts`
- `app/api/openapi/route.ts`
- `src/aplicacion/casos-de-uso/auth/ListarVerificacionesPendientes.ts`
- `src/aplicacion/casos-de-uso/auth/ResolverVerificacionCommand.ts`
- `src/aplicacion/dtos/auth/VerificacionesDto.ts`
- `src/dominio/entidades/Verificacion.ts`
- `src/dominio/errores/erroresVerificaciones.ts`
- `src/dominio/puertos/IRepositorioVerificaciones.ts`
- `src/dominio/puertos/INotificacionesRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaVerificacionesRepositorio.ts`
- `src/infraestructura/adaptadores/PrismaNotificacionesRepositorio.ts`
- `src/aplicacion/contenedor-di.ts`
- `prisma/schema.prisma`
- `docs/ERRORS.md`
- `scripts/seed/seed-verificaciones.sql`
- `tests/unit/ListarVerificacionesPendientes.test.ts`
- `tests/unit/ResolverVerificacionCommand.test.ts`
- `tests/unit/PrismaVerificacionesRepositorio.test.ts`
- `tests/unit/PrismaNotificacionesRepositorio.test.ts`
- `tests/unit/PaginaVerificacionesPendientes.test.tsx`
- `tests/unit/openapi.route.test.ts`
- `tests/integration/admin.verificaciones.test.ts`
- `tests/integration/admin.resolverVerificacion.test.ts`

**Contratos y API signatures:**
- `GET /api/admin/verificaciones?pagina&porPagina → 200 PaginaVerificaciones | 401 | 403 PEA-SIS-002`
- `PATCH /api/admin/verificaciones/{id} → 200 VerificacionResuelta | 400 | 401 | 403 PEA-SIS-002 | 409 PEA-AUTH-013`
- `ResolverVerificacionCommand (Command + Observer vía publicarEvento)`
- `ListarVerificacionesPendientes (caso de uso de lectura paginada)`
- `IRepositorioVerificaciones.resolver — nunca sobreescribe una fila no-pendiente`
- `INotificacionesRepositorio.crear — listener del evento VerificacionResuelta`
- `VerificacionYaResueltaError (PEA-AUTH-013, 409) — nuevo en ERRORS.md`
- `Prisma: relación Verificacion.usuario agregada (antes solo el escalar usuarioId)`


--- 

## 🎯 HU: Historial de auditoría de verificaciones
*Criterios de Aceptación/Descripción:*
```text
Como administrador de plataforma quiero consultar el historial de auditoría de cada decisión de verificación para poder justificar y trazar cada aprobación o rechazo.
```

### 📄 [✔ COMPLETADA] Vista de solo lectura del historial de verificaciones resueltas
- **Rol:** Frontend Developer
- **Componente/Ruta:** `HistorialVerificaciones.tsx` (app/admin/auditoria/page.tsx)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
Se implementó una vista de auditoría exclusivamente de solo lectura sobre verificaciones resueltas, reutilizando el agregado de verificaciones existente (AUTH-08) sin introducir escritura alguna. El endpoint aplica autorización de rol en la capa de aplicación (autorizar() del caso de uso, no en middleware.ts) y paginación server-side con tope 50 como defensa en profundidad (route handler + caso de uso). La UI se construyó como tabla real (no cards), sin ningún botón/formulario mutante, verificado explícitamente en tests. Se corrigieron 5 archivos de test preexistentes de AUTH-08 que implementaban IRepositorioVerificaciones y quedaron desalineados con la interfaz extendida.


--- 

## 🎯 HU: Expiración automática de sesión
*Criterios de Aceptación/Descripción:*
```text
Como usuario autenticado quiero que mi sesión expire automáticamente tras una hora de inactividad para que mis datos estén protegidos si pierdo mi dispositivo.
```

### 📄 [✔ COMPLETADA] Verificación de expiración de JWT en middleware Next.js
- **Rol:** Backend Developer
- **Componente/Ruta:** `middleware.ts` (middleware.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
middleware.ts pasa a ser el único punto de verificación de autenticación (no de roles/autorización, que sigue en cada caso de uso) tanto para páginas como para endpoints de API, reemplazando la verificación duplicada por-ruta con una capa central. La decisión de acceso depende exclusivamente de supabase.auth.getUser() (valida firma y vigencia contra el servidor); getSession() se usa post-rechazo, solo para elegir entre PEA-AUTH-005 (sesión vencida) y PEA-SIS-001 (sin sesión/firma inválida) al armar el mensaje — nunca para autorizar. Las páginas conservan el redirect HTML existente; las API responden JSON. El paso 1 del ticket (expiración a 1h) ya estaba configurado en docs/SETUP.md y no requirió cambios.

**Archivos Modificados:**
- `middleware.ts`
- `src/dominio/errores/erroresAutenticacion.ts`
- `src/presentacion/lib/fetchConSesion.ts`
- `tests/integration/middleware.expiracionSesion.test.ts`
- `tests/unit/fetchConSesion.test.ts`

**Contratos y API signatures:**
- `middleware(request: NextRequest): Promise<NextResponse> — sin cambio de firma, comportamiento extendido a /api/mascotas, /api/perfil, /api/admin/*`
- `SesionExpiradaError (PEA-AUTH-005, 401) — nueva clase en src/dominio/errores/erroresAutenticacion.ts`
- `fetchConSesion(input: RequestInfo | URL, init?: RequestInit): Promise<Response>`
- `GET/POST/PATCH sobre /api/mascotas, /api/perfil, /api/admin/verificaciones(/[id]), /api/admin/auditoria, /api/admin/municipio: ahora responden 401 PEA-SIS-001/PEA-AUTH-005 en middleware.ts antes de llegar al route handler`


--- 

## 🎯 HU: Control de acceso anti-IDOR/BOLA en endpoints con dueño
*Criterios de Aceptación/Descripción:*
```text
Como usuario autenticado quiero que el sistema me impida acceder a recursos que no me pertenecen para que mis datos y los de mi mascota estén protegidos de accesos indebidos.
```

### 📄 [✔ COMPLETADA] Middleware de autorización por objeto + políticas RLS por entidad
- **Rol:** Backend Developer
- **Componente/Ruta:** `RepositorioProxy.ts` (src/infraestructura/proxies/RepositorioProxy.ts)

#### 💾 Devolución / Handoff de la IA:
**Resumen Técnico:**
RepositorioProxy es genérico y agnóstico de entidad: recibe el repositorio real, el solicitante y un predicado de pertenencia, y sustituye transparentemente a buscarPorId añadiendo el control de acceso. La decisión clave de diseño es colapsar 'no existe' y 'no es tuyo' en el mismo AccesoNoAutorizadoError (PEA-SIS-002), cerrando el canal de enumeración que exige la AC. Dado que los Módulos 2-4 (reportes, turnos, libreta sanitaria) todavía no tienen repositorios Prisma ni casos de uso reales, las pruebas por entidad usan RepositorioProxy directamente con fakes que replican la forma exacta de cada tabla (dueño único vs. doble parte vs. vínculo transitivo), en vez de forzar una integración HTTP inexistente. La migración RLS es una transcripción literal de docs/ROLES.md Sección 3 (única fuente de verdad), sin inventar columnas ni condiciones; se limitó a las tablas del MVP (Módulos 1-4) y deja las Post-MVP (5-9) para cuando esos módulos se implementen, evitando adivinar columnas de tablas aún no usadas por la aplicación. Deliberadamente no se tocó ActualizarMascota.ts/DarDeBajaMascota.ts: su distinción 404 (no encontrada, dentro del propio scope del dueño) vs. 403 (ajena) es un caso ya testeado y legítimamente distinto del acceso cruzado que el proxy previene.

**Archivos Modificados:**
- `src/infraestructura/proxies/RepositorioProxy.ts`
- `prisma/migrations/migration_lock.toml`
- `prisma/migrations/20260829180000_habilitar_rls_anti_idor_entidades_con_dueno/migration.sql`
- `tests/unit/RepositorioProxy.test.ts`
- `tests/integration/RepositorioProxy.antiIdor.test.ts`
- `tests/integration/mascotas.autorizacion.test.ts`

**Contratos y API signatures:**
- `RepositorioConBusquedaPorId<TEntidad> — interface { buscarPorId(id): Promise<TEntidad|null> }`
- `VerificadorDePropiedad<TEntidad, TSolicitante> — type (entidad, solicitante) => boolean`
- `RepositorioProxy<TEntidad, TSolicitante> implements RepositorioConBusquedaPorId<TEntidad> — buscarPorId(id): Promise<TEntidad> (throws AccesoNoAutorizadoError)`
- `Migración SQL: funciones rol_actual()/veterinario_verificado()/autorizado_sobre_mascota(); RLS + políticas sobre mascotas, perfiles_veterinario, perfiles_municipio, disponibilidad_veterinario, reportes, reportes_historial_estado, eventos, vitrina_adopcion, entradas_libreta_sanitaria, autorizaciones_libreta, turnos, verificaciones, notificaciones`


--- 

