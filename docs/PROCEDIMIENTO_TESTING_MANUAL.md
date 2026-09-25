# Procedimiento de testing manual — por rol, con datos de prueba

Requiere haber completado `docs/PROCEDIMIENTO_CONFIGURACION.md` (proyecto Supabase real, migraciones aplicadas, `npm run dev` corriendo en `http://localhost:3000`) y tener datos de fondo cargados (ver `docs/SEED.md` y `scripts/seed/`).

> Reescrito de punta a punta: la versión anterior de este documento asumía que no existían páginas de login, `/turnos/reservar`, `/mascotas/[id]/libreta` ni `/comercios` — las cuatro ya están construidas y en uso. Esta versión refleja el estado real del código (verificado ruta por ruta contra `app/`, `middleware.ts` y `docs/ERRORS.md`) y cubre los 7 roles + visitante anónimo completos, incluyendo los módulos Post-MVP (5-9) que ya tienen UI.

## 0. Cómo obtener una cuenta de prueba por rol

No todos los roles se pueden crear de la misma forma. Antes de tocar cada sección, fijate en qué columna cae el rol que necesitás:

| Rol             | Vía de alta                                                                                                                                                                                       | Notas                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `dueño`         | Autoregistro en `/auth/registro`                                                                                                                                                                  | Queda activo de inmediato (`estado_verificacion='no_requerido'`).                                                                              |
| `veterinario`   | Autoregistro en `/auth/registro` (pide matrícula + colegio emisor)                                                                                                                                | Queda `pendiente` hasta que un `administrador` lo apruebe en `/admin/verificaciones` (Sección 6).                                              |
| `rescatista`    | **Solo API** — `POST /api/auth/registro` con `{"rol":"rescatista", ...}`                                                                                                                          | El selector de `/auth/registro` no expone esta opción en pantalla aunque el backend la acepta. Probarlo con `curl`/Postman, no hay UI de alta. |
| `municipio`     | **Solo seed/SQL** — no hay autoregistro ni endpoint de alta                                                                                                                                       | Insertar manualmente en `usuarios` (ver Paso 0.1) o usar una fila ya sembrada por `scripts/seed/seed-municipio.sql`.                           |
| `administrador` | **Solo seed/SQL**                                                                                                                                                                                 | Ídem — insertar manualmente, no hay ninguna vía de autoservicio (correcto: es un rol de máxima confianza).                                     |
| `organizacion`  | **Solo seed/SQL** — `docs/ROLES.md` dice "autoregistro + verificación", pero el código no lo implementa (`RolSchema` de `POST /api/auth/registro` solo acepta `dueño`/`veterinario`/`rescatista`) | Discrepancia documentada, no es un bug a reportar — solo una limitación real a tener en cuenta al armar la cuenta de prueba.                   |
| `comerciante`   | **Solo seed/SQL** para la cuenta; una vez logueado, el comercio en sí se registra desde `/comercios/panel`                                                                                        | Mismo caveat que `organizacion` sobre `docs/ROLES.md`.                                                                                         |

### 0.1 Crear una cuenta real y logueable (roles sin autoregistro)

1. **Supabase Dashboard → Authentication → Users → Add user.** Completar email y password reales (ej. `Test1234!`).
2. Copiar el **UUID** que Supabase le asignó.
3. Insertar la fila de aplicación con ese mismo UUID:
   ```sql
   INSERT INTO usuarios (id, email, password_hash, rol_id, estado_verificacion)
   VALUES ('<uuid-copiado>', '<mismo email>', 'gestionado_por_supabase_auth', <rol_id>, '<estado>');
   ```
   `rol_id`: dueño=1, veterinario=2, municipio=3, administrador=4, rescatista=5, comerciante=6, organizacion=7.
   `estado_verificacion`: `'verificado'` para probar el camino feliz directo, `'pendiente'` si justamente querés probar la cola de aprobación del Admin.

Repetir para **los 4 roles sin autoregistro** (municipio, administrador, organizacion, comerciante) — sin esto, esas 4 secciones del documento no se pueden probar desde la UI.

### 0.1bis Estado actual de las cuentas de este proyecto

Ya creadas en Supabase Auth (falta el `INSERT` en `usuarios` para las 3 nuevas — municipio/administrador ("Zoonosis y administración") ya estaban completas de antes):

```sql
INSERT INTO usuarios (id, email, password_hash, rol_id, estado_verificacion) VALUES
  ('63074aba-0c7c-4113-8dfe-040afb328464', 'ciudadano@gmail.com',   'gestionado_por_supabase_auth', 1, 'no_requerido'),
  ('226641f9-21db-4850-a691-2df377159a9f', 'recatista@gmail.com',   'gestionado_por_supabase_auth', 5, 'verificado'),
  ('3e123673-757f-48ef-baec-4b83750404fb', 'veterinario@gmail.com', 'gestionado_por_supabase_auth', 2, 'pendiente')
ON CONFLICT (id) DO NOTHING;
```

El veterinario queda `pendiente` a propósito, para poder probar 3.1-3.4 (aprobarlo desde `/admin/verificaciones` con la cuenta de administrador que ya tenés) — si preferís arrancar directo con acceso completo, cambiá ese último valor a `'verificado'`.

**Todavía faltan** (sin estas dos no se pueden probar las Secciones 7 y 8): crear un usuario `organizacion` y uno `comerciante` en Supabase Auth → Add user, y pasarme sus UUID para darte el `INSERT` exacto — o correrlo vos mismo con el mismo patrón de arriba (`rol_id` 7 y 6 respectivamente).

### 0.2 Cuentas mínimas recomendadas antes de empezar

| Cuenta                                                 | Rol           | Estado                                                    |
| ------------------------------------------------------ | ------------- | --------------------------------------------------------- |
| dueño de prueba #1 y #2 (para probar IDOR entre ellos) | dueño         | activo                                                    |
| veterinario de prueba                                  | veterinario   | `pendiente` (para probar 4.1-4.4, luego queda verificado) |
| municipio de prueba                                    | municipio     | `verificado`                                              |
| administrador de prueba                                | administrador | `verificado`                                              |
| rescatista de prueba                                   | rescatista    | `verificado`                                              |
| organizacion de prueba                                 | organizacion  | `verificado`                                              |
| comerciante de prueba                                  | comerciante   | `verificado`                                              |

---

## 1. Recorrido como visitante anónimo (sin sesión)

| #    | Página                                                                                                      | Qué probar                                                              | Resultado esperado                                                                                                                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1  | `/`                                                                                                         | Cargar la home                                                          | Banner, estadísticas en vivo, mapa + listado de reportes recientes, próximos operativos, accesos rápidos — sin pedir login                                                                                                     |
| 1.2  | `/reportes`                                                                                                 | Filtros por tipo/estado, "cerca de mí", alternar mapa/tabla, paginación | Lista pública, sin login                                                                                                                                                                                                       |
| 1.3  | `/adopciones`                                                                                               | Ver vitrina                                                             | Solo fichas `estado='disponible'`, sin login                                                                                                                                                                                   |
| 1.4  | `/municipio/eventos`                                                                                        | Ver calendario                                                          | Público aunque esté bajo el prefijo protegido `/municipio` (excepción exacta en middleware)                                                                                                                                    |
| 1.5  | `/comercios`                                                                                                | Buscador de comercios cercanos                                          | Solo aparecen comercios `estado_verificacion='verificado'`                                                                                                                                                                     |
| 1.6  | `/mascotas`, `/panel`, `/turnos/reservar`, `/admin/verificaciones`                                          | Ir directo por URL, sin login                                           | Redirige a `/auth/login?redirectTo=...`                                                                                                                                                                                        |
| 1.7  | `/comercios/panel`, `/foro`, `/cursos`, `/tienda-veterinaria`, `/mis-pedidos`, `/adopciones/compatibilidad` | Ir directo por URL, sin login                                           | **No están en la lista de prefijos protegidos del middleware** — confirmar que igual fallan con gracia (401 en el fetch interno → redirect/estado vacío desde el cliente), nunca mostrando datos ajenos ni rompiendo la página |
| 1.8  | `/auth/registro`                                                                                            | Registrarse como dueño y como veterinario (matrícula + colegio emisor)  | Cuenta creada; veterinario queda `pendiente`                                                                                                                                                                                   |
| 1.9  | `/auth/registro`                                                                                            | Repetir el mismo email                                                  | Rechazo con botones a "Iniciar sesión"/"Recuperar contraseña" — `PEA-AUTH-001` (409)                                                                                                                                           |
| 1.10 | `/auth/registro`                                                                                            | Veterinario con una matrícula+colegio ya usados                         | `PEA-AUTH-006` (409)                                                                                                                                                                                                           |
| 1.11 | `/auth/recuperar-password`                                                                                  | Pedir recuperación con un email que no existe                           | Mismo mensaje de éxito que con uno que sí existe (anti-enumeración)                                                                                                                                                            |
| 1.12 | `/auth/login`                                                                                               | Credenciales incorrectas                                                | `PEA-AUTH-002` (401), sin indicar cuál campo falló                                                                                                                                                                             |
| 1.13 | `/auth/login`                                                                                               | 10 intentos fallidos seguidos desde la misma cuenta/IP en pocos minutos | Debería bloquear en algún punto (limitador nativo de Supabase Auth, no confirmado/documentado — si nunca bloquea, es un hallazgo real a reportar)                                                                              |

---

## 2. Rol: Dueño de mascota

| #    | Paso                                                                                                                   | Resultado esperado                                                                                                     | Código                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 2.1  | Iniciar sesión                                                                                                         | Redirige a `/panel` con "Lo más urgente" + accesos por rol                                                             | —                                       |
| 2.2  | `/mascotas` con 0 mascotas propias                                                                                     | Estado vacío claro, no una tabla rota                                                                                  | —                                       |
| 2.3  | `/mascotas/nueva`: nombre + especie + foto                                                                             | Mascota creada, foto subida a Cloudinary                                                                               | 201                                     |
| 2.4  | Enviar sin foto                                                                                                        | Rechazo, resalta el campo de imagen sin bloquear el resto                                                              | 400 / `PEA-AUTH-010`                    |
| 2.5  | `/mascotas/[id]` propia: editar, luego dar de baja (soft delete)                                                       | Cambios persisten; tras la baja, sigue existiendo en la tabla                                                          | 200                                     |
| 2.6  | `/mascotas/[id]` de OTRO dueño (copiar un id ajeno)                                                                    | Nunca ver datos ajenos                                                                                                 | 403/404 (`PEA-AUTH-008`/`PEA-AUTH-009`) |
| 2.7  | `/mascotas/[id]/libreta`: autorizar a un veterinario de prueba por su UUID                                             | Autorización creada                                                                                                    | 201                                     |
| 2.8  | Repetir la misma autorización                                                                                          | Rechazo — ya existe una autorización activa                                                                            | 409 / `PEA-VET-009`                     |
| 2.9  | Autorizar con un UUID que no es de un veterinario                                                                      | Rechazo                                                                                                                | 404 / `PEA-VET-011`                     |
| 2.10 | Revocar la autorización del paso 2.7                                                                                   | El veterinario ya no puede escribir en la libreta                                                                      | 200                                     |
| 2.11 | `/reportes/nuevo?tipo=perdido`: completar el wizard de 3 pasos (foto, especie + qué pasó + características, ubicación) | Reporte publicado, pantalla de "resultados cercanos" del tipo opuesto antes de ir al listado                           | 201                                     |
| 2.12 | Repetir para `tipo=encontrado`                                                                                         | Mismo flujo                                                                                                            | 201                                     |
| 2.13 | `/reportes/nuevo?tipo=problematica` sin elegir subtipo                                                                 | No deja avanzar del paso 2                                                                                             | 400 / `PEA-REP-001`                     |
| 2.14 | Publicar 6 reportes en menos de 1 hora                                                                                 | El 6° se rechaza por rate limit                                                                                        | 429 / `PEA-REP-004`                     |
| 2.15 | `/reportes/[id]` de un reporte propio                                                                                  | Timeline de cambios de estado                                                                                          | 200                                     |
| 2.16 | `/reportes/[id]` de un reporte ajeno (endpoint de historial, no el listado público)                                    | Rechazo — el historial es privado aunque el listado sea público                                                        | 403                                     |
| 2.17 | `/turnos/reservar`: elegir un evento con cupo y reservar un turno disponible                                           | Turno reservado, visible en "Mis turnos"                                                                               | 201                                     |
| 2.18 | Dos pestañas/sesiones reservando el mismo turno al mismo tiempo                                                        | La segunda se rechaza y la lista se refresca sola                                                                      | 409 / `PEA-MUN-001`                     |
| 2.19 | `/turnos/mis-turnos`: cancelar un turno reservado                                                                      | Vuelve a estar disponible para otro vecino; la lista de otra sesión abierta en simultáneo se actualiza sola (Realtime) | 200                                     |
| 2.20 | `/adopciones/compatibilidad`: completar el cuestionario parcialmente y guardar                                         | Guarda avance sin bloquear                                                                                             | 200                                     |
| 2.21 | Completarlo del todo y pedir sugerencias                                                                               | Devuelve sugerencias puntuadas                                                                                         | 200                                     |
| 2.22 | Pedir sugerencias con el cuestionario incompleto                                                                       | Rechazo                                                                                                                | 400 / `PEA-ADOP-001`                    |
| 2.23 | `/tienda-veterinaria`: comprar un producto con stock                                                                   | Pedido creado                                                                                                          | 201                                     |
| 2.24 | `/mis-pedidos`                                                                                                         | Ve el pedido del paso anterior con su estado                                                                           | 200                                     |
| 2.25 | `/cursos`: inscribirse a un curso, luego intentar inscribirse de nuevo                                                 | Segunda vez rechazada                                                                                                  | 409 / `PEA-FORO-001`                    |
| 2.26 | `/foro`: publicar un tema con `<script>alert(1)</script>` en el contenido                                              | Se guarda sanitizado (sin la etiqueta), nunca ejecuta el script                                                        | 201                                     |
| 2.27 | `/foro/[id]`: responder un tema                                                                                        | Respuesta visible en el hilo                                                                                           | 201                                     |

## 3. Rol: Veterinario/a

| #    | Paso                                                                                               | Resultado esperado                                                        | Código                 |
| ---- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------- |
| 3.1  | Iniciar sesión con la cuenta `pendiente`                                                           | `/panel` muestra badge "Verificación pendiente" de forma permanente       | —                      |
| 3.2  | Intentar configurar agenda (`/veterinario/agenda`) antes de estar verificado                       | Rechazo                                                                   | 403 / `PEA-VET-007`    |
| 3.3  | (En Sección 5) un administrador aprueba esta cuenta                                                | —                                                                         | —                      |
| 3.4  | Ya verificado, `/veterinario/agenda`: configurar franja (día/hora inicio-fin)                      | Turnos `disponible` generados automáticamente para las próximas 2 semanas | 201                    |
| 3.5  | Configurar una franja con hora de fin anterior a la de inicio                                      | Rechazo                                                                   | 400 / `PEA-VET-001`    |
| 3.6  | `/veterinario/turnos`: ver reservas de vecinos, marcar asistió/no-asistió de un turno YA concluido | Se marca correctamente; también muestra la tasa de no-show                | 200                    |
| 3.7  | Intentar marcar asistencia de un turno que todavía no concluyó                                     | Rechazo — hay que esperar a que termine la franja                         | 409 / `PEA-VETADV-005` |
| 3.8  | Con un dueño que te autorizó (2.7): `/veterinario/pacientes`, registrar entrada en la libreta      | Entrada visible en el historial cronológico del dueño                     | 201                    |
| 3.9  | Intentar registrar en una mascota que NO te autorizó                                               | Rechazo                                                                   | 403 / `PEA-VET-003`    |
| 3.10 | El dueño revoca tu autorización (2.10), intentar registrar de nuevo                                | Rechazo — accesos revocado                                                | 403 / `PEA-VET-004`    |
| 3.11 | `/veterinario/productos`: publicar producto, luego darlo de baja                                   | Publicado y luego soft-deleted (sigue en la tabla)                        | 201/200                |
| 3.12 | `/veterinario/pedidos`: confirmar un pedido recibido mientras está `pendiente`                     | Pasa a confirmado                                                         | 200                    |
| 3.13 | Intentar confirmar/cancelar un pedido que ya no está `pendiente`                                   | Rechazo                                                                   | 409 / `PEA-VETADV-004` |
| 3.14 | `/veterinario/historiales-compartidos`: compartir el historial de un paciente con otro veterinario | Compartido; el otro veterinario puede verlo                               | 201                    |
| 3.15 | Intentar compartir con vos mismo                                                                   | Rechazo                                                                   | 400 / `PEA-VETADV-003` |
| 3.16 | Revocar el historial compartido en 3.14                                                            | El otro veterinario pierde acceso                                         | 200                    |
| 3.17 | Si `FEATURE_HISTORIALES_COMPARTIDOS` está apagado en tu entorno                                    | La página muestra un estado "no disponible" en vez de romper              | —                      |

## 4. Rol: Municipio

| #    | Paso                                                                                                                                        | Resultado esperado                                           | Código              |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------- |
| 4.1  | `/municipio/eventos/nuevo`: alta rápida con fecha futura, dirección y pin en el mapa                                                        | Operativo creado                                             | 201                 |
| 4.2  | Repetir con fecha pasada                                                                                                                    | Rechazo                                                      | 400 / `PEA-MUN-004` |
| 4.3  | Repetir sin marcar el pin en el mapa                                                                                                        | Rechazo — la ubicación es obligatoria                        | 400                 |
| 4.4  | `/municipio/turnera`: elegir el evento del 4.1, ver turnos por estado                                                                       | Cupos disponibles = cupos totales declarados                 | 200                 |
| 4.5  | `/municipio/dashboard`: filtrar/cambiar estado de un reporte (`Reportado → En revisión`)                                                    | Historial de cambios queda registrado                        | 200                 |
| 4.6  | Intentar un salto de estado inválido (`Reportado → Cerrado` directo)                                                                        | Rechazo — solo transiciones válidas de la máquina de estados | 409 / `PEA-REP-006` |
| 4.7  | Exportar el dashboard a CSV                                                                                                                 | Descarga un `.csv` con el resumen del período                | 200                 |
| 4.8  | Exportar con un rango de fechas inválido                                                                                                    | Rechazo                                                      | 400 / `PEA-MUN-007` |
| 4.9  | `/municipio/adopciones`: publicar ficha completando los 4 atributos de compatibilidad (energía, niños, otros animales, necesidades médicas) | Ficha publicada con esos atributos persistidos               | 201                 |
| 4.10 | Publicar otra ficha sin esos 4 campos                                                                                                       | Se publica igual — son opcionales                            | 201                 |
| 4.11 | Dar de baja una ficha                                                                                                                       | Pasa a `'baja'`, sigue existiendo (nunca `DELETE` físico)    | 200                 |
| 4.12 | Adoptar (desde `/adopciones/compatibilidad`, rol dueño) un animal ya no disponible                                                          | Rechazo                                                      | 409 / `PEA-MUN-006` |

## 5. Rol: Administrador

| #   | Paso                                                                    | Resultado esperado                                                                           | Código               |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------- |
| 5.1 | `/admin/verificaciones`: ver cola de veterinarios/municipios pendientes | Lista con el veterinario del 3.1                                                             | 200                  |
| 5.2 | Aprobar esa verificación                                                | Pasa a `verificado`, badge se actualiza en la sesión del veterinario sin recargar (Realtime) | 200                  |
| 5.3 | Rechazar otra verificación sin motivo                                   | Rechazo — el motivo es obligatorio                                                           | 400                  |
| 5.4 | Rechazar con motivo                                                     | Queda registrado                                                                             | 200                  |
| 5.5 | Intentar resolver una verificación ya resuelta (desde otra pestaña)     | Rechazo — control optimista                                                                  | 409 / `PEA-AUTH-013` |
| 5.6 | `/admin/auditoria`                                                      | Historial completo de las decisiones de 5.2-5.4, solo lectura                                | 200                  |
| 5.7 | `/foro/[id]`: moderar (dar de baja) un tema ajeno                       | Tema oculto/moderado; el autor ya no puede editarlo                                          | 200 / `PEA-FORO-004` |

## 6. Rol: Rescatista

| #   | Paso                                                                                      | Resultado esperado                                   | Código              |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------- |
| 6.1 | `/red-colaboracion/solicitudes`: "Ofrecerme" en una solicitud abierta de una organizacion | Colaboración creada                                  | 201                 |
| 6.2 | Ofrecerse dos veces en la misma solicitud                                                 | Rechazo                                              | 409 / `PEA-RED-002` |
| 6.3 | `/red-colaboracion/directorio`: filtrar aliados por rol                                   | Lista filtrada                                       | 200                 |
| 6.4 | `/red-colaboracion/colaboraciones/[id]` propia: transicionar estado (aceptada/completada) | Transición válida aplicada                           | 200                 |
| 6.5 | Ídem con un id de colaboración ajena                                                      | Nunca ver/modificar la de otro                       | 403/404             |
| 6.6 | `/red-colaboracion/metricas`                                                              | Solo tus propias métricas, sin comparación con otros | 200                 |

## 7. Rol: Organización

| #   | Paso                                                                                        | Resultado esperado                                  | Código              |
| --- | ------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------- |
| 7.1 | `/red-colaboracion/solicitudes`: publicar una solicitud (tipo + descripción)                | Solicitud publicada                                 | 201                 |
| 7.2 | Aceptar/rechazar una colaboración recibida en una solicitud propia                          | Transición aplicada                                 | 200                 |
| 7.3 | Intentar aceptar/rechazar una colaboración de una solicitud QUE NO PUBLICASTE               | Rechazo — solo la organización dueña puede resolver | 403 / `PEA-RED-004` |
| 7.4 | `/red-colaboracion/buscar`: buscar reportes similares por texto libre (mínimo 3 caracteres) | Resultados por similitud semántica (pgvector)       | 200                 |
| 7.5 | `/cursos`: publicar un curso (el form de publicar SÍ aparece para este rol)                 | Curso publicado                                     | 201                 |

## 8. Rol: Comerciante

| #   | Paso                                                                                                                                                                                                                                                 | Resultado esperado                                                                                                                                                                  | Código              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 8.1 | `/comercios/panel` sin comercio propio todavía: registrar (nombre, tipo, dirección, pin en mapa)                                                                                                                                                     | Comercio creado en estado `pendiente`                                                                                                                                               | 201                 |
| 8.2 | Intentar publicar un producto mientras el comercio está `pendiente`                                                                                                                                                                                  | Rechazo                                                                                                                                                                             | 403 / `PEA-COM-001` |
| 8.3 | Verificar el comercio directamente por SQL (`UPDATE comercios SET estado_verificacion='verificado' WHERE id=...`) — **no hay UI/endpoint de verificación de comercios**, a diferencia de veterinario/municipio que pasan por `/admin/verificaciones` | Anotado como limitación conocida (ver Sección 10), no como bug nuevo                                                                                                                |
| 8.4 | Ya `verificado`, publicar un producto                                                                                                                                                                                                                | Publicado, visible en `/tienda-veterinaria`... revisar: hoy esa vidriera solo muestra productos de veterinarios, confirmar si productos de comerciantes aparecen ahí o en otro lado | 201                 |
| 8.5 | Dar de baja un producto propio                                                                                                                                                                                                                       | Soft delete                                                                                                                                                                         | 200                 |

---

## 9. Pruebas cruzadas de rol y límites de autorización

| #   | Paso                                                                                                      | Resultado esperado                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1 | Como `dueño`, ir a `/municipio/*`, `/veterinario/*`, `/admin/*`                                           | Redirige a `/`                                                                                                                                           |
| 9.2 | Como `veterinario`, ir a `/municipio/*` o `/admin/*`                                                      | Redirige a `/`                                                                                                                                           |
| 9.3 | Como `municipio`, ir a `/admin/*`                                                                         | Redirige a `/`                                                                                                                                           |
| 9.4 | Cualquier rol autenticado reservando/cancelando en `/turnos/*` (no está limitado a `dueño` en middleware) | Confirmar que no rompe nada aunque el caso de uso típico sea un dueño                                                                                    |
| 9.5 | `POST /api/turnos/cancelar` y `POST /api/turnos/reprogramar` directamente por API                         | **No tienen botón en ninguna página** (`/turnos/mis-turnos` solo lista) — probar solo vía API y anotarlo como gap de UI conocido, no como bug de backend |
| 9.6 | Sesión expirada (esperar >1h o forzar expiración del JWT) e intentar una acción protegida                 | `PEA-AUTH-005` (401), redirige a login conservando la acción pendiente si es posible                                                                     |
| 9.7 | Copiar el link de "olvidé mi contraseña" y usarlo dos veces                                               | La segunda vez: `PEA-AUTH-004` (link vencido/ya usado)                                                                                                   |

---

## 10. Checklist de accesibilidad (visual, sobre cualquier página)

- [ ] Ningún texto por debajo de 14px.
- [ ] Todo botón/ícono clickeable mide al menos 44×44px (probar con las herramientas de dispositivo móvil del navegador).
- [ ] Todo mensaje de error tiene texto + ícono, nunca solo un borde rojo.
- [ ] Paleta usa tonos oscuros/claros (`slate-950`/`slate-50`) — nunca negro puro (`#000`) ni blanco puro (`#fff`).
- [ ] Navegación completa por teclado (Tab) en al menos un formulario largo (ej. `/reportes/nuevo`, wizard de 3 pasos).
- [ ] Contraste de color suficiente en los badges de estado (verificación, turnos, reportes).

---

## 11. Limitaciones conocidas — no reportar como bug nuevo

- `organizacion` y `comerciante` no tienen autoregistro en la UI ni en `POST /api/auth/registro`, aunque `docs/ROLES.md` lo describe — se crean solo por seed/SQL (Sección 0).
- `rescatista` tiene autoregistro solo por API — el selector de `/auth/registro` no lo expone en pantalla.
- La verificación de `comercios` no tiene UI ni endpoint dedicado (a diferencia de `veterinario`/`municipio` en `/admin/verificaciones`) — se hace por SQL directo.
- `POST /api/turnos/cancelar` y `/api/turnos/reprogramar` existen y están validados, pero ninguna página los invoca todavía.
- `inscripciones_curso` usa `DELETE` físico (no soft delete) — es la única excepción documentada a la política de bajas lógicas, no la reportes como inconsistencia.
- El rate limiting del login depende del limitador nativo de Supabase Auth, no de `@upstash/ratelimit` — su comportamiento exacto no está documentado en este repo.

---

## 12. Reporte de resultados

Para cada hallazgo, registrar: página/endpoint, pasos exactos para reproducir, resultado esperado vs. obtenido, y si es un bug de código o una limitación ya conocida (comparar contra la Sección 11 y contra `docs/AUDITORIA_SISTEMA.md` antes de reportarlo como nuevo).
