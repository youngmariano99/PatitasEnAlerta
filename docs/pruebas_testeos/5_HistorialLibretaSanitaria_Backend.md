# 5. Consulta del historial cronológico de la libreta sanitaria (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener una cuenta con rol **dueño** autenticada, con al menos una mascota propia registrada (`mascotaId`).
- Al menos una entrada ya registrada en la libreta de esa mascota (ver `docs/pruebas_testeos/2_RegistrarEntradaLibreta_Backend.md`) para que el historial no aparezca vacío.
- Un cliente HTTP (Postman/Insomnia/curl) con la cookie de sesión del dueño.

## Pasos
1. Como dueño, `GET /api/mascotas/{mascotaId}/libreta`.
2. Repetir con `?pagina=1&porPagina=1` si hay más de una entrada, para confirmar la paginación.
3. (Anti-IDOR) Repetir el paso 1 autenticado como un dueño distinto (dueño de otra mascota), usando el `mascotaId` ajeno — debe rechazar con 403.
4. Repetir el paso 1 con un `mascotaId` inexistente — debe rechazar con 404.

## Resultado esperado
- Mensaje visible: en el paso 1, `200` con `{ items: [...], total, pagina: 1, porPagina: 50 }`, entradas ordenadas por `fecha` descendente (la más reciente primero). En el paso 3, `{"codigo":"PEA-SIS-002","mensaje":"No tenés permiso para realizar esta acción."}`. En el paso 4, `{"codigo":"PEA-AUTH-009","mensaje":"No encontramos esa mascota o ya no está disponible."}`.
- Dónde verificar: respuesta HTTP directa de cada request; opcionalmente, tabla `entradas_libreta_sanitaria` en Supabase filtrando por `mascota_id`.
- Código HTTP esperado: `200` (pasos 1-2), `403` (paso 3), `404` (paso 4).
