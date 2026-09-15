# 15. CRUD de productos_veterinario y generación de pedidos (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario con rol `veterinario` autenticado (para el CRUD del catálogo propio).
- Tener un segundo usuario con rol `veterinario` distinto (para probar el 403 de edición ajena) y un usuario con rol `dueño` (para generar pedidos).

## Pasos
1. Con la sesión del veterinario A, `POST /api/veterinarios/productos` con `{ "nombre": "Antipulgas x3", "descripcion": "Pipeta mensual", "precio": 4500, "stock": 3 }` → 201, guardar el `id` devuelto.
2. `GET /api/veterinarios/productos` (sin sesión) → el producto creado aparece en el catálogo público.
3. Con la sesión del veterinario B, `PATCH /api/veterinarios/productos/{id}` sobre el producto del veterinario A → 403 con `codigo: "PEA-SIS-002"`.
4. Con la sesión del veterinario A, `PATCH /api/veterinarios/productos/{id}` con nuevos datos → 200, y `GET /api/veterinarios/productos/mis-productos` refleja el cambio.
5. Con la sesión del dueño, `POST /api/veterinarios/productos/{id}/pedidos` con `{ "cantidad": 2 }` → 201, `estado: "pendiente"`.
6. Repetir el paso 5 pidiendo `{ "cantidad": 5 }` (más del stock restante, que es 1) → 409 con `codigo: "PEA-VETADV-001"`.
7. (Opcional, verificación técnica de concurrencia) Disparar dos requests simultáneas del paso 5 con `cantidad` igual al stock restante exacto, desde dos sesiones de dueño distintas → solo una responde 201, la otra 409 / `PEA-VETADV-001`; el stock final nunca queda negativo.
8. Con la sesión del veterinario A, `DELETE /api/veterinarios/productos/{id}` → 200; el producto deja de aparecer en `GET /api/veterinarios/productos` pero sigue en `GET /api/veterinarios/productos/mis-productos`.

## Resultado esperado
- Mensaje visible: alta exitosa `{ "id": "...", "veterinarioId": "...", "nombre": "...", "precio": 4500, "stock": 3, ... }`. Sin stock: `{ "codigo": "PEA-VETADV-001", "mensaje": "No queda stock suficiente de este producto." }`. Edición ajena: `{ "codigo": "PEA-SIS-002", "mensaje": "No tenés permiso para realizar esta acción." }`.
- Dónde verificar: respuestas HTTP de cada request; tabla `productos_veterinario` (columna `stock` decrementada, `deleted_at` tras la baja); tabla `pedidos_producto` (fila nueva por cada pedido exitoso).
- Código HTTP esperado: 201 (alta de producto o pedido), 200 (edición, baja, listados), 403 (editar/borrar producto ajeno), 404 (producto inexistente), 409 (stock insuficiente).
