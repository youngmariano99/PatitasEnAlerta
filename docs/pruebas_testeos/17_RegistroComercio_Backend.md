# 17. Alta de comercio sujeta a verificación (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario con rol `comerciante` autenticado.

## Pasos
1. Con la sesión del comerciante, `POST /api/comercios` con `{ "nombreComercio": "Pet Shop Pringles", "tipoComercio": "pet_shop", "direccion": "Av. San Martín 500", "latitud": -37.9989, "longitud": -61.3565 }` → 201, `estadoVerificacion: "pendiente"`.
2. Repetir el paso 1 con `"tipoComercio": "veterinaria_grande"` (fuera del catálogo) → 400 con `codigo: "PEA-COM-002"`.
3. Con la sesión de un usuario con otro rol (ej. `dueño`), repetir el paso 1 → 403 con `codigo: "PEA-SIS-002"`.
4. Sin sesión, repetir el paso 1 → 401 con `codigo: "PEA-SIS-001"`.

## Resultado esperado
- Mensaje visible: alta exitosa `{ "id": "...", "usuarioId": "...", "nombreComercio": "...", "tipoComercio": "pet_shop", "estadoVerificacion": "pendiente", ... }`. Tipo inválido: `{ "codigo": "PEA-COM-002", "mensaje": "Elegí un tipo de comercio válido de la lista." }`. Rol insuficiente: `{ "codigo": "PEA-SIS-002", "mensaje": "No tenés permiso para realizar esta acción." }`.
- Dónde verificar: respuestas HTTP de cada request; tabla `comercios` (columna `estado_verificacion` siempre nace en `'pendiente'`, sin excepción, hasta que el Administrador la revise en un ticket futuro).
- Código HTTP esperado: 201 (alta), 400 (tipo_comercio inválido u otro campo faltante), 401 (sin sesión), 403 (rol distinto de comerciante).
