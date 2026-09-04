# 1. Agenda propia del veterinario — listado de turnos reservados (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario con rol `veterinario` y `estado_verificacion='verificado'`, con sesión iniciada (cookie de Supabase Auth).
- Ese veterinario debe tener al menos una franja de disponibilidad configurada (`POST /api/veterinarios/disponibilidad`) para que existan turnos `disponible` generados por el Motor de Turnera.
- Al menos uno de esos turnos reservado por un dueño de mascota (`POST /api/turnos/[id]/reservar` o el flujo de UI equivalente).

## Pasos
1. Con la sesión del veterinario activa, hacer `GET /api/veterinarios/turnos`.
2. Repetir la request agregando `?pagina=1&porPagina=10` para verificar paginación.
3. Hacer la misma request sin sesión (sin cookie) para verificar el rechazo.
4. (Opcional) Con la sesión de OTRO veterinario, hacer `GET /api/veterinarios/turnos` y confirmar que no ve los turnos del primero.

## Resultado esperado
- Mensaje visible: no aplica (respuesta JSON, no hay UI en este ticket).
- Dónde verificar: cuerpo de la respuesta HTTP de `GET /api/veterinarios/turnos` — debe incluir `items` (cada uno con `id`, `franjaInicio`, `franjaFin`, `reservadoPorEmail`), `total`, `pagina`, `porPagina`; solo turnos con `estado='reservado'` cuyo `proveedor_id` es el del veterinario autenticado.
- Código HTTP esperado: 200 (con sesión válida) / 401 con código `PEA-SIS-001` (sin sesión).
