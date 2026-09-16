# 19. Endpoint público de comercios verificados por proximidad (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener al menos un comercio con `estado_verificacion='verificado'` y otro con `estado_verificacion='pendiente'` en la base (docs/SEED.md ya siembra un mix).
- No hace falta ninguna sesión — el endpoint es público.

## Pasos
1. Sin ningún header de sesión, `GET /api/comercios/cercanos` → 200; revisar que ningún elemento de `items` corresponda a un comercio con `estado_verificacion='pendiente'` en la base.
2. `GET /api/comercios/cercanos?latitud=-37.9989&longitud=-61.3565&radioKm=25` → 200, con `items` ordenados de menor a mayor `distanciaKm`.
3. `GET /api/comercios/cercanos?latitud=-37.9989` (sin `longitud`/`radioKm`) → 400 con `codigo: "PEA-SIS-005"`.
4. `GET /api/comercios/cercanos?pagina=2&porPagina=5` → 200, con `items` de longitud ≤ 5 y `total` reflejando el total de comercios verificados.

## Resultado esperado
- Mensaje visible: `{ "items": [{ "id": "...", "nombreComercio": "...", "tipoComercio": "...", "direccion": "...", "latitud": ..., "longitud": ..., "distanciaKm": null | number, "createdAt": "..." }], "total": N, "pagina": 1, "porPagina": 50 }`. Filtro incompleto: `{ "codigo": "PEA-SIS-005", "mensaje": "Para filtrar por proximidad, indicá latitud, longitud y radioKm juntos." }`.
- Dónde verificar: respuesta HTTP del endpoint; comparar `items` contra la tabla `comercios` filtrando por `estado_verificacion`.
- Código HTTP esperado: 200 (listado, con o sin filtro de proximidad), 400 (filtro de proximidad incompleto).
