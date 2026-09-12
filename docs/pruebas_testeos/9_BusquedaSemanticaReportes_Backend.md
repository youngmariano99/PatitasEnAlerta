# 9. Búsqueda híbrida de reportes por similitud semántica (Backend)

## Prerequisitos
- Correr `npm run dev` con las migraciones aplicadas y el seed de `docs/SEED.md` cargado.
- Configurar la variable de entorno `OPENAI_API_KEY` (ver `.env.example`) con una clave válida de OpenAI — sin ella, `OpenAIGeneradorEmbeddings` no puede instanciarse y cualquier request devuelve 500.
- Tener al menos un reporte existente con `descripcion_embedding` poblado (columna `VECTOR(1536)`, `docs/SCHEMA.md`). Si el seed no la puebla, generarla manualmente antes de probar, ej.:
  ```sql
  UPDATE reportes SET descripcion_embedding = '[0.01, 0.02, ...]'::vector
  WHERE id = '<id-de-un-reporte-de-prueba>';
  ```
  (1536 valores; puede obtenerse llamando a la misma API de embeddings con la descripción real del reporte).
- Tener una sesión iniciada con un usuario de rol `organizacion`, `veterinario`, `rescatista`, `municipio` o `administrador` (cualquiera de los cinco tiene acceso).
- Un cliente HTTP que reenvíe las cookies de sesión de Supabase Auth.

## Pasos
1. Con la sesión iniciada, hacer `GET /api/red-colaboracion/reportes/similares?consulta=gato%20asustadizo%20con%20otros%20perros`.
2. Repetir agregando un filtro exacto, ej. `&tipo=perdido&especie=gato`.
3. Repetir agregando un filtro de zona completo, ej. `&latitud=-37.9989&longitud=-61.3565&radioKm=10`.
4. Probar un filtro de zona incompleto, ej. `...&latitud=-37.9989` (sin `longitud` ni `radioKm`).
5. Probar sin el parámetro `consulta`, o con menos de 3 caracteres (ej. `?consulta=ga`).
6. Cerrar sesión (o usar un cliente sin cookies) y repetir el Paso 1.
7. Iniciar sesión con un usuario de rol `dueño` o `comerciante` y repetir el Paso 1.

## Resultado esperado
- **Paso 1:** 200, con un array de reportes (`id, tipo, subtipo, descripcion, fotoUrl, latitud, longitud, especie, estado, createdAt, similitud`) ordenado por `similitud` descendente (1 = idéntico). Reportes sin `descripcion_embedding` poblado nunca aparecen. Si ningún reporte supera el umbral mínimo de relevancia interno, la respuesta es un array vacío (no un error).
- **Paso 2:** solo aparecen reportes que además cumplen `tipo`/`especie` exactos.
- **Paso 3:** solo aparecen reportes dentro del radio declarado.
- **Paso 4 y 5:** 400, `codigo: "PEA-SIS-005"`.
  - Mensaje visible (zona incompleta): "Para filtrar por zona, indicá latitud, longitud y radioKm juntos."
  - Mensaje visible (consulta corta/faltante): "Escribí al menos 3 caracteres para buscar por similitud." (o el mensaje de campo requerido de Zod).
- **Paso 6:** 401, `codigo: "PEA-SIS-001"`.
  - Mensaje visible: "Necesitás iniciar sesión para hacer esto."
- **Paso 7:** 403, `codigo: "PEA-SIS-002"`.
  - Mensaje visible: "No tenés permiso para realizar esta acción."
- **Si `OPENAI_API_KEY` falta o el proveedor no responde:** 503, `codigo: "PEA-SIS-004"`, mensaje "El servicio no está disponible en este momento. Probá de nuevo en breve."
- Dónde verificar: la respuesta JSON cruda de `GET /api/red-colaboracion/reportes/similares` (no hay pantalla propia todavía — este ticket es solo de backend).
- Código HTTP esperado: 200 (Pasos 1-3), 400 (Pasos 4-5), 401 (Paso 6), 403 (Paso 7), 503 (proveedor de embeddings caído).
