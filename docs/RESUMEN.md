# 🐾 Patitas en Alerta — Planificación Integral del Producto y la Ingeniería

**Versión:** 2 — MVP reorientado para presentación ante Municipio y medios locales.
**Roles activos:** Product Owner Experto + Ingeniero de Software Senior.
**Visión de largo plazo:** un único ecosistema donde convivan todos los stakeholders del bienestar animal — dueños de mascotas, municipios, veterinarios, refugios/ONGs, rescatistas y comerciantes — con todo lo relacionado a la salud y el bienestar animal centralizado en un solo lugar.
**Alcance de ESTE ciclo (MVP, ~4 semanas):** Autenticación con perfiles de Dueño de Mascota y Registro de Mascotas · Motor de Reportes Unificado (perdidos/encontrados + problemáticas urbanas) · Módulo Municipio (eventos, turnera, dashboard de datos) · Módulo Veterinarios (libreta sanitaria básica + turnos, reutilizando el motor de turnera del Municipio).
**Diferido a post-MVP:** Red de Colaboración entre ONGs/rescatistas, marketplace de comerciantes, venta de productos veterinarios, historia clínica interoperable entre profesionales, algoritmo de compatibilidad de adopción (ver Sección 10).
**Stack de referencia:** Next.js 14+ / TypeScript / Tailwind · Node.js + TSyringe/InversifyJS · PostgreSQL (Supabase) + Prisma + pgvector · Docker + GitHub Actions · Supabase Auth + Upstash Rate Limit.
**Sistema de diseño de referencia:** "Patitas en Alerta UI SYSTEM" — Dark Utility Premium (obligatorio, sin excepciones).

> Nota de trazabilidad: la voz de marca y los principios de accesibilidad extrema de este documento se alinean con el Brandbook institucional del proyecto (empatía estructural, diseño tolerante a errores, reducción de carga cognitiva en momentos de crisis, autoridad institucional frente a un público que incluye funcionarios públicos). La paleta de color y la tipografía siguen estrictamente el sistema de diseño "Dark Utility Premium" indicado como obligatorio, que prevalece sobre cualquier otra referencia cromática.

---

## 0. Resumen Ejecutivo

El público de la presentación cambia la estrategia de producto: si en la sala va a haber funcionarios municipales y medios locales, el MVP tiene que contar, en una demo, una historia que un municipio entienda en 5 minutos: **"esta plataforma organiza sus operativos, le simplifica los turnos a la gente, y le da datos reales que hoy no tiene"** — con el bienestar del animal y del dueño como consecuencia directa y visible de eso.

Por eso el MVP se reordena alrededor de **un solo dato que fluye entre todos los módulos**: cuando un vecino registra su mascota o reporta un problema en la vía pública, ese dato no queda aislado — alimenta automáticamente el dashboard del municipio, sin carga manual de nadie. Esa cadena (reporte ciudadano → dato limpio → decisión pública) es el argumento más fuerte para la audiencia de esta presentación.

### Propuesta de valor por stakeholder — MVP

| Stakeholder | Problema actual | Por qué elegirían la plataforma |
|---|---|---|
| **Municipio** | Decide campañas de vacunación/castración a ciegas, sin datos consolidados; gestiona turnos de forma manual o telefónica. | Dashboard con datos reales alimentados automáticamente por los reportes ciudadanos; alta rápida de operativos; turnera propia sin desarrollo adicional. |
| **Dueños de mascotas** | Publican mascotas perdidas en Facebook (ruido, sin geolocalización real); pierden la libreta sanitaria física. | Reporte estructurado y geolocalizado; ficha de su mascota con historial sanitario que no se pierde. |
| **Veterinarios/as** | Gestión de turnos manual/telefónica; libreta en papel que el dueño extravía. | Agenda propia sobre el mismo motor de turnera del municipio (sin costo de desarrollo adicional para el proyecto); libreta sanitaria digital que no se pierde y da autoridad profesional visible. |

*(La propuesta de valor para ONGs, rescatistas y comerciantes se mantiene vigente para el ecosistema completo — ver Sección 10 — pero no es parte del argumento de esta demo.)*

Dos restricciones de negocio siguen gobernando cada decisión, ahora con una capa adicional relevante por la naturaleza pública del municipio:

1. **Acceso simple, sin fricción.** Tanto para el vecino que reporta como para el funcionario que carga un operativo: cuantos menos pasos, más probabilidad de adopción real de la herramienta.
2. **Confianza y legalidad de los datos.** Al incorporar datos de un municipio y datos sanitarios de mascotas asociados a personas, la plataforma pasa a manejar información sensible bajo la **Ley 25.326 de Protección de Datos Personales** (finalidad del dato, derecho al olvido, seguridad de la información). Esto no es un detalle legal secundario: es un argumento de venta frente al municipio (van a confiar sus datos y los de sus vecinos a esta plataforma) y debe estar resuelto desde el diseño, no parchado después.

---

## 1. Roles y Actores del Sistema (MVP)

| Rol | Descripción | Necesidad crítica |
|---|---|---|
| **Dueño de Mascota** | Persona física, registra su/s mascota/s y reporta pérdidas/hallazgos/problemáticas. | Registro simple, ficha de su mascota siempre accesible, alta probabilidad real de reencuentro si se pierde. |
| **Municipio (Personal Municipal)** | Cuenta institucional que administra eventos/operativos, turnera pública y consulta el dashboard de datos agregados. | Organización de operativos sin fricción, datos confiables para decidir, reducción de filas/llamados telefónicos. |
| **Veterinario/a** | Profesional matriculado, gestiona su agenda propia y la libreta sanitaria de las mascotas que atiende. | Agenda simple, libreta digital que no dependa del papel, verificación profesional visible. |
| **Administrador/a de Plataforma** | Rol interno mínimo, verifica credenciales (matrícula veterinaria, cuenta institucional del municipio) y modera abuso. | Necesario para que el badge de "verificado" tenga sentido real frente al municipio y los medios. |

*(Rescatista/Activista, Organización/ONG y Comerciante siguen siendo actores de la visión completa del producto, pero no tienen historias de usuario activas en este ciclo — ver Sección 10.)*

---

## 2. Backlog de Producto por Módulo (MVP)

### Módulo 1 — Autenticación y Registro de Mascotas

**Por qué:** es la base de todo el ecosistema de datos. Un registro de mascota simple y sin fricción es lo que hace que el vecino elija esta plataforma en vez de un cartel en un poste o un posteo de Facebook — y es el dato fundacional que después vuelve valioso al resto de los módulos (reportes, libreta sanitaria, dashboard municipal).

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| AUTH-01 | Como **dueño de mascota**, quiero registrarme con email y contraseña en menos de 1 minuto, para empezar a usar la plataforma sin fricción. | Formulario fail-fast (Zod), validación en tiempo real, mensaje de error con ícono + texto (nunca solo color). |
| AUTH-02 | Como **veterinario/a**, quiero cargar mi número de matrícula profesional, para operar con autoridad clínica verificable. | Campo matrícula + colegio emisor obligatorios; badge "Verificación pendiente" hasta aprobación de Admin, nunca oculto ni engañoso. |
| AUTH-03 | Como **municipio**, quiero una cuenta institucional distinta a la de un usuario individual, para administrar eventos y ver el dashboard con permisos elevados. | Rol `municipio` con acceso exclusivo a `/municipio/*`; alta gestionada por Administrador de Plataforma (no autoservicio, por ser cuenta institucional única). |
| AUTH-04 | Como **dueño de mascota**, quiero registrar la ficha básica de mi mascota (nombre, especie, raza aproximada, edad, foto, identificación/chip si tiene), para tenerla disponible ante cualquier reporte o visita veterinaria. | Formulario corto (campos mínimos obligatorios: nombre, especie, foto); el resto opcional para no frenar el registro; la mascota queda disponible para vincularse a reportes (Módulo 2) y libreta sanitaria (Módulo 4). |
| AUTH-05 | Como **cualquier usuario**, quiero que mi sesión expire tras 1 hora de inactividad, para proteger mis datos. | JWT verificado (firma + expiración) en middleware, no solo decodificado. |
| AUTH-06 | Como **administrador/a**, quiero una cola simple de verificaciones pendientes (veterinarios y cuenta del municipio), para aprobar con trazabilidad. | Acción de aprobar/rechazar con motivo; decisión registrada en tabla de auditoría. |
| AUTH-07 | Como **cualquier usuario**, quiero que cada endpoint valide que solo accedo a mis propios recursos (mi mascota, mis reportes), para estar protegido de accesos indebidos. | Middleware anti-IDOR/BOLA en el 100% de los endpoints con dueño; test de integración que intenta acceso cruzado y espera 403. |

---

### Módulo 2 — Motor de Reportes Unificado (Perdidos/Encontrados + Problemáticas Urbanas)

**Por qué:** "mascota perdida", "mascota encontrada" y "animal suelto/problema de sanidad en la vía pública" son, para el vecino, situaciones distintas — pero para el sistema son el mismo problema técnico: alguien reporta algo con foto, ubicación y categoría, y ese reporte necesita visibilidad y seguimiento. Construirlo como un único motor con categorías, en vez de tres módulos separados, es lo que permite tenerlo completo dentro de las 4 semanas **y** es lo que hace posible que cada reporte alimente el dashboard del municipio sin trabajo adicional.

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| REP-U-01 | Como **dueño de mascota**, quiero reportar que mi mascota se perdió, con foto + geolocalización automática, en el menor número de pasos, para maximizar la chance de reencuentro en las primeras horas. | Geolocalización автоcapturada (fallback manual en mapa Leaflet); foto obligatoria (Cloudinary); envío en ≤3 pasos; puede vincularse a una mascota ya registrada (Módulo 1) para completar datos automáticamente. |
| REP-U-02 | Como **vecino**, quiero reportar que encontré una mascota, con los mismos pasos simples, para que el dueño pueda encontrarla rápido. | Mismo flujo que REP-U-01, categoría `encontrado`; no requiere tener mascota propia registrada. |
| REP-U-03 | Como **vecino**, quiero reportar una problemática urbana (animales sueltos, posible foco de sanidad, accidente vial con animal), para que el municipio tenga visibilidad y pueda actuar. | Categoría `problematica` con subtipo; mismo motor de foto+geo+estado que los reportes de mascotas, pero visible por defecto en el panel del municipio, no solo en el de vecinos. |
| REP-U-04 | Como **municipio**, quiero ver todos los reportes activos en un panel con tabla ultra-alineada y mapa, para hacer triage y asignar recursos. | Tabla `font-mono` en columnas de datos; filtro por categoría/zona/estado; paginación server-side; actualización en tiempo real (Supabase). |
| REP-U-05 | Como **municipio o vecino**, quiero actualizar el estado de un reporte (Reportado → En revisión → En atención → Resuelto → Cerrado), para que todos vean el avance real. | Transiciones restringidas (máquina de estados); historial de cambios auditado. |
| REP-U-06 | Como **dueño de mascota**, quiero recibir notificación si aparece un reporte de "encontrado" compatible con mi mascota perdida (misma zona/especie), para enterarme apenas hay una pista. | Notificación por coincidencia de zona + especie (regla simple en el MVP; el campo `descripcion_embedding` queda sembrado desde ahora para una futura coincidencia semántica — ver Sección 10). |
| REP-U-07 | Como **vecino o municipio**, quiero ver un estado vacío claro cuando no hay reportes activos en una zona, para no confundirlo con un error. | Contenedor `border-dashed`, texto explicativo, CTA azul primario. |

---

### Módulo 3 — Municipio: Eventos, Turnera y Dashboard de Datos

**Por qué:** este es el módulo que tiene que "cerrar la sala" en la presentación. Reemplaza turneras telefónicas y convocatorias informales por una herramienta digital simple, y convierte los reportes ciudadanos del Módulo 2 en inteligencia geográfica accionable — sin que el municipio tenga que cargar nada a mano para obtenerla.

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| MUN-01 | Como **municipio**, quiero cargar un evento/operativo (ej. jornada de castración móvil) con fecha, ubicación y cupos, en segundos, para convocar a la comunidad sin fricción administrativa. | Panel de alta rápida: formulario corto, cupos como número simple; publicado inmediatamente en el calendario público. |
| MUN-02 | Como **vecino**, quiero ver el calendario de operativos del municipio con dirección y horario exactos, para saber dónde y cuándo asistir. | Vista de calendario + mapa (Leaflet); sin necesidad de estar logueado para consultarlo (reduce fricción de adopción). |
| MUN-03 | Como **vecino**, quiero reservar un turno dentro de un operativo o evento con cupo limitado, para asegurarme un lugar sin ir a hacer fila. | Motor de Turnera (compartido con Módulo 4): selección de franja disponible, confirmación inmediata, cancelación simple. Control de concurrencia optimista para evitar doble reserva del mismo cupo (anti race-condition). |
| MUN-04 | Como **municipio**, quiero un dashboard con mapas de calor y métricas agregadas (reportes de problemáticas por zona, cobertura de eventos, tendencias por período), para decidir dónde enfocar recursos. | Alimentado automáticamente por los datos del Módulo 2 (reportes) y Módulo 3 (asistencia a eventos); cálculo sobre vista agregada/materializada, nunca en consulta pesada en caliente. |
| MUN-05 | Como **municipio**, quiero exportar un resumen simple de la actividad del período (reportes atendidos, eventos realizados, turnos gestionados), para comunicarlo a la comunidad o a medios. | Exportación CSV como mínimo viable (PDF con diseño queda como mejora post-demo si el tiempo alcanza). |

**Motor de Turnera — nota de arquitectura:** se construye **una sola vez** como componente genérico (franjas, cupos, reservas, cancelaciones, control de concurrencia) y se reutiliza con dos "proveedores" distintos: Municipio (Módulo 3) y Veterinarios (Módulo 4). Es la misma lógica de negocio, solo cambia quién define la disponibilidad y quién reserva. Este es exactamente el tipo de decisión que el patrón **Strategy/Adapter** de la Sección 4 está pensado para resolver sin duplicar código.

---

### Módulo 4 — Veterinarios: Libreta Sanitaria Básica + Turnos

**Por qué:** ataca dos frustraciones documentadas y muy concretas: el dueño que llega a una consulta sin la libreta física (6 de cada 10, según los propios relevamientos del proyecto) y el veterinario que gestiona turnos por teléfono o WhatsApp. Se mantiene deliberadamente simple — sin turnos avanzados, sin venta de productos, sin historia clínica interoperable entre profesionales — porque esas funciones tocan responsabilidad médica y requieren validación que no corresponde resolver en 4 semanas.

| ID | Historia de usuario | Criterios de aceptación |
|---|---|---|
| VET-01 | Como **veterinario/a**, quiero definir mis franjas horarias disponibles, para que los dueños reserven turno sin llamarme. | Reutiliza el Motor de Turnera del Módulo 3 con proveedor `veterinario`; configuración simple de horarios por día. |
| VET-02 | Como **dueño de mascota**, quiero reservar un turno con un veterinario verificado, para no depender de un llamado telefónico. | Selección de franja disponible + confirmación; cancelación/reprogramación simple; sin pagos online en este ciclo. |
| VET-03 | Como **veterinario/a**, quiero cargar una entrada en la libreta sanitaria de una mascota que atiendo (vacuna, visita, observación breve), para que el dueño tenga ese historial disponible siempre. | Entrada simple (fecha, tipo, descripción corta) asociada a la `Mascota` ya registrada por el dueño (Módulo 1); requiere que el dueño haya autorizado el vínculo (ej. compartiendo un código/QR de su mascota) — **no acceso libre a cualquier ficha**. |
| VET-04 | Como **dueño de mascota**, quiero ver la libreta sanitaria completa de mi mascota en un solo lugar, para no depender del papel. | Vista cronológica simple, ordenada por fecha, en `font-mono` para las fechas. |
| VET-05 | Como **dueño de mascota**, quiero controlar qué veterinario puede escribir en la libreta de mi mascota, para mantener el control sobre mis propios datos sanitarios. | Autorización explícita por mascota (no implícita); revocable; queda registrado quién y cuándo escribió cada entrada (auditoría). |

**Nota deliberada de alcance:** *no* incluye en este ciclo venta de productos, recordatorios automáticos avanzados, ni "compartir la libreta entre múltiples veterinarios" como registro médico formal — eso requiere un marco de responsabilidad profesional que amerita su propio análisis y queda en la Sección 10.

---

## 3. Requisitos No Funcionales (medibles)

### 3.1 Seguridad y Protección de Datos Personales

| Requisito | Medición / implementación |
|---|---|
| Autenticación robusta | Supabase Auth, JWT verificado (firma + expiración), expiración de sesión: **1 hora**. |
| Control de acceso por objeto (anti-IDOR/BOLA) | Middleware en el 100% de los endpoints con dueño (mascota, reporte, entrada de libreta, turno). Test de integración dedicado por entidad. |
| Anti-inyección | 100% queries vía Prisma parametrizado. Prohibido SQL crudo sin tipar. |
| Anti-XSS | DOMPurify en todo contenido generado por usuario (descripciones de reportes, observaciones de libreta). |
| Cumplimiento Ley 25.326 (Protección de Datos Personales) | Finalidad del dato explícita en cada formulario (para qué se usa cada campo); soporte de derecho al olvido (baja de cuenta con supresión/bloqueo efectivo de datos personales); cifrado (Node Crypto/TLS) de datos sensibles asociados a personas físicas. |
| Autorización granular en datos sanitarios | La libreta sanitaria de una mascota **nunca** es editable por un veterinario sin autorización explícita del dueño (VET-05) — este es un requisito de confianza, no solo técnico. |
| Rate limiting anti-abuso | `@upstash/ratelimit`: máx. 5 reportes/hora por usuario no verificado, máx. 10 intentos de login/15 min por IP. |
| CORS | Allowlist explícita, sin `*` en producción. |
| Secretos | Prohibido hardcodear claves; `Service_Role Key` exclusivamente server-side; prohibido `NEXT_PUBLIC_` para credenciales. |
| Auditoría | Soft delete + historial de estado en `Reporte`, `Turno`, `EntradaLibretaSanitaria`, y decisiones de verificación de `Administrador`. |

### 3.2 Rendimiento y Escalabilidad

| Requisito | Medición |
|---|---|
| Listados paginados | Ningún listado (reportes, eventos, libreta) retorna más de 50 registros sin paginación server-side. |
| Tiempo de respuesta API | p95 < 400ms en lecturas paginadas; p95 < 800ms en creación de reporte con imagen. |
| Concurrencia en turnos | Control optimista (`updated_at`/versión) al reservar un cupo — evita doble reserva del mismo turno (MUN-03). |
| Dashboard municipal | Cálculo sobre vista agregada/materializada, refrescada asincrónicamente, nunca sobre consulta en vivo pesada. |
| Disponibilidad | Docker + Docker Compose; pipeline CI/CD en GitHub Actions con verificación de build antes de cada despliegue. |

### 3.3 Accesibilidad (sistema de diseño obligatorio)

| Requisito | Medición |
|---|---|
| Tamaño de fuente | Mínimo 14px en toda la interfaz. |
| Área táctil | Mínimo 44×44px en todo elemento interactivo. |
| Comunicación de errores | Nunca solo por color: siempre texto + ícono. |
| Bajo nivel de alfabetización digital / adultos mayores | Placeholders educativos con ejemplos reales; ayuda contextual en estados vacíos; calendario del municipio consultable sin login. |
| Contraste | Paleta obligatoria (`slate-950`/`slate-50`); prohibido negro/blanco puro. |

### 3.4 Calidad y Testing

| Requisito | Medición |
|---|---|
| Cobertura mínima objetivo | 80% (`npm run test:coverage`), priorizada en Auth, Motor de Reportes y Turnera (el corazón demostrable del MVP — ver Sección 7.1). |
| Pirámide de testing | 70% unitarios / 20% integración / 10% E2E (Playwright). |
| Documentación de API | 100% de endpoints documentados vía `zod-to-openapi`. |

### 3.5 Trazabilidad y Observabilidad

| Requisito | Medición |
|---|---|
| Logging estructurado | Pino en todo caso de uso, sin `console.log` en datos sensibles. |
| Trazas distribuidas | OpenTelemetry en flujos críticos (creación de reporte, reserva de turno, escritura en libreta sanitaria). |
| Mensajes al cliente | Lenguaje empático, nunca error interno expuesto (stack traces, mensajes de base de datos). |
| Borrado lógico | Soft delete obligatorio en todas las entidades de negocio. |

---

## 4. Arquitectura de Software

### 4.1 Capas (Clean Architecture + DDD)

```
┌─────────────────────────────────────────────────────────┐
│  Presentación (Next.js App Router — Server/Client Comp.) │
│  → DTOs de entrada/salida, ningún tipo de dominio cruza   │
└───────────────────────────┬─────────────────────────────┘
┌───────────────────────────▼─────────────────────────────┐
│  Aplicación (Casos de Uso)                                │
│  → CrearReporte, ReservarTurno, RegistrarEntradaLibreta,   │
│    PublicarEvento, GenerarDashboardMunicipal...            │
└───────────────────────────┬─────────────────────────────┘
┌───────────────────────────▼─────────────────────────────┐
│  Dominio (Entidades, Value Objects, Reglas de negocio)     │
│  → Usuario, Mascota, Reporte, Evento, Turno,                │
│    EntradaLibretaSanitaria                                  │
└───────────────────────────┬─────────────────────────────┘
┌───────────────────────────▼─────────────────────────────┐
│  Infraestructura (Adaptadores)                             │
│  → Prisma (Postgres/Supabase), Cloudinary, Leaflet,        │
│    Supabase Auth, Upstash — implementan interfaces de      │
│    dominio, nunca al revés                                 │
└─────────────────────────────────────────────────────────┘
```

Inyección de dependencias con **TSyringe/InversifyJS**: cada caso de uso declara sus puertos (`IRepositorioReportes`, `IRepositorioTurnos`, `IProveedorAutenticacion`, `IAlmacenamientoImagenes`) como interfaces segregadas por responsabilidad.

### 4.2 Mapa de Patrones de Diseño → Casos de Uso Reales

| Patrón | Aplicación concreta en Patitas en Alerta (MVP) |
|---|---|
| **Singleton** | Instancia única de `PrismaClient`, `Logger` (Pino), `ConfigService` (variables de entorno validadas con Zod al arranque). |
| **Factory Method** | `NotificacionFactory`: construye la notificación adecuada (push/email) según el evento (`ReporteCoincidente`, `TurnoConfirmado`). |
| **Abstract Factory** | `PerfilFormularioFactory`: genera el conjunto correcto de campos/validadores según el rol (Dueño, Veterinario, Municipio). |
| **Builder** | `DashboardMunicipalBuilder`: arma la consulta agregada del Módulo 3 paso a paso (rango de fechas, zona, categoría de reporte) antes de ejecutarla. |
| **Adapter** | `CloudinaryStorageAdapter`, `SupabaseAuthAdapter`, `LeafletMapAdapter`: encapsulan SDKs de terceros detrás de interfaces de dominio. |
| **Decorator** | `ConAuditoriaDecorator`, `ConRateLimitDecorator`, `ConLoggingDecorator` envuelven casos de uso sin ensuciar su lógica central. |
| **Flyweight** | Caché de íconos de marcador del mapa (Leaflet) por categoría de reporte, evitando instanciar un ícono por cada punto geoespacial renderizado. |
| **Proxy** | `RepositorioMascotaProxy` verifica autorización (¿este veterinario tiene permiso del dueño para escribir en esta libreta? — VET-05) antes de delegar al repositorio real; `CacheProxy` sobre las agregaciones del dashboard municipal. |
| **Observer** | Evento de dominio `ReporteActualizado` notifica a listeners desacoplados (notificaciones, dashboard municipal, auditoría) sin acoplar el caso de uso principal. |
| **Strategy** | **El corazón del Motor de Turnera compartido**: `ProveedorTurnera` con implementaciones intercambiables `TurneraMunicipio` y `TurneraVeterinario` — misma lógica de reserva/concurrencia, distinta fuente de disponibilidad. También `EstrategiaPriorizacionReporte` (por categoría, por zona). |
| **Command** | Cada mutación relevante (`ReservarTurnoCommand`, `CambiarEstadoReporteCommand`, `RegistrarEntradaLibretaCommand`) es un comando auditable, habilitando historial completo. |
| **State** | `ReporteEstado` con subclases (`Reportado`, `EnRevision`, `EnAtencion`, `Resuelto`, `Cerrado`) — transiciones válidas explícitas. |
| **Template Method** | `CasoDeUsoBase.ejecutar()`: validar DTO → sanitizar (DOMPurify) → autorizar → persistir → loggear → publicar evento. Reutilizado por `CrearReporte`, `PublicarEvento`, `RegistrarEntradaLibreta`. |
| **Visitor** | `ExportadorDashboardVisitor` recorre distintas entidades para producir la exportación CSV del Módulo 3 (MUN-05) sin ensuciar las clases de dominio. |
| **Mediator** | `CoordinadorTurneraMediator`: al reservar un turno, coordina verificación de cupo + notificación + auditoría sin acoplar Módulo 3 y Módulo 4 entre sí. |
| **Chain of Responsibility** | Pipeline de validación de reporte nuevo: `ValidadorEsquemaZod` → `ValidadorRateLimit` → `ValidadorContenidoImagen` → `ValidadorGeolocalizacion`. |

### 4.3 Modelo de Dominio Conceptual (3FN)

```
Usuario (id, email, password_hash, rol [dueño|veterinario|municipio|admin],
         estado_verificacion, created_at, deleted_at)
 ├─ PerfilVeterinario (usuario_id FK, matricula, colegio_emisor, verificado_en)
 └─ PerfilMunicipio   (usuario_id FK, nombre_institucional, verificado_en)

Mascota (id, dueño_id FK Usuario, nombre, especie, raza, edad_aproximada,
         foto_url, identificacion_chip NULL, created_at, deleted_at)

Reporte (id, tipo [perdido|encontrado|problematica], subtipo NULL,
         reportado_por FK Usuario, mascota_id FK Mascota NULL,
         descripcion, descripcion_embedding VECTOR(1536),
         latitud, longitud, estado, version, created_at, updated_at, deleted_at)
 └─ ReporteHistorialEstado (id, reporte_id FK, estado_anterior, estado_nuevo,
                             usuario_id FK, timestamp)

Evento (id, municipio_id FK Usuario, titulo, tipo, direccion,
        latitud, longitud, fecha, cupos_totales, created_at, deleted_at)

Turno (id, proveedor_tipo [municipio|veterinario], proveedor_id FK Usuario,
       evento_id FK Evento NULL, reservado_por FK Usuario NULL,
       franja_inicio, franja_fin, estado [disponible|reservado|cancelado],
       version, created_at, deleted_at)

AutorizacionLibreta (id, mascota_id FK Mascota, veterinario_id FK Usuario,
                      otorgada_en, revocada_en NULL)
EntradaLibretaSanitaria (id, mascota_id FK Mascota, veterinario_id FK Usuario,
                          tipo [vacuna|visita|observacion], descripcion,
                          fecha, created_at, deleted_at)

VerificacionPendiente (id, usuario_id FK, tipo, estado,
                        revisado_por FK Usuario NULL, motivo_rechazo, created_at)
```

Todas las tablas de negocio: soft delete, 3FN estricta, `version`/`updated_at` para control optimista donde hay concurrencia real (Reporte, Turno). El campo `descripcion_embedding` en `Reporte` se siembra desde el MVP aunque su uso completo (coincidencia semántica) sea post-MVP (Sección 10) — así se evita rediseñar el esquema más adelante.

---

## 5. Sistema de Diseño Aplicado (resumen operativo)

| Token | Valor | Uso |
|---|---|---|
| `bg-slate-950` | Fondo base | Layout general |
| `bg-slate-800` | Superficie 1 | Tarjetas, tablas, modales |
| `bg-slate-700` | Superficie 2 | Hover de filas, fondo de inputs |
| `text-slate-50` / `text-slate-400` | Texto principal / muted | Contenido / metadatos |
| `blue-500` | Acento core | Botón primario, links activos, selección |
| `emerald-500` | Éxito | Guardado, estado positivo |
| `red-500` | Error | Validaciones, alertas destructivas |
| `font-mono` (JetBrains Mono) | Obligatorio | IDs, fechas, matrícula, columnas de tabla |

Prohibiciones activas en cada Pull Request: sin púrpura/violeta/índigo, sin negro/blanco puro, sin fuente <14px, sin objetivo táctil <44px, sin comunicación de error solo por color.

---

## 6. Sitemap / Arquitectura de Información

```
/auth
 ├─ /login
 ├─ /registro                     (Dueño de mascota | Veterinario)
 └─ /recuperar-password

/panel                            (dashboard raíz, redirige según rol)

/mascotas
 ├─ /mascotas                     (mis mascotas registradas)
 ├─ /mascotas/nueva
 ├─ /mascotas/[id]                (ficha + libreta sanitaria)
 └─ /mascotas/[id]/libreta        (historial cronológico, autorizaciones)

/reportes
 ├─ /reportes                     (listado + filtros + mapa, público sin login para consulta)
 ├─ /reportes/nuevo                (perdido | encontrado | problemática)
 └─ /reportes/[id]

/municipio                        (rol Municipio)
 ├─ /municipio/eventos
 ├─ /municipio/eventos/nuevo
 ├─ /municipio/turnera
 └─ /municipio/dashboard

/veterinario                      (rol Veterinario)
 ├─ /veterinario/agenda           (define franjas — Motor de Turnera)
 ├─ /veterinario/turnos
 └─ /veterinario/pacientes        (mascotas con libreta autorizada)

/turnos
 ├─ /turnos/reservar              (vecino: reserva turno municipal o veterinario)
 └─ /turnos/mis-turnos

/admin
 ├─ /admin/verificaciones
 └─ /admin/auditoria
```

---

## 7. Roadmap de Entrega — MVP en 4 Semanas

| Semana | Foco | Entregable al cierre de la semana |
|---|---|---|
| **Semana 1 — Fundamentos** | Infraestructura + Auth + Registro de Mascotas | Repo, Docker, CI básico, esquema Prisma, registro/login por rol (AUTH-01/02/03/05/07), ficha básica de mascota (AUTH-04), tokens del Design System aplicados. |
| **Semana 2 — Motor de Reportes Unificado** | Módulo 2 completo | Reportar perdido/encontrado/problemática (REP-U-01 a 03), panel del municipio con tabla+mapa en tiempo real (REP-U-04), máquina de estados (REP-U-05), estado vacío (REP-U-07). |
| **Semana 3 — Municipio: Motor de Turnera + Dashboard** | Módulo 3 completo | Alta de eventos (MUN-01), calendario público (MUN-02), Motor de Turnera genérico funcionando para el proveedor Municipio (MUN-03), dashboard alimentado por reportes (MUN-04). |
| **Semana 4 — Veterinarios + pulido para demo** | Módulo 4 (reutilizando Turnera) + hardening liviano | Agenda del veterinario sobre el mismo Motor de Turnera (VET-01/02), libreta sanitaria básica con autorización del dueño (VET-03/04/05), revisión de accesibilidad, datos de demo cargados, guion de presentación. |

### 7.1 Priorización dentro del MVP

**Innegociable para la demo** (sin esto no hay historia completa que mostrarle al municipio): AUTH-01/03/04/07, REP-U-01/02/03/04/05, MUN-01/02/03/04, VET-01/02/03/04.

**Recortable a versión simplificada si el tiempo aprieta**: AUTH-06 (verificación manual sin cola sofisticada), REP-U-06 (notificación de coincidencia — puede quedar para la semana siguiente a la demo), MUN-05 (exportación — CSV simple basta), VET-05 (autorización puede resolverse con un toggle simple en vez de un flujo con revocación completa, siempre que quede registrado quién escribió qué).

**Postergable directamente a post-MVP sin afectar la demo**: coincidencia semántica de reportes (el campo `descripcion_embedding` se crea igual desde el MVP, su uso queda para después — ver Sección 10), cobertura de testing al 80% completo (se prioriza en Auth, Motor de Reportes y Turnera, que son el corazón demostrable).

Cada semana cierra con: build funcionando en CI y revisión rápida de adherencia al sistema de diseño.

---

## 8. Métricas de Éxito (KPIs de Producto)

El criterio rector: **cada métrica que se muestre tiene que responder "¿esto significa que el municipio decide mejor, el vecino recupera más rápido a su mascota, o el veterinario pierde menos tiempo administrativo?"**. Nada de métricas de actividad sin conexión a un resultado real — es justamente lo que separa a esta plataforma de "una más".

- **Tiempo promedio entre reporte y primera actualización de estado** (mide si el municipio/comunidad realmente reacciona rápido).
- **Tasa de resolución de reportes** (Resuelto+Cerrado / Total reportados), general y por categoría (perdido/encontrado/problemática).
- **Cobertura geográfica de reportes** (mapa de calor — el argumento visual más fuerte para medios y municipio).
- **Turnos gestionados sin ausentismo** vs. turnos cancelados a tiempo (proxy directo del valor prometido al municipio y al veterinario).
- **Mascotas registradas con libreta sanitaria activa** (mide adopción real del módulo veterinario, no solo instalaciones).
- **Reencuentros reportados** (mascotas marcadas como "encontrada" tras haber sido reportadas como "perdida" — la métrica más humana y más citable en medios).
- **Disponibilidad del sistema** (uptime) y **p95 de latencia** en creación de reporte.

> Nota de diseño de datos: el esquema (Sección 4.3) ya está normalizado y con timestamps consistentes desde el MVP para que estas métricas —y las que se sumen para ONGs, comerciantes y el algoritmo de adopción— se calculen sin rediseñar nada más adelante.

---

## 9. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| El alcance creció (Municipio + Dueños + Veterinarios) sin extender el plazo. | Motor de Reportes y Motor de Turnera compartidos entre módulos (Sección 4.2) — se construye una vez, se reutiliza dos veces, en vez de triplicar trabajo. |
| Datos sensibles (salud de mascotas, datos de personas) mal manejados frente a una auditoría pública o mediática. | Cumplimiento explícito de Ley 25.326 desde el diseño (Sección 3.1), autorización granular para escribir en la libreta sanitaria (VET-05), nunca acceso implícito. |
| Doble reserva del mismo turno/cupo bajo uso simultáneo el día de la demo. | Control optimista de concurrencia obligatorio en `Turno` (NFR 3.2), cubierto por test de integración específico. |
| Falsos reportes o spam en el panel público del municipio (mala imagen frente a medios). | Rate limiting por usuario no verificado, pipeline de validación en cadena antes de publicar un reporte. |
| Expectativa de "historia clínica interoperable" mal comunicada como si fuera parte del MVP. | Alcance explícitamente acotado en el Módulo 4 (libreta básica, autorización por mascota) y documentado como diferido en la Sección 10 — evita prometer de más frente al municipio. |

---

## 10. Roadmap Post-MVP — Hacia el Ecosistema Completo

Esta sección documenta la visión completa del proyecto (unir a todos los stakeholders del bienestar animal) sin comprometer la fecha de presentación. Nada de esto se construye en las 4 semanas del MVP.

| Prioridad | Stakeholder / línea | Qué incluye | Por qué viene después |
|---|---|---|---|
| **Alta** | ONGs / Rescatistas | **Red de Colaboración**: solicitudes de recurso (tránsito, adopción, asistencia veterinaria), directorio de aliados verificados, coordinación entre entidades. *(Era el foco del ciclo anterior de este documento — se reincorpora acá tras la decisión de priorizar Municipio para esta presentación.)* | Requiere el núcleo de Reportes y verificación ya estable; el argumento de venta a ONGs no depende de la fecha de esta presentación puntual. |
| **Alta** | Veterinarios | **Turnos avanzados** (recordatorios automáticos, pagos online), **venta de productos/insumos**, **historia clínica interoperable entre múltiples profesionales** con marco de responsabilidad médica definido formalmente. | Requiere validación legal/profesional que no corresponde resolver en 4 semanas — se lo dijiste vos mismo, y es la decisión correcta. |
| **Media** | Comerciantes | Directorio / marketplace de productos y servicios para mascotas. | Necesita una base de usuarios activa (dueños + municipio + veterinarios) para ser atractivo — no tiene sentido antes de tener demanda real. |
| **Media** | Dueños de mascotas | **Foros y cursos** de bienestar animal (contenido propio o de ONGs/municipio). | Responde a "encontrar respuesta a todas las dudas" de la visión original; depende de tener ya una comunidad activa consumiendo la plataforma. |
| **Estratégica (mediano plazo)** | Todos | **Algoritmo de Compatibilidad de Adopción** — el diferencial que reduce devoluciones y problemas de convivencia, no solo "una adopción más". | Necesita datos de calidad ya acumulados. La base técnica se siembra desde el MVP: `descripcion_embedding` (pgvector) en `Reporte` deja pavimentado el camino de un emparejamiento por reglas simples a uno semántico, y después a un modelo de lenguaje, sin rediseñar el esquema. |

**Principio de arquitectura que sostiene este roadmap:** los patrones Strategy y Adapter aplicados en la Sección 4 (el mismo mecanismo que hizo posible reutilizar la Turnera entre Municipio y Veterinarios) están pensados exactamente para esto — sumar Red de Colaboración, marketplace o un motor de matching de IA debe ser, en la mayor medida posible, una decisión de configuración y extensión, no una reescritura del sistema.

---

*Documento vivo: cada historia de usuario listada aquí es una unidad de trabajo lista para descomponerse en tareas técnicas de sprint. Cualquier funcionalidad no listada en el backlog del MVP (Sección 2) o en el roadmap post-MVP (Sección 10) debe tratarse como una nueva propuesta a evaluar, no como un supuesto implícito del alcance actual.*
