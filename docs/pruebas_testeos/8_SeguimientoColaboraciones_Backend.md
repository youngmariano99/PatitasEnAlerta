# 8. Vista de seguimiento de colaboraciones con historial persistente (Backend)

## Prerequisitos
- Correr `npm run dev` con las migraciones aplicadas (incluida `20260909140000_agrega_historial_estado_colaboraciones`) y el seed de `docs/SEED.md` cargado (aporta filas de `colaboraciones` con distintos `estado`).
- Tener una sesión iniciada con un usuario de rol `organizacion` que sea dueño de la `solicitud_recurso` asociada a la colaboración a probar (para el PATCH), y con el `stakeholder_id` (rescatista/veterinario) de esa misma colaboración (para el GET).
- Conocer el `id` de una colaboración en estado `propuesta` (consultarlo directamente en la tabla `colaboraciones` del seed, ya que todavía no existe un endpoint de alta/listado de colaboraciones).
- Un cliente HTTP que reenvíe las cookies de sesión de Supabase Auth.

## Pasos
1. Con la sesión de la organización dueña, hacer `PATCH /api/red-colaboracion/colaboraciones/{id}/estado` con body `{ "estado": "aceptada" }` sobre una colaboración en `propuesta`.
2. Repetir el Paso 1 sobre la misma colaboración (ahora en `aceptada`) con body `{ "estado": "completada" }`.
3. Intentar `PATCH /api/red-colaboracion/colaboraciones/{id}/estado` con `{ "estado": "propuesta" }` sobre una colaboración ya `completada` (transición inválida).
4. Iniciar sesión con un usuario ajeno (ni la organización dueña ni el stakeholder) y repetir el Paso 1 sobre otra colaboración en `propuesta`.
5. Con la sesión de la organización dueña o del stakeholder, hacer `GET /api/red-colaboracion/colaboraciones/{id}/historial` sobre la colaboración del Paso 1/2.
6. Repetir el Paso 5 con un usuario ajeno (ni organización dueña, ni stakeholder, ni administrador).
7. Repetir el Paso 1 con un `id` de colaboración inexistente.

## Resultado esperado
- **Paso 1:** 200, cuerpo `{ id, estado: "aceptada", estadoAnterior: "propuesta" }`.
- **Paso 2:** 200, cuerpo `{ id, estado: "completada", estadoAnterior: "aceptada" }`.
- **Paso 3:** 409, `codigo: "PEA-RED-006"`.
  - Mensaje visible: "Ese cambio de estado no es válido para esta colaboración."
- **Paso 4:** 403, `codigo: "PEA-RED-004"`.
  - Mensaje visible: "Solo la organización que publicó la solicitud puede aceptar o rechazar colaboraciones."
- **Paso 5:** 200, con un arreglo de items `{ id, estadoAnterior, estadoNuevo, usuarioId, registradoEn }` ordenados cronológicamente (`registradoEn` ascendente) — debe reflejar las dos transiciones de los Pasos 1 y 2.
- **Paso 6:** 403, `codigo: "PEA-SIS-002"`.
  - Mensaje visible: "No tenés permiso para realizar esta acción."
- **Paso 7:** 404, `codigo: "PEA-RED-005"`.
  - Mensaje visible: "No encontramos esa colaboración o ya no está disponible."
- Dónde verificar: la respuesta JSON cruda de ambos endpoints, y la tabla `colaboraciones_historial_estado` directamente en la base (no hay pantalla propia todavía — este ticket es solo de backend).
- Código HTTP esperado: 200 (Pasos 1, 2 y 5), 403 (Pasos 4 y 6), 404 (Paso 7), 409 (Paso 3).
