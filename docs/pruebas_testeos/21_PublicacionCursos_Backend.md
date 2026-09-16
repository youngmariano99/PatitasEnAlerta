# 21. Publicación de cursos de tenencia responsable (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario con rol `organizacion` o `municipio`.
- Tener un usuario con rol `dueño`, para probar el rechazo con 403.

## Pasos
1. Con la sesión del usuario `organizacion` (o `municipio`), `POST /api/foros-cursos/cursos` con `{ "titulo": "Tenencia responsable básica", "descripcion": "<script>alert(1)</script>Curso introductorio orientado a tutores de mascotas.", "contenidoUrl": "https://cdn.patitasenalerta.test/cursos/1" }` → 201, y `descripcion` en la respuesta sin la etiqueta `<script>` (sanitizada por DOMPurify).
2. Repetir el paso 1 con `contenidoUrl: "no-es-una-url"` → 400.
3. Con la sesión del usuario `dueño`, repetir el paso 1 → 403 con `codigo: "PEA-SIS-002"`.

## Resultado esperado
- Mensaje visible: alta exitosa `{ "id": "...", "publicadoPor": "...", "titulo": "...", "descripcion": "Curso introductorio orientado a tutores de mascotas.", "contenidoUrl": "...", "createdAt": "..." }` (sin ninguna etiqueta HTML en `descripcion`). URL mal formada: `{ "codigo": "PEA-SIS-005", "mensaje": "La URL del contenido no es válida." }`. Rol no autorizado: `{ "codigo": "PEA-SIS-002", "mensaje": "No tenés permiso para realizar esta acción." }`.
- Dónde verificar: respuestas HTTP de cada request; tabla `cursos` (columna `descripcion` sin HTML).
- Código HTTP esperado: 201 (alta), 400 (`contenidoUrl` mal formada), 401 (sin sesión), 403 (rol distinto de organizacion/municipio).
