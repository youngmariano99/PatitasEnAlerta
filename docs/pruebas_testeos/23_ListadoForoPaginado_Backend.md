# 23. Endpoint paginado de temas_foro y respuestas_foro (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario cualquiera autenticado (cualquier rol sirve para consultar el foro).
- Tener sembrados más de 50 temas activos (`docs/SEED.md` ya siembra 70) para probar la paginación.
- Tener al menos un tema con varias respuestas sembradas (`docs/SEED.md` ya siembra 300 `respuestas_foro`).

## Pasos
1. Con la sesión del usuario, `GET /api/foros-cursos/temas` (sin query params) → 200, `items` con exactamente 50 elementos, `total` con el conteo real de temas activos, `pagina: 1`, `porPagina: 50`.
2. `GET /api/foros-cursos/temas?pagina=2` → 200, `items` con el resto de temas (total - 50).
3. `GET /api/foros-cursos/temas?porPagina=200` → 200, `porPagina` clampeado a `50` (no 200).
4. Tomar el `id` de un tema con respuestas sembradas y hacer `GET /api/foros-cursos/temas/{id}/respuestas` → 200, array con las respuestas de ese tema (verificar que todos los `temaId` del array coinciden con el `id` consultado).
5. Sin sesión activa, repetir el paso 1 → 401 con `codigo: "PEA-SIS-001"`.

## Resultado esperado
- Mensaje visible: página de temas `{ "items": [...], "total": N, "pagina": 1, "porPagina": 50 }`; respuestas de un tema `[{ "id": "...", "temaId": "...", "usuarioId": "...", "contenido": "...", "createdAt": "..." }, ...]`; sin sesión `{ "codigo": "PEA-SIS-001", "mensaje": "Necesitás iniciar sesión para hacer esto." }`.
- Dónde verificar: respuestas HTTP de cada request.
- Código HTTP esperado: 200 (listado de temas, listado de respuestas), 401 (sin sesión).
