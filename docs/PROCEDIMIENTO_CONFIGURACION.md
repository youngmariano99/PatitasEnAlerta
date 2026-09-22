# Procedimiento de configuración — credenciales, servicios y migración a BD real

Este documento es el checklist paso a paso para que quien complete la configuración (no automatizable por el asistente: requiere acceso a paneles externos y decisiones de cuentas reales) deje el sistema conectado de punta a punta. Seguir el orden — cada paso depende del anterior.

**Antes de empezar:** resolver el Hallazgo 0 de `docs/AUDITORIA_SISTEMA.md` (unificar las ramas dispersas). Todo lo que sigue asume que ya se está trabajando sobre un `main` que contiene el sistema completo.

---

## Paso 0 — Repositorio y protección de rama

1. Verificar que `main` tenga activada la regla de protección (GitHub → Settings → Branches):
   - Require pull request before merging (mínimo 1 aprobación).
   - Require status checks: `lint-and-typecheck`, `test`, `build`.
   - Require branches up to date before merging.
   - Sin force-push ni borrado de `main`.
2. Completar `.github/CODEOWNERS` — hoy tiene placeholders (`@tech-lead-a-definir`, `@product-owner-a-definir`). Reemplazar por usuarios reales de GitHub.

## Paso 1 — Crear el proyecto en Supabase

1. Crear proyecto en [supabase.com](https://supabase.com) (región más cercana a Argentina disponible).
2. **SQL Editor** → ejecutar:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. **Authentication → Settings**:
   - JWT expiry: `3600` (1 hora).
   - Confirmar email: activado (dueños/veterinarios se autoregistran).
   - Dejar el autoregistro público habilitado (el MVP lo necesita para dueño/veterinario); el rol `municipio` no tiene autoregistro — se crea manualmente, ver Paso 5.
4. **Project Settings → API** → copiar `Project URL`, `anon public key`, `service_role key` — van al `.env.local` en el Paso 3.
5. **Project Settings → Database → Connection string** → copiar tanto la connection string "pooled" (`DATABASE_URL`) como la directa (`DIRECT_URL`, la usa Prisma para migraciones).

## Paso 2 — Cuentas de servicios externos

| Servicio       | Qué crear                                                                                                         | Dónde                                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Cloudinary** | Cuenta + un **upload preset unsigned** (ej. `patitas_en_alerta_dev`), restringido a la carpeta del proyecto       | Dashboard de Cloudinary → Settings → Upload → Add upload preset (Signing mode: **Unsigned**)                              |
| **Upstash**    | Una base Redis (plan gratis alcanza para el MVP)                                                                  | [upstash.com](https://upstash.com) → Create Database → copiar `UPSTASH_REDIS_REST_URL`/`_TOKEN` desde la pestaña REST API |
| **OpenAI**     | Una API Key con acceso al modelo `text-embedding-3-small` (usada por la búsqueda semántica de reportes, Módulo 5) | [platform.openai.com](https://platform.openai.com) → API Keys                                                             |

## Paso 3 — Completar `.env.local`

Copiar `.env.example` a `.env.local` y completar **todos** los valores (ninguno se deja vacío en un ambiente real):

```bash
cp .env.example .env.local
```

| Variable                                                                 | Valor                                                                                                                                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                               | Project URL de Supabase                                                                                                                                                                                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                          | anon public key                                                                                                                                                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`                                              | service_role key — **nunca con prefijo `NEXT_PUBLIC_`**                                                                                                                                                 |
| `DATABASE_URL` / `DIRECT_URL`                                            | connection strings del Paso 1.5                                                                                                                                                                         |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Dashboard de Cloudinary → Account Details                                                                                                                                                               |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`                                      | mismo cloud name (este SÍ es público — solo identifica la cuenta, no autoriza nada)                                                                                                                     |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`                                   | el nombre del preset unsigned creado en el Paso 2                                                                                                                                                       |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`                    | del Paso 2                                                                                                                                                                                              |
| `OPENAI_API_KEY`                                                         | del Paso 2                                                                                                                                                                                              |
| `APP_ENCRYPTION_KEY`                                                     | generar con `openssl rand -hex 32`                                                                                                                                                                      |
| `CRON_JOBS_SECRET`                                                       | generar con `openssl rand -hex 32` (**distinto** del anterior)                                                                                                                                          |
| `CORS_ALLOWLIST`                                                         | dominio real de producción cuando exista; en desarrollo dejar `http://localhost:3000`                                                                                                                   |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                            | endpoint del colector de OpenTelemetry si ya existe uno (ver nota abajo); si todavía no hay ninguno, dejar vacío — no rompe el arranque, pero ver la nota de la Auditoría sobre OTel nunca implementado |
| `NODE_ENV`                                                               | `development` en local                                                                                                                                                                                  |

> Revisar además si alguna de las ramas a unificar agregó una variable nueva no listada acá (ej. el feature flag de historiales compartidos mencionado en `docs/AUDITORIA_SISTEMA.md` Sección 2) — sumarla al `.env.example` real antes de continuar.

## Paso 4 — Migración de base de datos (orden estricto)

```bash
npm ci
npx prisma generate
```

1. **Aplicar todas las migraciones ya existentes en `prisma/migrations/`** — esto ya incluye, además de las tablas MVP + Post-MVP (`CHECK` constraints, índices HNSW de pgvector, vistas materializadas del dashboard, RLS de las tablas MVP), las 3 migraciones agregadas en la Fase 5 del sprint (`20260917100000_habilita_rls_tablas_post_mvp_modulos_5_a_9`, `20260917110000_agrega_indices_unicos_autorizacion_y_colaboracion`, `20260917120000_agrega_catalogo_roles`): RLS completa de los Módulos 5-9, los índices únicos `ux_autorizacion_activa`/`ux_colaboraciones_solicitud_stakeholder`, y el catálogo de `roles` como INSERT idempotente. **Ya no hace falta crear ninguna migración manual para esto** (los sub-pasos 2-4 de una versión anterior de este documento quedaron resueltos en el código):
   ```bash
   npx prisma migrate deploy
   ```
2. Verificar visualmente en el SQL Editor de Supabase (o `npx prisma studio`) que las tablas existen y que `SELECT * FROM roles;` devuelve 7 filas.

## Paso 5 — Alta manual de la primera cuenta `municipio` y del primer `administrador`

El rol `municipio` **no tiene autoregistro** (por diseño, `docs/ROLES.md`) y el sistema no tiene todavía una UI de alta institucional. Hasta que exista, crear la primera cuenta municipal y la primera cuenta administradora a mano:

1. Crear el usuario en **Supabase Auth** (Authentication → Users → Add user, con email/password reales) para cada una.
2. Copiar el `UUID` que Supabase le asignó a cada usuario.
3. Insertar la fila correspondiente en `usuarios` (SQL Editor), con `rol_id = 3` (municipio) o `rol_id = 4` (administrador) y ese mismo `id`:
   ```sql
   INSERT INTO usuarios (id, email, password_hash, rol_id, estado_verificacion)
   VALUES ('<uuid-de-supabase-auth>', 'municipio@coronelpringles.gob.ar', 'gestionado_por_supabase_auth', 3, 'no_requerido');
   ```
   (`password_hash` es un valor no usado por la aplicación — Supabase Auth gestiona la contraseña real; se deja un valor no vacío solo porque la columna es `NOT NULL`.)

## Paso 6 — Poblar datos de prueba (seed)

Con la base ya migrada (Pasos 4-5 completos):

````bash
psql "$DATABASE_URL" -f <(sed -n '/```sql/,/```/p' docs/SEED.md | sed '1d;$d')
````

(o, más simple: abrir `docs/SEED.md`, copiar el bloque SQL completo de la Sección 3, y pegarlo en el SQL Editor de Supabase — es exactamente lo que describe `docs/SETUP.md` Sección 7).

Esto crea automáticamente los usuarios de prueba para el Procedimiento de Testing Manual (ver `docs/PROCEDIMIENTO_TESTING_MANUAL.md`) — dueños, veterinarios, comerciantes, organizaciones, rescatistas, y todo el volumen de reportes/turnos/eventos/etc.

> ⚠️ El seed inserta usuarios en la tabla `usuarios` pero **no en Supabase Auth** (son dos sistemas distintos). Para poder iniciar sesión con un usuario del seed hace falta además crearlo en Supabase Auth con el **mismo `id`** — ver la nota al principio de `docs/PROCEDIMIENTO_TESTING_MANUAL.md` sobre credenciales de prueba.

## Paso 7 — Jobs programados

### 7.1 Refresco del dashboard municipal (Edge Function + Cron)

```bash
supabase login
supabase link --project-ref <ref-del-proyecto>
supabase functions deploy refresh-metricas-dashboard
```

Luego, Supabase Dashboard → Edge Functions → `refresh-metricas-dashboard` → **Cron Jobs** → crear job con expresión `*/15 * * * *`.

Probar sin esperar al cron: `supabase functions invoke refresh-metricas-dashboard`.

### 7.2 Recordatorios de turnos próximos

1. `CRON_JOBS_SECRET` ya se generó en el Paso 3.
2. Programar la llamada periódica (elegir una opción):
   - **GitHub Actions** — agregar a `.github/workflows/` un workflow con `on: schedule: cron: '0 * * * *'` que ejecute:
     ```bash
     curl -X POST https://<host-real>/api/webhooks/recordatorios-turnos -H "x-cron-secret: $CRON_JOBS_SECRET"
     ```
     (cargar `CRON_JOBS_SECRET` como GitHub Actions Secret del repo).
   - **Supabase `pg_cron`** — mismo `POST` vía `net.http_post` desde una función programada.
3. Verificar manualmente antes de programar el cron:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/recordatorios-turnos -H "x-cron-secret: $CRON_JOBS_SECRET"
   ```

## Paso 8 — OpenTelemetry (implementado 2026-09-17, Fase 5 — solo falta configurar el colector)

`instrumentation.ts` (raíz del proyecto) y `src/infraestructura/observabilidad/trazas.ts` (`conTraza()`) ya instrumentan los 3 flujos críticos exigidos (creación de reporte, reserva de turno, escritura en libreta sanitaria). Sin `OTEL_EXPORTER_OTLP_ENDPOINT` configurado, el SDK nunca se registra — cero overhead, cero intentos de conexión fallidos. Para activarlo en un ambiente real:

1. Levantar un colector (ej. Grafana Tempo, Honeycomb, o el colector OTLP del proveedor de hosting elegido).
2. Completar `OTEL_EXPORTER_OTLP_ENDPOINT` en `.env.local`/producción con la URL de ese colector.

## Paso 9 — Verificación final

```bash
npm run typecheck
npm run lint
npm run test:coverage      # confirmar ≥80% sobre el sistema YA unificado
npx playwright install     # una sola vez, la primera vez que se corre e2e en esta máquina/CI
npm run test:e2e
npm run build
npm run dev                 # http://localhost:3000 — probar registro + login manualmente
```

Si los 6 comandos pasan sin error, el sistema está listo para el `docs/PROCEDIMIENTO_TESTING_MANUAL.md`.

## Paso 10 — Docker (opcional, para correr todo con Postgres local en vez de Supabase cloud)

```bash
docker compose up -d db     # solo la base, con pgvector preinstalado
# apuntar DATABASE_URL/DIRECT_URL en .env.local a localhost:5432 (usuario/clave definidos en docker-compose.yml)
npx prisma migrate deploy
docker compose up app       # o npm run dev directamente, sin Docker, para desarrollo
```

Sirve para desarrollo/pruebas locales sin depender de un proyecto Supabase real, pero no reemplaza a Supabase Auth (que sí es un servicio cloud) — para probar login hace falta el proyecto Supabase del Paso 1 en cualquier caso.
