# 26. CRUD de cuestionarios_adoptante propio del usuario (Backend)

## Prerequisitos

- Correr `npm run dev`.
- Tener un usuario cualquiera autenticado (cualquier rol sirve para completar el cuestionario propio).
- Tener un segundo usuario autenticado, para probar el acceso exclusivo al propio cuestionario.

## Pasos

1. Con la sesión del usuario A, `POST /api/adopcion-compatibilidad/cuestionario` con `{ "horasSoloEstimadas": 4, "presenciaNinos": false, "espacioDisponible": "departamento", "experienciaPrevia": "Tuvo un gato durante 5 años." }` → 201, con la fila reflejada en `cuestionarios_adoptante` (`usuario_id` del usuario A).
2. Repetir el paso 1 con la misma sesión y `{ "espacioDisponible": "casa_patio_grande" }` → 201, y el mismo `id` que el paso 1 (actualiza, no duplica).
3. Repetir el paso 1 con `espacioDisponible: "mansión"` → 400.
4. Con la sesión del usuario A, `GET /api/adopcion-compatibilidad/cuestionario` → 200, con el cuestionario propio (nunca el de otro usuario).
5. Con la sesión de un usuario B que nunca completó un cuestionario, `GET /api/adopcion-compatibilidad/cuestionario` → 404 con `codigo: "PEA-ADOP-003"`.

## Resultado esperado

- Mensaje visible: alta/actualización exitosa `{ "id": "...", "usuarioId": "...", "horasSoloEstimadas": 4, "presenciaNinos": false, "espacioDisponible": "departamento", "experienciaPrevia": "...", "createdAt": "...", "updatedAt": "..." }`. Espacio disponible inválido: `{ "codigo": "PEA-SIS-005", "mensaje": "..." }`. Sin cuestionario propio: `{ "codigo": "PEA-ADOP-003", "mensaje": "No encontramos tu cuestionario de adopción." }`.
- Dónde verificar: respuestas HTTP de cada request; tabla `cuestionarios_adoptante` (una sola fila por `usuario_id`, `updated_at` cambia en la segunda llamada).
- Código HTTP esperado: 201 (alta/actualización), 200 (consulta propia), 400 (`espacioDisponible` fuera de catálogo), 401 (sin sesión), 404 (sin cuestionario propio).
