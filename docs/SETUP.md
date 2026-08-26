# SETUP — Inicialización y CI/CD

Este documento cubre lo que **no** se puede automatizar con `scripts/setup.sh` porque requiere acciones manuales en paneles externos (GitHub, Supabase, Cloudinary, Upstash). Hacerlo una sola vez, al arrancar el proyecto.

## 0. Arranque local automático

```bash
git clone <url-del-repo>
cd patitas-en-alerta
bash scripts/setup.sh
```

Esto instala dependencias, crea `.env.local`, levanta Postgres+pgvector local (Docker) y genera el cliente de Prisma. Lo que sigue abajo es manual.

---

## 1. Crear el repositorio en GitHub

1. Crear el repo (privado, org del proyecto).
2. Subir este contenido como primer commit en `main`.
3. **Branch protection en `main`** (Settings → Branches → Add rule):
   - Require a pull request before merging (mínimo 1 aprobación).
   - Require status checks to pass: `lint-and-typecheck`, `test`, `build` (los tres jobs de `.github/workflows/ci.yml`).
   - Require branches to be up to date before merging.
   - No permitir force-push ni borrado de `main`.
4. Ajustar `.github/CODEOWNERS` con los usuarios reales del equipo (está con placeholders).
5. Convención de ramas sugerida: `feature/modulo-2-crear-reporte`, `fix/...`, `chore/...`.

## 2. Secrets de GitHub Actions

Settings → Secrets and variables → Actions → New repository secret. Necesarios para que el pipeline de despliegue (a agregar cuando exista hosting definido) pueda operar sin exponer claves en el código:

| Secret | De dónde sale |
|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Panel de Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Panel de Supabase → Project Settings → API (¡nunca en `NEXT_PUBLIC_`!) |
| `DATABASE_URL` / `DIRECT_URL` | Panel de Supabase → Project Settings → Database → Connection string |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Panel de Cloudinary → Dashboard |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Panel de Upstash → Redis database → REST API |
| `APP_ENCRYPTION_KEY` | Generar local: `openssl rand -hex 32` |

El workflow de CI actual (`ci.yml`) usa placeholders para el `build` y una base de datos efímera para `test`, así que **no necesita estos secrets para correr** — solo hacen falta cuando se agregue un job de despliegue.

## 3. Crear el proyecto en Supabase

1. Crear proyecto en [supabase.com](https://supabase.com), región más cercana a Argentina disponible.
2. **Habilitar pgvector**: SQL Editor → `CREATE EXTENSION IF NOT EXISTS vector;` (también está en `docs/SCHEMA.md`).
3. **Configurar Auth** (Authentication → Settings):
   - JWT expiry: `3600` segundos (1 hora, según NFR de Seguridad).
   - Confirmar email: activado para dueños/veterinarios que se autoregistran.
   - Deshabilitar signups públicos si en algún momento se quiere restringir el alta (no es el caso del MVP, salvo para el rol `municipio`, que se crea manualmente — ver `docs/ROLES.md`).
4. Copiar `Project URL`, `anon key` y `service_role key` a `.env.local` (y a los Secrets de GitHub cuando corresponda).

## 4. Cloudinary

1. Crear cuenta / usar la existente del proyecto.
2. Crear un **upload preset unsigned** dedicado (ej. `patitas_en_alerta_dev`) restringido a la carpeta del proyecto, para que la subida desde el cliente (mascotas, reportes) no requiera exponer el `API_SECRET` en el navegador.
3. Completar `CLOUDINARY_*` en `.env.local`.

## 5. Upstash (Rate Limiting)

1. Crear una base Redis en [upstash.com](https://upstash.com) (plan gratis alcanza para el MVP).
2. Copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a `.env.local`.

## 6. Primera migración de base de datos (Prisma + SQL manual)

Prisma no expresa `CHECK` constraints ni políticas RLS de forma nativa. El flujo correcto en este proyecto es:

```bash
# 1) Generar la migración SIN aplicarla todavía
npx prisma migrate dev --create-only --name init

# 2) Abrir el archivo generado en prisma/migrations/<timestamp>_init/migration.sql
#    y AGREGAR AL FINAL:
#    - Los CHECK constraints de cada tabla (copiar de docs/SCHEMA.md)
#    - Los índices HNSW de pgvector (docs/SCHEMA.md, Módulo 2)
#    - Las vistas materializadas del dashboard (docs/SCHEMA.md, Módulo 3)
#    - RLS: ENABLE ROW LEVEL SECURITY + políticas por tabla (docs/ROLES.md, Sección 3)
#    - El rol 'organizacion' (id 7) en la semilla de roles (docs/ROLES.md, Sección 1)

# 3) Aplicar
npx prisma migrate dev
```

Esto queda documentado acá (y no automatizado en `setup.sh`) a propósito: es la clase de paso que conviene revisar línea por línea antes de aplicar, no scriptear a ciegas.

## 7. Poblar datos de prueba

```bash
# Con la base ya migrada:
psql "$DATABASE_URL" -f docs/SEED.md   # extraer el bloque SQL de docs/SEED.md Sección 3
```

(`docs/SEED.md` contiene el script completo con la estrategia de volumen — ver ese documento para el detalle.)

## 8. Verificación final antes de desarrollar

```bash
npm run typecheck   # sin errores de tipos
npm run lint        # sin errores de lint
npm run test        # suite unitaria pasa (aunque esté casi vacía al día 1)
npm run dev          # http://localhost:3000 muestra la home de placeholder
```

Si los cuatro comandos pasan, el proyecto está listo para empezar el Sprint 1 (`docs/` tiene el resto de la planificación: backlog, arquitectura, roles, sitemap).
