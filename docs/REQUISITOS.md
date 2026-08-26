## 1. Requisitos Funcionales

> Esta sección incluye **todo** lo pensado para el producto, no solo el MVP, para que cualquier decisión de modelado de datos o arquitectura contemple desde el día uno hacia dónde va a crecer el sistema. Está dividida en dos bloques: **1.A — Alcance MVP** (lo que se construye en las próximas 4 semanas) y **1.B — Alcance Post-MVP** (lo que queda diseñado y documentado, pero no se construye todavía).

### 1.A — Alcance MVP (Fase actual — próximas 4 semanas)

### Módulo 1: Autenticación y Registro de Mascotas

**Dueño de Mascota**
- Registrarse con email y contraseña, con validación fail-fast en tiempo real (Zod) y mensajes de error con ícono + texto.
- Registrar la ficha de su mascota (nombre, especie, raza, edad aproximada, foto obligatoria; identificación/chip opcional).
- Editar o dar de baja (soft delete) sus propias mascotas registradas.
- Recuperar contraseña mediante flujo seguro de un solo uso, sin filtrar si el email existe (anti-enumeración).

**Veterinario/a**
- Registrarse cargando número de matrícula profesional y colegio emisor como campos obligatorios.
- Visualizar el estado de su verificación profesional (`Pendiente` / `Verificado`) de forma permanente y no engañosa.

**Municipio**
- Acceder mediante cuenta institucional única, dada de alta exclusivamente por el Administrador de Plataforma (sin autoregistro público).

**Administrador de Plataforma**
- Revisar una cola de verificaciones pendientes (veterinarios, cuenta municipal) y aprobar o rechazar con motivo obligatorio.
- Consultar el historial de auditoría de cada decisión de verificación.

**Todos los roles**
- Sesión con expiración automática a la 1 hora de inactividad (JWT verificado, no solo decodificado).
- Acceso restringido exclusivamente a los recursos propios (mascota, reporte, turno) — control anti-IDOR/BOLA en cada endpoint.

### Módulo 2: Motor de Reportes Unificado (Mascotas Perdidas/Encontradas + Alertas Ciudadanas de Problemáticas Urbanas)

**Dueño de Mascota / Vecino**
- Reportar una mascota perdida con foto obligatoria (Cloudinary) y geolocalización automática (con fallback manual en mapa Leaflet) en un máximo de 3 pasos.
- Reportar una mascota encontrada mediante el mismo flujo simplificado, sin requerir mascota propia registrada.
- Reportar una problemática urbana (animal suelto, foco sanitario, accidente vial con animal) con categoría estricta obligatoria y evidencia fotográfica.
- Consultar el listado de reportes activos con filtro por categoría, zona y estado, en vista de mapa y de tabla.
- Recibir notificación cuando se publica un reporte "encontrado" compatible en zona y especie con su reporte "perdido" activo.

**Municipio**
- Visualizar la totalidad de reportes activos en tabla ultra-alineada (`font-mono` en columnas de datos) con filtros y paginación server-side.
- Actualizar el estado de cada reporte según la máquina de estados: `Reportado → En revisión → En atención → Resuelto → Cerrado`.
- Consultar el historial completo de cambios de estado de cada reporte.

**Sistema (validación automática, sin intervención directa de usuario)**
- Aplicar rate-limiting por usuario no verificado antes de aceptar un nuevo reporte (anti-saturación del panel municipal).
- Ejecutar validación de esquema estructurado (categoría estricta + evidencia fotográfica obligatoria) antes de publicar cualquier reporte.
- Rechazar tempranamente (fail-fast) reportes que no cumplan el esquema mínimo, evitando que datos incompletos lleguen al panel municipal.

### Módulo 3: Municipio — Eventos, Turnera de Zoonosis, Dashboard y Vitrina de Adopción

**Municipio**
- Cargar un evento/operativo (castración móvil, vacunación antirrábica, desparasitación) con fecha, dirección exacta, cupos y requisitos, mediante panel de alta rápida (segundos, no minutos).
- Configurar cupos de turnera multi-evento de forma independiente por tipo de operativo.
- Publicar, editar y dar de baja fichas de animales en adopción (edad, tamaño, temperamento, estado de salud, requisitos de adopción), con acceso restringido exclusivamente a cuentas municipales.
- Consultar el dashboard analítico con mapas de calor geoespaciales de incidentes, mordeduras y animales sueltos, filtrable por categoría y período.
- Exportar un resumen de actividad del período en formato CSV.

**Vecino / Dueño de Mascota**
- Consultar el calendario y mapa de operativos municipales sin necesidad de iniciar sesión.
- Reservar un turno dentro de un operativo con cupo disponible.
- Monitorear en tiempo real el estado de su turno reservado.
- Consultar la vitrina de adopción institucional y las fichas detalladas de cada animal.
- Cancelar o reprogramar su propio turno.

### Módulo 4: Veterinarios — Agenda y Libreta Sanitaria Básica

**Veterinario/a**
- Configurar franjas horarias disponibles, reutilizando el motor de turnera del Módulo 3 (mismo mecanismo, distinto proveedor).
- Consultar su listado de turnos reservados.
- Registrar una entrada en la libreta sanitaria (vacuna, visita o observación) de una mascota, exclusivamente cuando el dueño haya autorizado ese vínculo.

**Dueño de Mascota**
- Reservar un turno con un veterinario verificado.
- Autorizar o revocar el acceso de un veterinario específico para escribir en la libreta sanitaria de su mascota.
- Consultar el historial cronológico completo de la libreta sanitaria de su mascota.

---

### 1.B — Alcance Post-MVP (Fase 2 en adelante — diseñado, no construido todavía)

### Módulo 5: Red de Colaboración entre ONGs y Rescatistas

**Organización / Refugio**
- Publicar solicitudes de recursos (tránsito temporal, insumos, asistencia veterinaria, adopción gestionada por la organización).
- Consultar un directorio de aliados verificados (otras ONGs, veterinarios, rescatistas) filtrable por rol y zona.
- Coordinar el seguimiento de una colaboración aceptada en un hilo dedicado, con historial persistente.
- Buscar solicitudes o reportes históricos por similitud semántica de descripción (ej. "gato asustadizo con otros perros"), combinando búsqueda vectorial con filtros exactos.

**Rescatista / Activista (nuevo rol individual)**
- Registrarse con un rol distinto al de Dueño de Mascota, orientado a la coordinación en terreno.
- Ofrecerse como colaborador ante una solicitud publicada por una organización.
- Consultar sus propias métricas de contribución, sin exposición pública comparativa frente a otros usuarios.

**Veterinario/a**
- Recibir y filtrar solicitudes de asistencia veterinaria de la Red por zona y especialidad.

### Módulo 6: Veterinarios — Funcionalidades Avanzadas

**Veterinario/a**
- Enviar recordatorios automáticos (push/email) de turnos próximos, con seguimiento de tasa de no-show.
- Publicar y vender productos/insumos propios de su clínica dentro de la plataforma.
- Compartir el historial sanitario de una mascota con otro/a veterinario/a de forma interoperable, bajo un marco de responsabilidad profesional formalmente definido (requiere validación legal/normativa antes de desarrollarse — no es solo una tarea técnica).

### Módulo 7: Marketplace de Comerciantes

**Comerciante**
- Registrar su comercio (pet shop, forrajería, peluquería canina, farmacia veterinaria habilitada, etc.), sujeto a verificación.
- Publicar catálogo de productos y/o servicios.
- Obtener visibilidad frente a dueños de mascotas activos en su zona.

**Dueño de Mascota**
- Buscar y contactar comercios o servicios cercanos relacionados a su mascota.

### Módulo 8: Foros y Cursos de Bienestar Animal

**Organización / Municipio**
- Publicar cursos de tenencia responsable y cuidado de mascotas.
- Publicar contenido educativo dentro de un foro moderado.

**Dueño de Mascota**
- Consultar el foro y resolver dudas sobre bienestar de su mascota.
- Inscribirse a cursos publicados por organizaciones o el municipio.

### Módulo 9: Algoritmo de Compatibilidad de Adopción

**Municipio / Organización**
- Publicar una ficha de adopción con atributos estructurados (temperamento, nivel de energía, compatibilidad con niños/otros animales, necesidades médicas).

**Adoptante potencial**
- Completar un cuestionario de estilo de vida y entorno (horas que el animal pasará solo, presencia de niños, espacio disponible, experiencia previa).
> **Nota para el diseño de base de datos:** este bloque 1.B es el motivo por el cual, aun en el MVP, ciertas decisiones de esquema ya se toman pensando en esta escala futura — por ejemplo, el campo `descripcion_embedding` (pgvector) en `Reporte` desde el día uno (para el futuro Módulo 5 y Módulo 9), o mantener `Usuario.rol` como un valor extensible en vez de una tabla rígida de dos roles (para poder sumar `rescatista` y `comerciante` sin migración destructiva). El objetivo es que sumar estos módulos más adelante sea extender el esquema, no rediseñarlo.

---

| Categoría | Requisito | Parámetro medible |
|---|---|---|
| Seguridad — Autenticación | Sesión verificada, no solo decodificada | Expiración de JWT a **1 hora**, verificación de firma en middleware Next.js en el 100% de los endpoints protegidos |
| Seguridad — Control de acceso | Anti-IDOR/BOLA | Middleware de autorización por objeto en el 100% de endpoints con dueño (mascota, reporte, turno, libreta); mínimo 1 test de integración por entidad que valide rechazo (403) ante acceso cruzado |
| Seguridad — Anti-inyección | Queries parametrizadas | 100% de las consultas vía Prisma tipado; prohibido SQL crudo sin tipar |
| Seguridad — Anti-XSS | Sanitización de contenido de usuario | DOMPurify obligatorio en toda descripción de reporte y observación de libreta antes de renderizar |
| Seguridad — Anti-abuso | Rate limiting | Máx. 5 reportes/hora por usuario no verificado (`@upstash/ratelimit`); máx. 10 intentos de login cada 15 min por IP |
| Seguridad — Secretos | Gestión de credenciales | Prohibido hardcodear claves; `Service_Role Key` de Supabase exclusivamente server-side; prohibido `NEXT_PUBLIC_` para credenciales |
| Seguridad — CORS | Allowlist | Sin origen `*` habilitado en producción |
| Rendimiento | Paginación | Ningún listado (reportes, turnos, vitrina de adopción) retorna más de 50 registros sin paginación server-side |
| Rendimiento | Tiempo de respuesta | p95 < 400ms en lecturas paginadas; p95 < 800ms en creación de reporte con imagen |
| Rendimiento | Concurrencia | Control optimista (`updated_at`/versión) obligatorio al reservar un turno, evitando doble reserva del mismo cupo |
| Rendimiento | Dashboard municipal | Cálculo sobre vista agregada/materializada, nunca sobre consulta en vivo de alto costo |
| Accesibilidad | Tipografía | Tamaño mínimo de fuente: 14px en toda la interfaz |
| Accesibilidad | Área táctil | Mínimo 44×44px en todo elemento interactivo |
| Accesibilidad | Comunicación de error | Nunca solo por color: siempre texto descriptivo + ícono |
| Accesibilidad | Contraste | Paleta obligatoria `slate-950`/`slate-50`; prohibido negro puro y blanco puro |
| Calidad | Cobertura de testing | Mínimo 80% (`npm run test:coverage`), verificado en CI antes de merge |
| Calidad | Pirámide de testing | 70% unitarios / 20% integración / 10% E2E (Playwright) |
| Calidad | Documentación de API | 100% de endpoints documentados automáticamente vía `zod-to-openapi` |
| Trazabilidad | Logging estructurado | Pino en todo caso de uso; prohibido `console.log` sobre datos sensibles |
| Trazabilidad | Observabilidad | OpenTelemetry en flujos críticos: creación de reporte, reserva de turno, escritura en libreta sanitaria |
| Trazabilidad | Borrado lógico | Soft delete obligatorio en toda entidad de negocio; ninguna tabla permite `DELETE` físico desde la aplicación |
| Trazabilidad | Mensajes al cliente | Lenguaje empático; prohibido exponer errores internos (stack traces, mensajes de base de datos) |
| Infraestructura | Disponibilidad y despliegue | Contenedorización con Docker/Docker Compose; pipeline de CI/CD en GitHub Actions con verificación de build antes de cada despliegue |

---

## 3. Sitemap / Arquitectura de Información

```
/auth
 ├─ /login
 ├─ /registro                     (Dueño de mascota | Veterinario)
 └─ /recuperar-password

/panel                            (dashboard raíz, redirige según rol)

/mascotas
 ├─ /mascotas                     (mis mascotas registradas)
 ├─ /mascotas/nueva
 ├─ /mascotas/[id]                (ficha)
 └─ /mascotas/[id]/libreta        (historial cronológico + autorizaciones a veterinarios)

/reportes
 ├─ /reportes                     (listado + filtros + mapa — consulta pública sin login)
 ├─ /reportes/nuevo                (perdido | encontrado | problemática)
 └─ /reportes/[id]

/municipio                        (rol Municipio)
 ├─ /municipio/eventos
 ├─ /municipio/eventos/nuevo
 ├─ /municipio/turnera
 ├─ /municipio/dashboard
 └─ /municipio/adopciones          (alta/baja de fichas — Vitrina de Adopción)

/adopciones                       (consulta pública de la Vitrina de Adopción)

/veterinario                      (rol Veterinario)
 ├─ /veterinario/agenda           (define franjas — motor de turnera compartido)
 ├─ /veterinario/turnos
 └─ /veterinario/pacientes        (mascotas con libreta autorizada)

/turnos
 ├─ /turnos/reservar              (vecino: turno municipal o veterinario)
 └─ /turnos/mis-turnos

/admin
 ├─ /admin/verificaciones
 └─ /admin/auditoria
```
