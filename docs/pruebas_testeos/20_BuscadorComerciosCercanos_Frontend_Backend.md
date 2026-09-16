# 20. UI de búsqueda y mapa de comercios cercanos (Frontend-Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener al menos 3-4 comercios verificados en la base, con `tipo_comercio` variado (ej. `pet_shop`, `peluqueria`).
- No hace falta ninguna sesión — la página es pública.

## Pasos
1. Ir a `/comercios`. Verificar que se muestren la tabla y el mapa lado a lado, con un marcador por cada comercio verificado.
2. Escribir un texto en el campo "Buscar" (ej. parte del nombre de un comercio) y esperar ~300ms. Verificar que la tabla y el mapa se actualicen juntos, mostrando solo los comercios que matchean.
3. Elegir un tipo en el selector "Tipo" (ej. "Pet shop"). Verificar que la tabla muestre solo comercios de ese tipo, y que el mapa muestre exactamente esa misma cantidad de marcadores (sincronización mapa/listado, AC del ticket).
4. Con varios tipos de comercio visibles a la vez (sin filtro de tipo), verificar visualmente en el mapa que cada tipo usa un ícono/emoji distinto (🐾 pet_shop, 🌾 forrajería, ✂️ peluquería, 💊 farmacia veterinaria, 🏪 otro).
5. `GET /api/comercios/cercanos?q=pet` (directo, sin UI) → 200, solo comercios cuyo `nombre_comercio` o `tipo_comercio` contiene "pet".

## Resultado esperado
- Mensaje visible: sin resultados, "No encontramos comercios con estos filtros.". Con resultados, tabla de comercios (nombre/tipo/dirección) + mapa Leaflet con un marcador por comercio listado.
- Dónde verificar: `/comercios` en el navegador; Network tab del navegador para confirmar que la búsqueda de texto viaja como `?q=...` a `GET /api/comercios/cercanos`.
- Código HTTP esperado: 200 (listado, con o sin `q`), 400 (si se arma manualmente una query con `latitud` sin `longitud`/`radioKm`).
