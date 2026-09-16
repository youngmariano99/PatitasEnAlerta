# 24. Caso de uso InscribirseCurso con restricción de unicidad (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario cualquiera autenticado (cualquier rol sirve para inscribirse).
- Tener el `id` de un curso publicado existente (`docs/SEED.md` ya siembra 20).

## Pasos
1. Con la sesión del usuario, `POST /api/foros-cursos/cursos/{cursoId}/inscripciones` → 201, con la inscripción reflejada en `inscripciones_curso`.
2. Repetir el mismo `POST` con el mismo `cursoId` y el mismo usuario → 409 con `codigo: "PEA-FORO-001"`.
3. `POST /api/foros-cursos/cursos/{cursoId}/inscripciones` con un `cursoId` inexistente → 404 con `codigo: "PEA-FORO-002"`.
4. `DELETE /api/foros-cursos/cursos/{cursoId}/inscripciones` (mismo curso del paso 1) → 200, y la fila desaparece de `inscripciones_curso`.
5. Repetir el `DELETE` del paso 4 → 404 con `codigo: "PEA-FORO-002"` (ya no hay inscripción que dar de baja).
6. Repetir el `POST` del paso 1 después del `DELETE` → 201 (el índice único no bloquea una nueva alta tras la baja).

## Resultado esperado
- Mensaje visible: alta exitosa `{ "id": "...", "cursoId": "...", "usuarioId": "...", "inscritoEn": "..." }`. Doble inscripción: `{ "codigo": "PEA-FORO-001", "mensaje": "Ya estás inscripto/a en este curso." }`. Curso inexistente o baja sin inscripción previa: `{ "codigo": "PEA-FORO-002", "mensaje": "No encontramos ese curso o esa publicación." }`. Baja exitosa: `{ "cursoId": "..." }`.
- Dónde verificar: respuestas HTTP de cada request; tabla `inscripciones_curso` (fila presente tras el alta, ausente tras la baja).
- Código HTTP esperado: 201 (alta), 200 (baja), 401 (sin sesión), 404 (curso inexistente o nada que dar de baja), 409 (ya inscripto).
