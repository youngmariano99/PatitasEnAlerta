# 4. CRUD de autorizaciones a veterinarios sobre la libreta sanitaria (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener una cuenta con rol **dueño** autenticada, con al menos una mascota propia registrada (`mascotaId`).
- Tener una cuenta con rol **veterinario** ya dada de alta (`veterinarioId`) — no hace falta que su matrícula esté verificada para poder autorizarla.
- Un cliente HTTP (Postman/Insomnia/curl) con la cookie de sesión del dueño.

## Pasos
1. Como dueño, `POST /api/mascotas/{mascotaId}/autorizaciones` con body `{ "veterinarioId": "<uuid del veterinario>" }`.
2. Repetir el mismo `POST` con el mismo `veterinarioId` — debe rechazar (ya hay una autorización activa).
3. `GET /api/mascotas/{mascotaId}/autorizaciones` — debe listar la autorización recién creada, con `revocadaEn: null`.
4. `DELETE /api/mascotas/{mascotaId}/autorizaciones/{veterinarioId}` — revoca el acceso.
5. Repetir el `GET` del paso 3 — la misma fila ahora debe tener `revocadaEn` con una fecha.
6. Repetir el `DELETE` del paso 4 — debe rechazar (ya no hay nada activo para revocar).
7. (Anti-IDOR) Repetir los pasos 1, 3 y 4 autenticado como un dueño distinto, dueño de otra mascota, usando el `mascotaId` de otro — todos deben rechazar con 403.

## Resultado esperado
- Mensaje visible: en el paso 1, respuesta `201` con `{ id, mascotaId, veterinarioId, otorgadaEn, revocadaEn: null }`. En el paso 2, `{"codigo":"PEA-VET-009","mensaje":"Ya autorizaste a este veterinario para escribir en la libreta sanitaria de esta mascota."}`. En el paso 4, `200` con `revocadaEn` no nulo. En el paso 6, `{"codigo":"PEA-VET-010","mensaje":"No encontramos esa autorización o ya no está activa."}`. En el paso 7, `{"codigo":"PEA-SIS-002","mensaje":"No tenés permiso para realizar esta acción."}`.
- Dónde verificar: respuesta HTTP directa de cada request; opcionalmente, tabla `autorizaciones_libreta` en Supabase (una fila nueva por cada `POST`, nunca se borra ninguna).
- Código HTTP esperado: `201` (paso 1), `409` (paso 2), `200` (pasos 3-5), `404` (paso 6), `403` (paso 7).
