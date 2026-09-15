# 12. Métricas personales de contribución (Backend-Frontend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario con rol `rescatista` (o `veterinario`) autenticado, con al menos una colaboración propia en estado `completada` (ver actividades "Comando OfrecerseComoColaboradorCommand" y "Vista de seguimiento de colaboraciones" para llegar a ese estado, o los 90 registros de `docs/SEED.md`).
- Tener un segundo usuario con rol `rescatista`/`veterinario` distinto, con sus propias colaboraciones completadas (para el paso de aislamiento).

## Pasos
1. Con la sesión del primer usuario, `GET /api/red-colaboracion/metricas`.
2. Verificar que `totalCompletadas` cuente únicamente colaboraciones propias con `estado='completada'`, y que `porTipo` desglose por el tipo de la solicitud asociada.
3. Verificar que el payload NO incluya ningún campo de ranking, promedio general ni comparación con otros usuarios.
4. Repetir el mismo `GET` con la sesión del segundo usuario → el resultado debe ser distinto y corresponder únicamente a SUS colaboraciones.
5. Navegar a `/red-colaboracion/metricas` en el navegador con cualquiera de las dos sesiones → verificar que las tarjetas muestren los mismos números que el paso 2/4, en tipografía `font-mono`, sin ningún elemento de comparación entre usuarios.
6. Sin sesión activa, navegar a `/red-colaboracion/metricas` → debe redirigir a `/auth/login`.

## Resultado esperado
- Mensaje visible: cuerpo de éxito `{ "totalCompletadas": N, "porTipo": { "transito": X, ... } }`. En la UI: tarjeta principal con el total en `font-mono` y una tarjeta por tipo con colaboraciones completadas.
- Dónde verificar: respuesta HTTP de `GET /api/red-colaboracion/metricas`; página `/red-colaboracion/metricas`.
- Código HTTP esperado: 200 (con sesión), 401 (sin sesión, vía API) / redirección 307 a `/auth/login` (sin sesión, vía página).
