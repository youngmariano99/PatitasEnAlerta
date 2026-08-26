**Nomenclatura:** `PEA-[MÓDULO]-[CORRELATIVO]` (ej. `PEA-AUTH-001`). Los mensajes de usuario siguen el tono de marca (cercano, instructivo, sin culpar al usuario, sin jerga técnica ni texto interno expuesto — acorde a `estado_verificacion`/NFR de Trazabilidad). Todo error se comunica con texto + ícono, nunca solo color.

## Módulo 1 — Autenticación y Registro de Mascotas

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-AUTH-001 | Ya existe una cuenta con ese email. ¿Querés iniciar sesión o recuperar tu contraseña? | Aplicación (constraint `ux_usuarios_email`) — 409 | Ofrecer botones directos a "Iniciar sesión" y "Recuperar contraseña" en el mismo formulario. |
| PEA-AUTH-002 | El email o la contraseña no son correctos. Revisá los datos e intentá de nuevo. | Middleware (Supabase Auth) — 401 | No indicar cuál de los dos campos falló (anti-enumeración); resaltar ambos campos con `border-red-500` + ícono. |
| PEA-AUTH-003 | El formato del email no parece válido. Ej: `juan.perez@ejemplo.com`. | Aplicación (Zod, fail-fast) — 400 | Validación en tiempo real (`onBlur`), bloquear submit hasta esquema válido. |
| PEA-AUTH-004 | El enlace para recuperar tu contraseña venció o ya fue usado. Pedí uno nuevo. | Aplicación (token de un solo uso) — 400 | Mostrar CTA para reenviar el flujo de recuperación. |
| PEA-AUTH-005 | Tu sesión expiró por seguridad. Iniciá sesión de nuevo para continuar. | Middleware (JWT, expiración 1h) — 401 | Redirigir a `/auth/login`, conservando la acción que se estaba por hacer si es posible. |
| PEA-AUTH-006 | Ya existe una matrícula registrada con esos datos para este colegio. Verificá el número ingresado. | Aplicación (constraint `ux_perfiles_veterinario_matricula`) — 409 | Resaltar los campos matrícula/colegio emisor; sugerir contactar a soporte si el dato es correcto. |
| PEA-AUTH-007 | Tu cuenta de veterinario/a todavía está en revisión. Esta función se habilita cuando quede verificada. | Middleware (RLS / `estado_verificacion`) — 403 | Mostrar el badge "Verificación pendiente" y el tiempo estimado de revisión, sin bloquear el resto de la navegación. |
| PEA-AUTH-008 | No podés acceder a esta información. | Middleware (anti-IDOR/BOLA) — 403 | Redirigir al panel propio del usuario; registrar el intento en logs estructurados (Pino) para auditoría. |
| PEA-AUTH-009 | No encontramos esa mascota o ya no está disponible. | Dominio (soft delete / no encontrado) — 404 | Volver al listado de mascotas propias con un estado vacío claro. |
| PEA-AUTH-010 | Necesitamos al menos una foto de tu mascota para completar el registro. | Aplicación (Zod, campo obligatorio) — 400 | Resaltar el campo de carga de imagen con ícono ⚠️, sin bloquear los demás campos ya completados. |
| PEA-AUTH-011 | Este tipo de cuenta institucional se habilita desde la administración de la plataforma. | Middleware (RLS, alta exclusiva por Admin) — 403 | Mostrar un mensaje de contacto/solicitud institucional en vez del formulario de autoregistro. |
| PEA-AUTH-012 | Hiciste muchos intentos seguidos. Esperá unos minutos antes de volver a intentar. | Middleware (`@upstash/ratelimit`) — 429 | Mostrar el tiempo de espera restante; no exponer el límite exacto configurado. |

## Módulo 2 — Motor de Reportes Unificado

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-REP-001 | Elegí una categoría para tu reporte antes de continuar. | Aplicación (Zod, `CHECK tipo`) — 400 | Selección visual obligatoria (no texto libre), no permitir avanzar de paso sin categoría. |
| PEA-REP-002 | Necesitamos una foto para publicar el reporte. | Aplicación (Zod, campo obligatorio) — 400 | Resaltar el paso de carga de foto; ofrecer acceso directo a cámara del dispositivo. |
| PEA-REP-003 | No pudimos obtener tu ubicación automáticamente. Marcala en el mapa. | Aplicación (fallback geolocalización) — 400 | Mostrar el mapa Leaflet como paso alternativo, sin bloquear el resto del formulario. |
| PEA-REP-004 | Hiciste varios reportes en poco tiempo. Esperá unos minutos antes de enviar otro. | Middleware (`@upstash/ratelimit`, anti-spam) — 429 | Mostrar tiempo de espera; sugerir revisar si el reporte ya existe antes de reintentar. |
| PEA-REP-005 | No encontramos ese reporte o ya no está disponible. | Dominio (soft delete / no encontrado) — 404 | Volver al listado de reportes activos con filtros preservados. |
| PEA-REP-006 | Ese cambio de estado no es válido en este momento. | Dominio (máquina de estados `ReporteEstado`) — 409 | Mostrar solo las transiciones válidas desde el estado actual en la interfaz. |
| PEA-REP-007 | Solo el municipio puede actualizar el estado de un reporte. | Middleware (RLS, rol requerido) — 403 | Ocultar el control de cambio de estado si el rol actual no es `municipio`/`administrador`. |
| PEA-REP-008 | Tu reporte quedó en revisión antes de publicarse, por no cumplir con el formato esperado. | Aplicación (Chain of Responsibility: `ValidadorContenidoImagen`) — 422 | Explicar brevemente qué validación falló (ej. imagen ilegible), permitir volver a subir. |

## Módulo 3 — Municipio: Eventos, Turnera y Vitrina de Adopción

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-MUN-001 | Ese turno ya fue reservado por otra persona justo ahora. Elegí otro horario disponible. | Dominio (control optimista, `version`) — 409 | Refrescar automáticamente la lista de turnos disponibles del proveedor. |
| PEA-MUN-002 | Este operativo ya no tiene cupos disponibles. | Dominio (`cupos_totales` agotado) — 409 | Sugerir el próximo evento disponible del mismo tipo, si existe. |
| PEA-MUN-003 | No encontramos ese evento o turno. | Dominio (soft delete / no encontrado) — 404 | Volver al calendario público de operativos. |
| PEA-MUN-004 | La fecha del evento tiene que ser posterior a hoy. | Aplicación (Zod) — 400 | Resaltar el campo de fecha en el formulario de alta rápida. |
| PEA-MUN-005 | Solo cuentas municipales pueden administrar eventos y la vitrina de adopción. | Middleware (RLS, rol requerido) — 403 | Redirigir al panel correspondiente al rol autenticado. |
| PEA-MUN-006 | Ese animal ya no está disponible para adopción. | Dominio (`vitrina_adopcion.estado ≠ disponible`) — 409 | Refrescar la ficha y sugerir animales similares disponibles. |
| PEA-MUN-007 | El rango de fechas elegido no es válido para exportar el resumen. | Aplicación (Zod) — 400 | Sugerir el rango máximo permitido y ajustar automáticamente si se excede. |

## Módulo 4 — Veterinarios: Agenda y Libreta Sanitaria

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-VET-001 | El horario de fin tiene que ser posterior al de inicio. | Aplicación (Zod / `CHECK hora_fin > hora_inicio`) — 400 | Resaltar ambos campos de horario en el formulario de disponibilidad. |
| PEA-VET-002 | Ese turno ya fue reservado por otra persona justo ahora. Elegí otro horario. | Dominio (control optimista, `version`) — 409 | Refrescar la agenda del veterinario automáticamente. |
| PEA-VET-003 | No tenés autorización del dueño para escribir en la libreta sanitaria de esta mascota. | Middleware (RLS, `autorizado_sobre_mascota`) — 403 | Mostrar cómo solicitar la autorización (código/QR compartido por el dueño). |
| PEA-VET-004 | El dueño de esta mascota revocó tu acceso a su libreta sanitaria. | Dominio (`autorizaciones_libreta.revocada_en`) — 403 | Ocultar la opción de carga; mantener visible el historial ya registrado previamente. |
| PEA-VET-005 | No encontramos esa mascota o no tenés acceso a su información. | Dominio (soft delete / anti-IDOR) — 404 | Volver al listado de pacientes con autorización activa. |
| PEA-VET-006 | Elegí un tipo de entrada válido (vacuna, visita u observación). | Aplicación (Zod, `CHECK tipo`) — 400 | Selección visual, no texto libre, para el tipo de entrada. |
| PEA-VET-007 | Tu cuenta profesional todavía no está verificada. Esta función se habilita al confirmarse tu matrícula. | Middleware (RLS, `estado_verificacion`) — 403 | Mostrar el estado de verificación pendiente con tiempo estimado. |

## Módulo 5 (Post-MVP) — Red de Colaboración entre ONGs y Rescatistas

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-RED-001 | Esta solicitud ya fue cubierta por otra persona. | Dominio (`solicitudes_recurso.estado`) — 409 | Refrescar el listado de solicitudes abiertas. |
| PEA-RED-002 | Ya te ofreciste como colaborador/a en esta solicitud. | Aplicación (evitar duplicados) — 409 | Mostrar el estado de tu colaboración existente en vez del botón de ofrecerse. |
| PEA-RED-003 | No encontramos esa solicitud o ya no está disponible. | Dominio (soft delete / no encontrado) — 404 | Volver al listado de solicitudes de la organización o de la red. |
| PEA-RED-004 | Solo la organización que publicó la solicitud puede aceptar o rechazar colaboraciones. | Middleware (RLS, ownership) — 403 | Ocultar los controles de aceptar/rechazar a quien no sea la organización dueña. |

## Módulo 6 (Post-MVP) — Veterinarios: Funcionalidades Avanzadas

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-VETADV-001 | No queda stock suficiente de este producto. | Dominio (`CHECK stock >= 0`) — 409 | Mostrar el stock disponible actual y permitir ajustar la cantidad pedida. |
| PEA-VETADV-002 | Este producto ya no está disponible en el catálogo. | Dominio (soft delete) — 404 | Sugerir productos similares del mismo veterinario. |
| PEA-VETADV-003 | No podés compartir el historial con vos mismo/a. | Aplicación (`CHECK veterinario_origen ≠ destino`) — 400 | Deshabilitar la opción del propio usuario en el selector de destino. |
| PEA-VETADV-004 | Este pedido ya no se puede cancelar en su estado actual. | Dominio (máquina de estados `pedidos_producto`) — 409 | Mostrar el estado actual del pedido y las acciones realmente disponibles. |

## Módulo 7 (Post-MVP) — Marketplace de Comerciantes

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-COM-001 | Tu comercio todavía está en revisión. Podrás publicar productos una vez verificado. | Middleware (RLS, `estado_verificacion`) — 403 | Mostrar estado de verificación y tiempo estimado. |
| PEA-COM-002 | Elegí un tipo de comercio válido de la lista. | Aplicación (Zod, `CHECK tipo_comercio`) — 400 | Selección visual, no texto libre. |
| PEA-COM-003 | No encontramos ese comercio o ya no está disponible. | Dominio (soft delete / no encontrado) — 404 | Volver al directorio de comercios verificados. |

## Módulo 8 (Post-MVP) — Foros y Cursos de Bienestar Animal

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-FORO-001 | Ya estás inscripto/a en este curso. | Aplicación (`ux_inscripcion_curso_usuario`) — 409 | Mostrar el estado de inscripción existente en vez del botón de inscribirse. |
| PEA-FORO-002 | No encontramos ese curso o esa publicación. | Dominio (soft delete / no encontrado) — 404 | Volver al listado de cursos o al foro. |
| PEA-FORO-003 | Escribí un contenido antes de publicar tu tema o respuesta. | Aplicación (Zod, campo obligatorio) — 400 | Bloquear el botón de publicar hasta que el campo tenga contenido. |
| PEA-FORO-004 | Este contenido fue moderado y ya no puede editarse. | Middleware (moderación de Administrador) — 403 | Mostrar el motivo de moderación si está disponible; permitir contactar a soporte. |

## Módulo 9 (Post-MVP) — Algoritmo de Compatibilidad de Adopción

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-ADOP-001 | Completá el cuestionario para recibir sugerencias de compatibilidad. | Aplicación (Zod, campos obligatorios) — 400 | Marcar los campos pendientes; permitir guardar avance parcial. |
| PEA-ADOP-002 | El animal sugerido ya no está disponible para adopción. | Dominio (`vitrina_adopcion.estado`) — 409 | Regenerar sugerencias excluyendo el animal ya no disponible. |
| PEA-ADOP-003 | No encontramos tu cuestionario de adopción. | Dominio (soft delete / no encontrado) — 404 | Ofrecer completar un cuestionario nuevo. |

## Transversal — Seguridad y Sistema (aplica a todos los módulos)

| Código de Error | Mensaje para el Usuario | Capa / Estado HTTP | Acción Sugerida para Resolución |
|---|---|---|---|
| PEA-SIS-001 | Necesitás iniciar sesión para hacer esto. | Middleware (autenticación) — 401 | Redirigir a `/auth/login` conservando la acción pendiente. |
| PEA-SIS-002 | No tenés permiso para realizar esta acción. | Middleware (anti-IDOR/BOLA, RLS) — 403 | No revelar si el recurso existe o no; registrar el intento en logs estructurados. |
| PEA-SIS-003 | Algo salió mal de nuestro lado. Ya estamos al tanto, probá de nuevo en unos minutos. | Infraestructura (excepción no controlada) — 500 | Nunca mostrar stack trace ni mensaje de base de datos; capturar en OpenTelemetry con ID de correlación. |
| PEA-SIS-004 | El servicio no está disponible en este momento. Probá de nuevo en breve. | Infraestructura (dependencia externa: Cloudinary/Supabase caída) — 503 | Reintento automático con backoff; mostrar estado de servicio si persiste. |
| PEA-SIS-005 | Revisá los datos ingresados, algo no tiene el formato esperado. | Aplicación (Zod, validación de esquema genérica) — 400 | Señalar el/los campos específicos con ícono + texto, nunca solo con color. |
| PEA-SIS-006 | Hiciste muchas solicitudes seguidas. Esperá un momento antes de volver a intentar. | Middleware (`@upstash/ratelimit`, genérico) — 429 | Mostrar tiempo de espera aproximado sin exponer el límite exacto configurado. |
