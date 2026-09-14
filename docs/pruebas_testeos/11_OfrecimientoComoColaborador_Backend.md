# 11. Ofrecimiento como colaborador sobre una solicitud de recurso (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener una organización con una solicitud de recurso publicada y `estado='abierta'` (ver actividad "Publicación de solicitudes de recurso", `docs/pruebas_testeos/6_PublicarSolicitudRecurso_Backend.md`, o los 60 registros de `tmp_solicitudes` de `docs/SEED.md`).
- Tener un usuario con rol `rescatista` o `veterinario` autenticado (Supabase Auth) distinto de la organización dueña.

## Pasos
1. Con la sesión del rescatista/veterinario, enviar `POST /api/red-colaboracion/solicitudes/{id}/colaboraciones` (sin body) usando el id de una solicitud `abierta`.
2. Verificar en la respuesta que `estado` sea `"propuesta"`.
3. Repetir el mismo `POST` con la misma sesión y la misma solicitud → debe responder 409 con `codigo: "PEA-RED-002"`.
4. Con la sesión de la organización dueña de esa solicitud, `GET /api/notificaciones` (o el listado de notificaciones propias) → debe aparecer una notificación `tipo: "colaboracion_propuesta"` con `referenciaTabla: "colaboraciones"`.
5. Repetir el paso 1 contra una solicitud con `estado='cubierta'` o `'cancelada'` → debe responder 409 con `codigo: "PEA-RED-001"`.
6. Repetir el paso 1 con la sesión de un usuario con rol `dueño` → debe responder 403 con `codigo: "PEA-SIS-002"`.

## Resultado esperado
- Mensaje visible: cuerpo de éxito `{ "id": "...", "solicitudId": "...", "stakeholderId": "...", "estado": "propuesta", "createdAt": "..." }`. En el segundo intento (paso 3): `{ "codigo": "PEA-RED-002", "mensaje": "Ya te ofreciste como colaborador/a en esta solicitud." }`.
- Dónde verificar: respuesta HTTP de cada request; tabla `colaboraciones` (una sola fila por par `solicitud_id`/`stakeholder_id`, `estado='propuesta'`); tabla `notificaciones` (fila nueva con `usuario_id` = organización dueña).
- Código HTTP esperado: 201 (primer ofrecimiento), 409 (ofrecimiento duplicado o solicitud no abierta), 403 (rol no autorizado), 404 (solicitud inexistente).
