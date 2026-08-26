# 🐾 Patitas en Alerta

Plataforma digital de participación ciudadana y logística sanitaria para el municipio de Coronel Pringles. MVP: reportar mascotas perdidas/encontradas y problemáticas urbanas, gestionar turnos y operativos municipales, y una libreta sanitaria básica compartida con veterinarios verificados.

## Arranque rápido

```bash
bash scripts/setup.sh
```

Ver `docs/SETUP.md` para la configuración manual (GitHub, Supabase, Cloudinary, Upstash) que el script no puede automatizar.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Node.js · Zod · TSyringe · Prisma + PostgreSQL (Supabase) + pgvector · Docker · GitHub Actions.

## Documentación (leer bajo demanda antes de encarar una tarea compleja)

| Documento | Para qué |
|---|---|
| `docs/SETUP.md` | Inicialización y CI/CD |
| `docs/SCHEMA.md` | Modelo de base de datos completo (MVP + Post-MVP) |
| `docs/SITEMAP.md` | Rutas y arquitectura de información |
| `docs/ROLES.md` | Roles, matriz de permisos y políticas RLS |
| `docs/SEED.md` | Estrategia y script de datos de prueba |
| `docs/ERRORS.md` | Diccionario de códigos de error por módulo |

## Arquitectura

Clean Architecture + DDD en 4 capas dentro de `src/`:

```
src/dominio/           → entidades, estados, interfaces de puertos (sin dependencias externas)
src/aplicacion/        → casos de uso, DTOs, fábricas, builders, pipelines (orquestan el dominio)
src/infraestructura/   → adaptadores concretos (Prisma, Cloudinary, Supabase, Leaflet...)
src/presentacion/      → componentes de UI reutilizables
app/                   → App Router de Next.js (páginas y route handlers)
```

Los casos de uso dependen de interfaces, nunca de clases concretas de infraestructura — el contenedor de DI (`src/aplicacion/contenedor-di.ts`, TSyringe) es el único lugar donde se conecta una interfaz con su implementación real.

## Comandos

```bash
npm run dev              # servidor de desarrollo
npm run build             # build de producción
npm run test               # tests unitarios + integración
npm run test:coverage      # con reporte de cobertura (umbral 80%)
npm run test:e2e           # Playwright
npm run lint                # ESLint
npm run typecheck           # tsc --noEmit
npm run prisma:studio       # explorador visual de la base de datos
```

## Reglas no negociables (resumen — ver estándar técnico completo del proyecto)

- Ningún archivo supera ~500-600 líneas.
- Ninguna política RLS usa `USING (true)` para `INSERT`/`UPDATE`/`DELETE`.
- Prohibido hardcodear claves; `SUPABASE_SERVICE_ROLE_KEY` solo server-side; nunca `NEXT_PUBLIC_` para secretos.
- Soft delete siempre — ningún `DELETE` físico desde la aplicación.
- Prohibido `console.log` de datos sensibles (usar el logger de `src/infraestructura/logging/logger.ts`).
