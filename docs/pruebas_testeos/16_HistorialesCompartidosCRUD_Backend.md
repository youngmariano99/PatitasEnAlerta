# 16. CRUD de historiales_compartidos con autorización explícita y revocable (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Setear `FEATURE_HISTORIALES_COMPARTIDOS=true` en `.env.local` (por defecto está deshabilitado — ver Paso 3 del ticket) y reiniciar el server.
- Tener dos usuarios con rol `veterinario` distintos (origen y destino) y una mascota existente cualquiera.

## Pasos
1. Con `FEATURE_HISTORIALES_COMPARTIDOS` sin definir (o en `false`), `POST /api/veterinarios/historiales-compartidos` con sesión de veterinario → 403 con `codigo: "PEA-SIS-002"` (la función se comporta como si no existiera).
2. Con el flag en `true`, con la sesión del veterinario A, `POST /api/veterinarios/historiales-compartidos` con `{ "mascotaId": "<uuid>", "veterinarioDestinoId": "<id del veterinario A>" }` (compartir consigo mismo) → 400 con `codigo: "PEA-VETADV-003"`.
3. Con la misma sesión, `POST /api/veterinarios/historiales-compartidos` con `{ "mascotaId": "<uuid>", "veterinarioDestinoId": "<id del veterinario B>" }` → 201, guardar el `id` devuelto.
4. Con la sesión del veterinario B (destino, no origen), `PATCH /api/veterinarios/historiales-compartidos/{id}/revocar` → 403 con `codigo: "PEA-SIS-002"`.
5. Con la sesión del veterinario A (origen), `PATCH /api/veterinarios/historiales-compartidos/{id}/revocar` → 200, `revocadoEn` distinto de `null`.
6. Repetir el paso 5 → 404 con `codigo: "PEA-VETADV-006"` (ya estaba revocado).

## Resultado esperado
- Mensaje visible: alta exitosa `{ "id": "...", "mascotaId": "...", "veterinarioOrigenId": "...", "veterinarioDestinoId": "...", "autorizadoEn": "...", "revocadoEn": null }`. Compartir con uno mismo: `{ "codigo": "PEA-VETADV-003", "mensaje": "No podés compartir el historial con vos mismo/a." }`. Feature flag apagado o revocación ajena: `{ "codigo": "PEA-SIS-002", "mensaje": "No tenés permiso para realizar esta acción." }`.
- Dónde verificar: respuestas HTTP de cada request; tabla `historiales_compartidos` (columna `revocado_en`, la fila nunca se borra).
- Código HTTP esperado: 201 (alta), 200 (revocación), 400 (compartir con uno mismo), 401 (sin sesión), 403 (feature flag apagado o revocación por quien no es el origen), 404 (mascota/veterinario destino inexistente, o historial inexistente/ya revocado).
