# 2. Registro de entrada en la libreta sanitaria (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario con rol `veterinario` y `estado_verificacion='verificado'`, con sesión iniciada (cookie de Supabase Auth).
- Tener una mascota registrada (`mascotas`) de otro usuario con rol `dueño`.
- Tener una fila en `autorizaciones_libreta` que vincule a ese veterinario con esa mascota (`veterinario_id`, `mascota_id`), con `revocada_en IS NULL` para el caso "autorizado". Para probar el caso "revocado", completar `revocada_en` en esa fila.

## Pasos
1. Con la sesión del veterinario AUTORIZADO activa, hacer `POST /api/veterinarios/libreta` con body:
   ```json
   { "mascotaId": "<id de la mascota autorizada>", "tipo": "vacuna", "descripcion": "Vacuna antirrábica aplicada, sin reacciones adversas.", "fecha": "2026-09-08" }
   ```
2. Repetir el mismo POST con un `mascotaId` para el cual el dueño NUNCA autorizó a este veterinario.
3. Repetir el POST con un `mascotaId` cuya autorización tiene `revocada_en` completo.
4. Repetir el POST con un `mascotaId` inexistente (UUID al azar).
5. Repetir el POST con `tipo: "cirugia"` (fuera del enum soportado).
6. Repetir la request sin sesión (sin cookie) para verificar el rechazo.

## Resultado esperado
- Mensaje visible: no aplica (respuesta JSON, no hay UI en este ticket).
- Dónde verificar: cuerpo de la respuesta HTTP de `POST /api/veterinarios/libreta` y la fila nueva en `entradas_libreta_sanitaria`.
- Código HTTP esperado:
  - Paso 1 (autorizado y verificado): `201`, cuerpo con `id`, `mascotaId`, `veterinarioId`, `tipo`, `descripcion`, `fecha`, `createdAt`.
  - Paso 2 (nunca autorizado): `403`, `codigo: "PEA-VET-003"`.
  - Paso 3 (autorización revocada): `403`, `codigo: "PEA-VET-004"`.
  - Paso 4 (mascota inexistente): `404`, `codigo: "PEA-VET-005"`.
  - Paso 5 (tipo inválido): `400`, `codigo: "PEA-VET-006"`.
  - Paso 6 (sin sesión): `401`, `codigo: "PEA-SIS-001"`.
