# 18. EstrategiaMatchAdopcion con Strategy intercambiable (reglas → semántico → LLM) (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario que ya completó su cuestionario de adopción de forma completa (docs/pruebas_testeos/17_CuestionarioAdoptante_Backend.md).
- Tener al menos una ficha `'disponible'` en `vitrina_adopcion` con atributos de compatibilidad completos.

## Pasos
1. Con la sesión de ese usuario, `POST /api/adopcion-compatibilidad/sugerencias` (sin body) → 201, con un array de sugerencias — una por cada ficha `'disponible'`.
2. Verificar en la tabla `sugerencias_compatibilidad` que las filas recién insertadas tienen `metodo = 'reglas'` (implementación inicial, activa por configuración en `contenedor-di.ts`).
3. Cambiar el `estado` de una de las fichas sugeridas a `'adoptado'` directamente en la base y repetir el paso 1 → esa ficha ya no aparece entre las nuevas sugerencias.
4. Con la sesión de un usuario cuyo cuestionario está incompleto (algún campo en `NULL`), repetir el paso 1 → 400 con `codigo: "PEA-ADOP-001"`.
5. Con la sesión de un usuario que nunca completó un cuestionario, repetir el paso 1 → 404 con `codigo: "PEA-ADOP-003"`.

## Resultado esperado
- Mensaje visible: generación exitosa `[{ "id": "...", "vitrinaAdopcionId": "...", "scoreCompatibilidad": 0.5, "metodo": "reglas" }, ...]`. Cuestionario incompleto: `{ "codigo": "PEA-ADOP-001", "mensaje": "Completá el cuestionario para recibir sugerencias de compatibilidad." }`. Sin cuestionario: `{ "codigo": "PEA-ADOP-003", "mensaje": "No encontramos tu cuestionario de adopción." }`.
- Dónde verificar: respuesta HTTP de `POST /api/adopcion-compatibilidad/sugerencias`; tabla `sugerencias_compatibilidad` (columna `metodo`).
- Código HTTP esperado: 201 (generación, incluso con 0 sugerencias si no hay fichas disponibles), 400 (cuestionario incompleto), 401 (sin sesión), 404 (sin cuestionario propio).
