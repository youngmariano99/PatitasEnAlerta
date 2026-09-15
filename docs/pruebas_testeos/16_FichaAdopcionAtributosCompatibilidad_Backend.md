# 16. Extensión de PublicarFichaAdopcion con columnas de compatibilidad (Backend)

## Prerequisitos
- Correr `npm run dev`.
- Tener un usuario con rol `municipio` u `organizacion`.
- Tener un usuario con rol distinto (ej. `dueño` o `administrador`), para probar el rechazo con 403.

## Pasos
1. Con la sesión del usuario `municipio` (u `organizacion`), `POST /api/municipio/adopciones` con `{ "nombreAnimal": "Luna", "especie": "perro", "fotoUrl": "https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/luna.jpg", "nivelEnergia": "alto", "compatibleNinos": true, "compatibleOtrosAnimales": false, "necesidadesMedicasDetalle": "Requiere medicación diaria para epilepsia." }` → 201, con los 4 campos reflejados tal cual en la respuesta.
2. Repetir el paso 1 sin declarar ninguno de los 4 campos de compatibilidad → 201 igual (no bloquean la publicación), con esos 4 campos en `null` en la respuesta.
3. Con la sesión de un usuario con rol `administrador` (o `dueño`), repetir el paso 1 → 403 con `codigo: "PEA-MUN-009"`.

## Resultado esperado
- Mensaje visible: alta exitosa `{ "id": "...", "municipioId": "...", "nombreAnimal": "Luna", ..., "nivelEnergia": "alto", "compatibleNinos": true, "compatibleOtrosAnimales": false, "necesidadesMedicasDetalle": "Requiere medicación diaria para epilepsia.", "estado": "disponible", ... }`. Rol no autorizado: `{ "codigo": "PEA-MUN-009", "mensaje": "Solo cuentas municipales o de organizaciones pueden publicar fichas de adopción." }`.
- Dónde verificar: respuesta HTTP de `POST /api/municipio/adopciones`; tabla `vitrina_adopcion` (columnas `nivel_energia`, `compatible_ninos`, `compatible_otros_animales`, `necesidades_medicas_detalle`).
- Código HTTP esperado: 201 (alta, con o sin atributos de compatibilidad), 401 (sin sesión), 403 (rol distinto de municipio/organizacion).
