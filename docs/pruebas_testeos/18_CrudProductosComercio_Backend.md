# 18. CRUD de productos_comercio restringido al comercio propio (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario con rol `comerciante` con un comercio registrado y **verificado** (`estado_verificacion='verificado'` — actualizarlo manualmente en la base si hace falta, ya que el flujo de verificación del Administrador todavía no está implementado).
- Tener un segundo comercio (de otro usuario comerciante) para probar el 403 por pertenencia ajena.

## Pasos
1. Con la sesión del comerciante A (comercio verificado), `POST /api/comercios/productos` con `{ "nombre": "Balanceado premium 15kg", "descripcion": "<script>alert(1)</script>Alta calidad", "categoria": "alimento", "precio": 15000 }` → 201, y `descripcion` en la respuesta sin la etiqueta `<script>` (sanitizada por DOMPurify).
2. Actualizar manualmente el comercio del paso 1 a `estado_verificacion='pendiente'` en la base y repetir el paso 1 → 403 con `codigo: "PEA-COM-001"`.
3. Con la sesión del comerciante B (dueño de otro comercio), `PATCH /api/comercios/productos/{id}` sobre el producto del comerciante A → 403.
4. Con la sesión del comerciante A, `PATCH /api/comercios/productos/{id}` con nuevos datos → 200.
5. Con la sesión del comerciante A, `DELETE /api/comercios/productos/{id}` → 200.

## Resultado esperado
- Mensaje visible: alta exitosa `{ "id": "...", "comercioId": "...", "nombre": "...", "descripcion": "Alta calidad", "categoria": "...", "precio": 15000, ... }` (sin ninguna etiqueta HTML en `descripcion`). Comercio no verificado: `{ "codigo": "PEA-COM-001", "mensaje": "Tu comercio todavía está en revisión. Podrás publicar productos una vez verificado." }`. Edición/baja ajena: `{ "codigo": "PEA-SIS-002", "mensaje": "No tenés permiso para realizar esta acción." }`.
- Dónde verificar: respuestas HTTP de cada request; tabla `productos_comercio` (columna `descripcion` sin HTML, `deleted_at` tras la baja).
- Código HTTP esperado: 201 (alta), 200 (edición, baja), 401 (sin sesión), 403 (comercio no verificado, rol distinto de comerciante, o pertenencia ajena), 404 (producto o comercio propio inexistente).
