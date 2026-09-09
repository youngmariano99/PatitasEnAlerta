# 7. Directorio de aliados verificados (Backend)

## Prerequisitos
- Correr `npm run dev` con las migraciones aplicadas (incluida `20260909130000_agrega_ubicacion_a_usuarios`) y el seed de `docs/SEED.md` cargado (aporta veterinarios/organizaciones/rescatistas con `latitud`/`longitud` para poder probar el filtro de zona).
- Tener una sesión iniciada con un usuario de rol `organizacion`, `veterinario`, `rescatista`, `municipio` o `administrador` (cualquiera de los cinco sirve — todos tienen acceso de lectura al directorio).
- Un cliente HTTP que reenvíe las cookies de sesión de Supabase Auth (ej. el propio navegador ya logueado, o un cliente REST configurado con esas cookies).

## Pasos
1. Con la sesión iniciada, hacer `GET /api/red-colaboracion/directorio` sin query params.
2. Repetir con `GET /api/red-colaboracion/directorio?rol=veterinario` para filtrar solo veterinarios verificados.
3. Repetir con `GET /api/red-colaboracion/directorio?latitud=-37.9989&longitud=-61.3565&radioKm=5` para filtrar por zona (radio de 5km alrededor del centro de Coronel Pringles, donde el seed concentra sus datos).
4. Probar un filtro de zona incompleto, ej. `GET /api/red-colaboracion/directorio?latitud=-37.9989` (sin `longitud` ni `radioKm`).
5. Cerrar sesión (o usar un cliente sin cookies) y repetir el Paso 1.
6. Iniciar sesión con un usuario de rol `dueño` o `comerciante` y repetir el Paso 1.

## Resultado esperado
- **Paso 1:** 200, con un cuerpo `{ items, total, pagina, porPagina }` — `items` lista únicamente usuarios de rol `organizacion`/`veterinario`/`rescatista` **verificados** (para `organizacion`/`veterinario`, `estadoVerificacion === 'verificado'`; todo `rescatista` activo aparece igual, sin ese requisito — no tiene flujo de verificación propio). Ningún `dueño`, `comerciante`, `municipio` ni `administrador` aparece en `items`.
- **Paso 2:** `items` contiene exclusivamente `rol: 'veterinario'`.
- **Paso 3:** `items` solo contiene aliados con `latitud`/`longitud` dentro del radio declarado; los que no completaron ubicación (`latitud`/`longitud` `null`) quedan afuera.
- **Paso 4:** 400, `codigo: "PEA-SIS-005"`.
  - Mensaje visible: "Para filtrar por zona, indicá latitud, longitud y radioKm juntos."
- **Paso 5:** 401, `codigo: "PEA-SIS-001"`.
  - Mensaje visible: "Necesitás iniciar sesión para hacer esto."
- **Paso 6:** 403, `codigo: "PEA-SIS-002"`.
  - Mensaje visible: "No tenés permiso para realizar esta acción."
- Dónde verificar: la respuesta JSON cruda de `GET /api/red-colaboracion/directorio` (no hay pantalla propia todavía — este ticket es solo de backend).
- Código HTTP esperado: 200 (Pasos 1-3), 400 (Paso 4), 401 (Paso 5), 403 (Paso 6).
