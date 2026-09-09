# 6. Publicación de solicitudes de recurso (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener una cuenta con rol **organizacion** autenticada (Módulo 5, Post-MVP — `roles.id = 7`, ver `docs/ROLES.md`). Si tu base local no tiene ese rol todavía, correr el script de `docs/SEED.md` (incluye `INSERT INTO roles ... (7,'organizacion') ON CONFLICT DO NOTHING`).
- Un cliente HTTP (Postman/Insomnia/curl) con la cookie de sesión de esa cuenta.
- Opcional: el `id` de un reporte existente (`reportes.id`) para probar el vínculo `reporteId`.

## Pasos
1. Como cuenta `organizacion`, `POST /api/red-colaboracion/solicitudes` con body `{ "tipo": "transito", "descripcion": "Necesitamos tránsito temporal para 3 cachorros rescatados esta semana." }`.
2. Repetir el mismo `POST` agregando `"reporteId": "<uuid de un reporte existente>"`.
3. Repetir el `POST` del paso 1 con `"tipo": "dinero"` (fuera del catálogo soportado) — debe rechazar.
4. Repetir el `POST` del paso 1 sin el campo `descripcion` — debe rechazar.
5. Repetir el `POST` del paso 1 sin cookie de sesión — debe rechazar.
6. Repetir el `POST` del paso 1 autenticado con una cuenta de otro rol (ej. `dueño`, `veterinario`, `municipio`, `administrador` o `rescatista`) — debe rechazar.

## Resultado esperado
- Mensaje visible: en los pasos 1 y 2, respuesta `201` con `{ id, organizacionId, tipo, descripcion, reporteId, estado: "abierta", createdAt }`. En el paso 3, `{"codigo":"PEA-SIS-005","mensaje":"Elegí qué tipo de recurso necesitás."}`. En el paso 4, `{"codigo":"PEA-SIS-005","mensaje":"Contanos brevemente qué necesitás."}`. En el paso 5, `{"codigo":"PEA-SIS-001","mensaje":"Necesitás iniciar sesión para hacer esto."}`. En el paso 6, `{"codigo":"PEA-SIS-002","mensaje":"No tenés permiso para realizar esta acción."}`.
- Dónde verificar: respuesta HTTP directa de cada request; opcionalmente, tabla `solicitudes_recurso` en Supabase (una fila nueva por cada `POST` exitoso, con `organizacion_id` igual al `id` de la sesión autenticada).
- Código HTTP esperado: `201` (pasos 1-2), `400` (pasos 3-4), `401` (paso 5), `403` (paso 6).
