# 13. Solicitudes de asistencia veterinaria filtradas por zona (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener al menos una solicitud de recurso con `tipo='asistencia_veterinaria'` y `estado='abierta'` (usar los 60 registros de `docs/SEED.md`, bloque `tmp_solicitudes`, o publicar una nueva vía `POST /api/red-colaboracion/solicitudes`).
- Tener un usuario con rol `veterinario` autenticado, y un segundo usuario con rol `rescatista` autenticado.

## Pasos
1. Con la sesión del veterinario, `GET /api/red-colaboracion/solicitudes/veterinaria`.
2. Verificar que todos los `items` tengan `tipo: "asistencia_veterinaria"` y `estado: "abierta"`.
3. Repetir el `GET` agregando `?latitud=-37.9989&longitud=-61.3565&radioKm=10` → verificar que solo aparezcan solicitudes de organizaciones dentro de ese radio.
4. Repetir el `GET` con `?pagina=1&porPagina=5` y luego `?pagina=2&porPagina=5` → verificar que `items` cambie entre páginas y `total` se mantenga constante.
5. Con la sesión del rescatista, repetir el paso 1 → debe responder 403.

## Resultado esperado
- Mensaje visible: cuerpo de éxito `{ "items": [...], "total": N, "pagina": 1, "porPagina": 50 }`. Rechazo del rescatista: `{ "codigo": "PEA-SIS-002", "mensaje": "No tenés permiso para realizar esta acción." }`.
- Dónde verificar: respuesta HTTP de `GET /api/red-colaboracion/solicitudes/veterinaria`.
- Código HTTP esperado: 200 (veterinario), 403 (cualquier otro rol, incluido rescatista), 400 (filtro de zona incompleto), 401 (sin sesión).
