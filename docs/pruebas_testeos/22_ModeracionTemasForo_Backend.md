# 22. Caso de uso CrearTemaForo con moderación de Administrador (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario cualquiera autenticado (cualquier rol sirve para publicar un tema).
- Tener un usuario con rol `administrador`.

## Pasos
1. Con la sesión del autor, `POST /api/foros-cursos/temas` con `{ "titulo": "<script>alert(1)</script>¿Cada cuánto desparasitar a un gato adulto?", "contenido": "Vive en un departamento." }` → 201, y `titulo`/`contenido` en la respuesta sin la etiqueta `<script>` (sanitizados por DOMPurify).
2. Repetir el paso 1 con `titulo: "   "` → 400 con `codigo: "PEA-FORO-003"`.
3. Con la sesión de un usuario que NO es administrador, `POST /api/foros-cursos/temas/{id}/moderar` sobre el tema del paso 1 → 403 con `codigo: "PEA-SIS-002"`.
4. Con la sesión del Administrador, `POST /api/foros-cursos/temas/{id}/moderar` sobre el mismo tema → 200.
5. Con la sesión del autor original, `PATCH /api/foros-cursos/temas/{id}` con nuevos datos sobre el tema ya moderado → 403 con `codigo: "PEA-FORO-004"`.

## Resultado esperado
- Mensaje visible: alta exitosa `{ "id": "...", "creadoPor": "...", "titulo": "...", "contenido": "...", "createdAt": "..." }` (sin ninguna etiqueta HTML). Falta de contenido: `{ "codigo": "PEA-FORO-003", "mensaje": "Escribí un contenido antes de publicar tu tema o respuesta." }`. Moderación sin rol administrador: `{ "codigo": "PEA-SIS-002", "mensaje": "No tenés permiso para realizar esta acción." }`. Edición de un tema ya moderado: `{ "codigo": "PEA-FORO-004", "mensaje": "Este contenido fue moderado y ya no puede editarse." }`.
- Dónde verificar: respuestas HTTP de cada request; tabla `temas_foro` (columnas `titulo`/`contenido` sin HTML, `deleted_at` con timestamp tras la moderación).
- Código HTTP esperado: 201 (alta), 200 (moderación, edición previa a moderar), 400 (título/contenido vacíos), 401 (sin sesión), 403 (rol distinto de administrador al moderar, autor ajeno o tema ya moderado al editar), 404 (tema inexistente).
