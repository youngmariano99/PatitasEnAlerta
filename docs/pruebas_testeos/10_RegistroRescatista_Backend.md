# 10. Registro de rescatista/activista vía Abstract Factory de formularios (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener acceso a un cliente HTTP (Postman/Insomnia/curl) contra `http://localhost:3000`.
- Base de datos con el esquema aplicado (tabla `roles` con el registro `(5, 'rescatista')`, ver `docs/SEED.md`).

## Pasos
1. Enviar `POST /api/auth/registro` con body JSON:
   ```json
   { "email": "rescatista.prueba@ejemplo.test", "password": "contraseñaSegura123", "rol": "rescatista" }
   ```
2. Verificar en la respuesta que `rolId` sea `5` y que no se haya pedido matrícula, colegio emisor ni ningún otro dato de verificación profesional.
3. Iniciar sesión con esas credenciales (Supabase Auth) y usar el token de sesión para:
   - `GET /api/red-colaboracion/directorio` → debe responder 200 (acceso de lectura, rol incluido en `ROLES_CON_ACCESO_AL_DIRECTORIO`).
   - `POST /api/red-colaboracion/solicitudes` con un body válido (`{ "tipo": "insumos", "descripcion": "..." }`) → debe responder 403 (función exclusiva del rol `organizacion`).
4. Repetir el paso 1 con el mismo email → debe responder 409.

## Resultado esperado
- Mensaje visible: ninguno específico de UI (endpoint puro); el cuerpo de la respuesta de éxito es `{ "id": "...", "email": "rescatista.prueba@ejemplo.test", "rolId": 5 }`. El rechazo de `POST /api/red-colaboracion/solicitudes` devuelve `{ "codigo": "PEA-SIS-002", "mensaje": "No tenés permiso para realizar esta acción." }`.
- Dónde verificar: respuesta HTTP de cada request; tabla `usuarios` (columna `rol_id = 5`, sin fila en `perfiles_veterinario` ni `perfiles_municipio`).
- Código HTTP esperado: 201 (alta), 200 (lectura de directorio), 403 (intento de publicar solicitud), 409 (email duplicado).
