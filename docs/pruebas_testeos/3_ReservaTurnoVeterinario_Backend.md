# 3. Reserva de turno con un veterinario (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario con rol `veterinario`, cuenta verificada (`estado_verificacion='verificado'`) y al menos una franja de `disponibilidad_veterinario` activa (ver `docs/pruebas_testeos/1_AgendaPropiaVeterinario_Backend.md` para generarla, o ejecutar `POST /api/veterinarios/disponibilidad` seguido de la generación de turnos propios).
- Tener un usuario con rol `dueño` (el "vecino" que va a reservar) con sesión iniciada (cookie de Supabase Auth).
- Tener a mano el `id` de un turno disponible generado para ese veterinario: consultar la tabla `turnos` (Supabase Studio o `SELECT id FROM turnos WHERE proveedor_tipo='veterinario' AND proveedor_id='<id del veterinario>' AND estado='disponible' AND deleted_at IS NULL LIMIT 1;`) — todavía no existe un endpoint de listado público de turnos disponibles por veterinario (fuera del alcance de este ticket).

## Pasos
1. Iniciar sesión como el usuario `dueño`.
2. Enviar `POST /api/turnos/reservar` con body `{ "turnoId": "<id del turno de proveedor_tipo='veterinario'>" }`.
3. Repetir el mismo request una segunda vez con el mismo `turnoId` (simula la carrera / doble clic).
4. Consultar `GET /api/turnos/mis-turnos` con la sesión del `dueño`.

## Resultado esperado
- Mensaje visible: no aplica (respuesta JSON, sin UI en este ticket).
- Dónde verificar: cuerpo de la respuesta de `POST /api/turnos/reservar` y el listado devuelto por `GET /api/turnos/mis-turnos` (el turno reservado debe aparecer con `eventoTitulo: null`, ya que un turno de veterinario nunca tiene `evento_id`).
- Código HTTP esperado: `200` en el primer `POST` (cuerpo `{ id, estado: "reservado", reservadoPor, version }`); `409` con `codigo: "PEA-MUN-001"` en el segundo `POST` (el turno ya no está disponible).
