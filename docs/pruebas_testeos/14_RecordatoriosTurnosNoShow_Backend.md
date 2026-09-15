# 14. Recordatorios de turnos próximos con seguimiento de no-show (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener `CRON_JOBS_SECRET` cargado en `.env.local` (ver `.env.example`; generar con `openssl rand -hex 32`).
- Tener un turno `estado='reservado'` con `franja_inicio` dentro de las próximas 24hs (usar los 260 registros de `docs/SEED.md`, bloque de turnos de veterinario, o reservar uno nuevo vía `POST /api/turnos/reservar`).
- Tener la sesión del proveedor (municipio o veterinario) de ese turno, y la sesión de otro usuario (para probar el rechazo de acceso).

## Pasos
1. Disparar el job manualmente: `curl -X POST http://localhost:3000/api/webhooks/recordatorios-turnos -H "x-cron-secret: $CRON_JOBS_SECRET"`.
2. Verificar la respuesta `{ "turnosEnVentana": N, "notificados": N }`, con `N >= 1` si hay un turno dentro de la ventana.
3. Con la sesión de quien reservó ese turno, `GET /api/notificaciones` → debe aparecer una notificación `tipo: "turno_recordatorio"` con `referenciaTabla: "turnos"`.
4. Repetir el paso 1 inmediatamente → `notificados` debe dar `0` para ese mismo turno (idempotencia: no se duplica el recordatorio).
5. Con la sesión del proveedor del turno, y una vez que `franja_fin` ya pasó, `POST /api/turnos/marcar-asistencia` con `{ "turnoId": "...", "asistio": false }` → 200.
6. Repetir el paso 5 con la sesión de otro usuario (no el proveedor) → 403.
7. Con la sesión del proveedor, `GET /api/turnos/mi-tasa-no-show` → verificar que `totalNoShow`/`totalConcluidos`/`tasa` reflejen el turno marcado en el paso 5.

## Resultado esperado
- Mensaje visible: `POST /api/webhooks/recordatorios-turnos` → `{ "turnosEnVentana": N, "notificados": N }`. `POST /api/turnos/marcar-asistencia` → `{ "id": "...", "asistio": false }`. `GET /api/turnos/mi-tasa-no-show` → `{ "totalConcluidos": N, "totalNoShow": N, "tasa": 0.NN }`.
- Dónde verificar: respuesta HTTP de cada request; tabla `notificaciones` (fila `tipo='turno_recordatorio'`); tabla `turnos` (columna `asistio`).
- Código HTTP esperado: 200 (job disparado, notificación consultada, asistencia marcada, tasa consultada), 401 (webhook sin secreto o secreto incorrecto), 403 (marcar asistencia sin ser el proveedor), 404 (turno inexistente), 409 (franja todavía no concluida).
