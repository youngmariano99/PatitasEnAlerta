# Procedimiento de testing manual — por rol, con datos de prueba

Requiere haber completado `docs/PROCEDIMIENTO_CONFIGURACION.md` (proyecto Supabase real, migraciones aplicadas, seed cargado, `npm run dev` corriendo en `http://localhost:3000`).

## 0. Advertencia — no hay página de login todavía

`docs/AUDITORIA_SISTEMA.md` (Sección 1) confirma que **ninguna rama del proyecto tiene una página de login construida**. Hasta que exista, hay dos formas de obtener una sesión válida para probar:

- **Opción A (recomendada):** construir primero la página de login (es la prioridad #2 de la Auditoría) y usarla normalmente como cualquier usuario final.
- **Opción B (mientras tanto, solo para probar la API):** iniciar sesión contra Supabase Auth directamente por HTTP y usar el token en cada request:
  ```bash
  curl -X POST "https://<tu-proyecto>.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"email":"dueno.test1@patitasenalerta.test","password":"<la que le pusiste en el Paso 1>"}'
  ```
  La respuesta trae un `access_token` (JWT). Para probar un endpoint protegido:
  ```bash
  curl http://localhost:3000/api/mascotas \
    -H "Cookie: sb-access-token=<access_token>"
  ```
  (el nombre exacto de la cookie depende de la config de `@supabase/ssr` — si no reconoce la cookie manual, usar en su lugar la extensión de navegador "ModHeader" para inyectar el header/cookie de sesión sobre `http://localhost:3000` después de loguearte una vez contra el mismo proyecto Supabase desde cualquier otra app de prueba, o escribir un `page.tsx` mínimo de 10 líneas con `supabase.auth.signInWithPassword` solo para destrabar la Opción A).

**Recomendación:** no sigas con el resto de este documento hasta tener la Opción A funcionando — probar 100% por `curl` no valida nada del frontend, que es la mitad de lo que hay que confirmar.

## 1. Crear cuentas de prueba REALMENTE logueables (una por rol)

El seed de `docs/SEED.md` llena la tabla `usuarios` pero **no crea nada en Supabase Auth** (son dos sistemas separados — ver el caveat al inicio de `SEED.md`). Los emails `dueño1@ejemplo.test`, `vet1@ejemplo.test`, etc. **no tienen contraseña real y no se pueden usar para iniciar sesión**. Sirven solo como "datos de fondo" (para probar listados, paginación, y que no se vea la mascota/reporte de otra persona).

Para cada rol que vayas a probar como usuario real, crear una cuenta nueva así:

1. **Supabase Dashboard → Authentication → Users → Add user.** Completar email y password reales (ej. `Test1234!`). Anotar el email y password — son tus credenciales de prueba para ese rol.
2. Copiar el **UUID** que Supabase le asignó (columna `id` en esa misma tabla de usuarios).
3. **Si el rol permite autoregistro (dueño, veterinario):** en vez de los pasos 1-2, simplemente registrate desde `/auth/registro` con ese email/password una vez que exista la UI — el propio flujo de registro ya crea las dos filas (Auth + `usuarios`) de forma consistente. Es la vía recomendada para estos dos roles.
4. **Si el rol NO permite autoregistro (municipio, administrador) o su selector todavía no está expuesto en `/auth/registro` (rescatista, comerciante, organizacion):** insertar manualmente en `usuarios` con el UUID copiado en el paso 2:
   ```sql
   INSERT INTO usuarios (id, email, password_hash, rol_id, estado_verificacion)
   VALUES ('<uuid-copiado>', '<el mismo email del paso 1>', 'gestionado_por_supabase_auth', <rol_id>, '<estado>');
   ```
   `rol_id`: dueño=1, veterinario=2, municipio=3, administrador=4, rescatista=5, comerciante=6, organizacion=7.
   `estado_verificacion`: `'verificado'` para poder probar el camino feliz sin pasar primero por la cola de aprobación del Admin (salvo que quieras probar justamente ESE flujo — en ese caso usar `'pendiente'`).

Repetir para al menos: 1 dueño, 1 veterinario, 1 municipio, 1 administrador. Post-MVP (Módulos 5-9): 1 rescatista, 1 comerciante, 1 organizacion — solo si vas a probar esos módulos.

---

## 2. Recorrido como visitante anónimo (sin sesión)

| # | Paso | Resultado esperado |
|---|---|---|
| 2.1 | Ir a `http://localhost:3000/reportes` | Lista pública de reportes con mapa/tabla, sin pedir login |
| 2.2 | Ir a `/adopciones` | Vitrina de adopción pública |
| 2.3 | Ir a `/municipio/eventos` | Calendario de operativos, sin login |
| 2.4 | Ir a `/comercios` (si ya está mergeada la línea A de la Auditoría) | Buscador de comercios verificados |
| 2.5 | Ir a `/mascotas` (o cualquier ruta protegida) | Redirige a `/auth/login` (hoy da 404 por el gap conocido — reportarlo si seguís sin la página al momento de probar) |

## 3. Rol: Dueño de Mascota (email de prueba del Paso 1, rol `dueño`)

| # | Paso | Resultado esperado | Código HTTP |
|---|---|---|---|
| 3.1 | Iniciar sesión | Redirige a `/panel` | — |
| 3.2 | Ir a `/mascotas/nueva`, completar nombre/especie/foto (sin identificación/chip) y enviar | Mascota creada, foto subida a Cloudinary | 201 |
| 3.3 | Intentar enviar el mismo formulario sin foto | Rechazo con mensaje "Necesitamos al menos una foto..." | 400 / `PEA-AUTH-010` |
| 3.4 | Ir a `/reportes/nuevo`, reportar la mascota como "perdida" (foto + geolocalización) | Reporte publicado, aparece en `/reportes` | 201 |
| 3.5 | Reportar una "problemática urbana" sin elegir categoría | Rechazo | 400 / `PEA-REP-001` |
| 3.6 | Hacer 6 reportes en menos de 1 hora (si tu cuenta no está verificada) | El 6° se rechaza por rate limit | 429 / `PEA-REP-004` |
| 3.7 | Ir a `/turnos/reservar` y reservar un turno de un evento municipal con cupo | Turno reservado, visible en "Mis turnos" | 201 |
| 3.8 | Desde "Mis turnos", cancelar ese turno | Vuelve a estar disponible para otro vecino | 200 |
| 3.9 | Ir a la ficha de la mascota (`/mascotas/[id]/libreta`) y autorizar a un veterinario de prueba | Autorización creada | 201 |
| 3.10 | Revocar esa autorización | El veterinario ya no puede escribir en la libreta | 200 |
| 3.11 | Intentar acceder a la mascota de OTRO dueño por URL directa (copiar un `id` de `mascotas` del seed que no sea tuyo) | Rechazo — nunca ver datos ajenos | 403 / `PEA-AUTH-008` o 404 |

> Los pasos 3.7, 3.9-3.11 dependen de páginas que la Auditoría marca como faltantes hoy (`/turnos/reservar`, `/mascotas/[id]/libreta`). Si todavía no existen al momento de tu prueba, repetir el mismo caso vía `curl`/Postman contra el endpoint equivalente (`POST /api/turnos/reservar`, `POST /api/mascotas/[id]/autorizaciones`) y dejarlo anotado como "pendiente de UI" en el reporte de bugs, no como "funcionalidad rota".

## 4. Rol: Veterinario/a

| # | Paso | Resultado esperado | Código HTTP |
|---|---|---|---|
| 4.1 | Registrarse desde `/auth/registro` con matrícula + colegio emisor | Cuenta creada con `estado_verificacion='pendiente'` | 201 |
| 4.2 | Iniciar sesión | Ver badge "Verificación pendiente" de forma permanente, no engañosa | — |
| 4.3 | Intentar configurar agenda antes de estar verificado | Rechazo | 403 / `PEA-VET-007` |
| 4.4 | (Como administrador, ver Sección 6) aprobar la verificación de este veterinario | — | — |
| 4.5 | Con la cuenta ya verificada, configurar franjas horarias en `/veterinario/agenda` | Turnos 'disponible' generados automáticamente para las próximas 2 semanas | 201 |
| 4.6 | Ver `/veterinario/turnos` | Lista de turnos reservados por vecinos | 200 |
| 4.7 | Con un dueño que te autorizó (3.9), registrar una entrada en la libreta sanitaria de su mascota desde `/veterinario/pacientes` | Entrada visible en el historial cronológico del dueño | 201 |
| 4.8 | Intentar registrar una entrada en una mascota que NO te autorizó | Rechazo | 403 / `PEA-VET-003` |

## 5. Rol: Municipio (cuenta creada manualmente en el Paso 1)

| # | Paso | Resultado esperado | Código HTTP |
|---|---|---|---|
| 5.1 | Iniciar sesión, ir a `/municipio/eventos/nuevo` | Alta rápida de un operativo (fecha, dirección, cupos) | 201 |
| 5.2 | Ir a `/municipio/turnera` y ver los turnos generados para ese operativo | Cupos disponibles = cupos_totales declarados | 200 |
| 5.3 | Ir a `/municipio/dashboard` | Mapa de calor + métricas sobre datos del seed (220 reportes) | 200 |
| 5.4 | Exportar el dashboard a CSV | Descarga un `.csv` con el resumen del período | 200 |
| 5.5 | Cambiar el estado de un reporte (`Reportado → En revisión`) desde el panel de reportes | Historial de cambios de estado queda registrado | 200 |
| 5.6 | Intentar el cambio de estado inválido (ej. `Reportado → Cerrado` directo) | Rechazo — solo transiciones válidas de la máquina de estados | 409 / `PEA-REP-006` |
| 5.7 | Publicar una ficha en `/municipio/adopciones` completando los 4 campos de compatibilidad (nivel de energía, compatible con niños/otros animales, necesidades médicas) — Módulo 9 | Ficha publicada con esos atributos persistidos | 201 |
| 5.8 | Publicar otra ficha SIN esos 4 campos | Se publica igual (son opcionales) | 201 |
| 5.9 | Dar de baja una ficha de adopción | Pasa a estado `'baja'`, sigue existiendo en la tabla (nunca `DELETE` físico) | 200 |

## 6. Rol: Administrador (cuenta creada manualmente en el Paso 1)

| # | Paso | Resultado esperado | Código HTTP |
|---|---|---|---|
| 6.1 | Ir a `/admin/verificaciones` | Cola de veterinarios/municipios pendientes (del seed hay 10 con estados mixtos) | 200 |
| 6.2 | Aprobar una verificación pendiente | El usuario pasa a `estado_verificacion='verificado'`, ve su badge actualizado sin recargar (Realtime) | 200 |
| 6.3 | Rechazar otra, sin motivo | Rechazo — el motivo es obligatorio | 400 |
| 6.4 | Rechazar con motivo | Queda registrado en el historial | 200 |
| 6.5 | Ir a `/admin/auditoria` | Historial completo de decisiones tomadas en 6.2-6.4 | 200 |

## 7. Post-MVP — probar solo si tu build ya incluye la línea A/B unificadas (ver Auditoría Sección 0)

Estos módulos hoy **no tienen interfaz de cliente** (excepto lo marcado). Probarlos significa golpear la API directamente (Postman/`curl`) usando el token de la Sección 0/Opción B — es exactamente lo esperado hasta que se construyan las páginas.

| Módulo | Rol de prueba | Endpoint | Qué confirmar |
|---|---|---|---|
| 5 — Red de colaboración | organizacion (`ong1@ejemplo.test` del seed, si le creaste sesión real) | `POST /api/red-colaboracion/solicitudes` | Se publica una solicitud de recurso |
| 5 — Red de colaboración | rescatista | `POST /api/red-colaboracion/solicitudes/{id}/colaboraciones` | Se ofrece como colaborador; repetir → 409 `PEA-RED-002` |
| 5 — Métricas propias | rescatista | `GET /api/red-colaboracion/metricas` (esta sí tiene página: `/red-colaboracion/metricas`) | Ve solo sus propias métricas, sin comparación con otros |
| 7 — Comercios | comerciante | `POST /api/comercios` luego `POST /api/comercios/productos` | Alta de comercio (queda `pendiente`) → alta de producto rechazada hasta que un admin lo verifique (`PEA-COM-001`) |
| 7 — Comercios (público) | anónimo | `GET /comercios` (esta sí tiene página) | Solo aparecen comercios `verificado` |
| 8 — Cursos | municipio u organizacion | `POST /api/foros-cursos/cursos` | Publica un curso |
| 8 — Inscripción a curso | dueño | `POST /api/foros-cursos/cursos/{id}/inscripciones` | Se inscribe; repetir → 409 `PEA-FORO-001` |
| 8 — Foro | cualquier autenticado | `POST /api/foros-cursos/temas` con `<script>` en el contenido | Se guarda sanitizado, sin la etiqueta `<script>` |
| 8 — Moderación de foro | administrador | `POST /api/foros-cursos/temas/{id}/moderar` | Tema dado de baja; el autor ya no puede editarlo (`PEA-FORO-004`) |
| 9 — Cuestionario adoptante | dueño | `POST /api/adopcion-compatibilidad/cuestionario` | Guarda avance parcial sin bloquear |
| 9 — Sugerencias de compatibilidad | dueño (con cuestionario COMPLETO) | `POST /api/adopcion-compatibilidad/sugerencias` | Devuelve sugerencias con `metodo:"reglas"`; repetir con cuestionario incompleto → 400 `PEA-ADOP-001` |

## 8. Checklist de accesibilidad (visual, sobre cualquier página ya construida)

- [ ] Ningún texto por debajo de 14px.
- [ ] Todo botón/ícono clickeable mide al menos 44×44px (probar con las herramientas de dispositivo móvil del navegador).
- [ ] Todo mensaje de error tiene texto + ícono, nunca solo un borde rojo.
- [ ] Paleta usa `slate-950`/`slate-50` — nunca negro puro (`#000`) ni blanco puro (`#fff`).
- [ ] Navegación completa por teclado (Tab) en al menos un formulario largo (ej. `/reportes/nuevo`).

## 9. Reporte de resultados

Para cada hallazgo, registrar: página/endpoint, pasos exactos para reproducir, resultado esperado vs. obtenido, y si es un bug de código o un gap de UI ya conocido (comparar contra `docs/AUDITORIA_SISTEMA.md` antes de reportarlo como nuevo).
