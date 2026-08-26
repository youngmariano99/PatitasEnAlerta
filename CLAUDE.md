# CLAUDE.md - Resumen Ejecutivo del Proyecto

## 1. Información General del Proyecto
- **Nombre:** Patitas en alerta
- **Descripción:** "Patitas en Alerta" es una plataforma digital de participación ciudadana y logística sanitaria diseñada para optimizar el ecosistema de fauna urbana en el municipio de Coronel Pringles. Funcionando bajo el lema "Reportar protege. Actuar salva.", este Producto Mínimo Viable (MVP) actúa como un puente tecnológico en tiempo real entre los vecinos y el departamento de Zoonosis. El objetivo de esta fase piloto es mitigar emergencias urbanas, recuperar animales extraviados dentro de la ventana crítica de 48 horas y digitalizar la logística de salud pública municipal, eliminando la fricción administrativa tradicional.
- **Idioma Principal:** Español (Latinoamérica) para variables, funciones, parámetros y comentarios.

## 2. Stack Tecnológico Elegido
- **Frontend:** Next.js 14+ (App Router), TypeScript (Tipado Estático Fuerte), Tailwind CSS, React Testing Library, DOMPurify
- **Backend:** Node.js, TypeScript, Zod, TSyringe / InversifyJS, Pino, OpenTelemetry, zod-to-openapi
- **Base de Datos:** PostgreSQL (Supabase - Esquema 3FN con Soft Deletes), Prisma ORM, pgvector
- **Infraestructura:** Docker, Docker Compose, GitHub Actions, Cloudinary SDK
- **Seguridad:** JWT / Supabase Auth (verificación + expiración 1h), Next.js Middleware (IDOR/BOLA), CORS con Allowlist, @upstash/ratelimit, Node Crypto
- **Integraciones:** Cloudinary, Supabase, Leaflet / OpenStreetMap, Web Speech API

## 3. Comandos Frecuentes
- `npm run dev` / `npm run build` / `npm run start`
- `npm run test` / `npm run test:coverage` (umbral 80%) / `npm run test:e2e`
- `npm run lint` / `npm run typecheck`

## 4. Reglas Críticas e Innegociables

**Seguridad:** OWASP · autenticación y autorización · cifrado · anti-inyección (queries parametrizadas) · verificación real de tokens (no solo decodificación) · anti-IDOR/BOLA · expiración de sesión a 1h · middleware en cada endpoint · DOMPurify contra XSS · CORS con allowlist · rate limit.

**Escalabilidad:** Clean Architecture · DDD · Inyección de Dependencias · 3FN · paginación server-side · control de concurrencia (race conditions) · patrones de diseño Singleton, Factory Method, Abstract Factory, Builder, Adapter, Decorator, Flyweight, Proxy, Observer, Strategy, Command, State, Template Method, Visitor, Mediator, Chain of Responsibility · segregación e interfaces orientadas a abstracciones.

**DX:** tipado estático fuerte · SOLID · documentación automática (OpenAPI/Swagger) · nombres significativos · funciones pequeñas y específicas · DRY · comentarios mínimos pero útiles · consistencia de estilo · excepciones claras · código legible sin sobre-ingeniería · separación de responsabilidades.

**Testing:** TDD · pirámide 70% unitarios / 20% integración / 10% E2E.

**Trazabilidad:** OpenTelemetry · logging estructurado (Pino) · soft deletes y tablas de auditoría · mensajes al cliente en lenguaje empático, sin texto interno expuesto.

**Robustez:** validación de esquemas en la puerta (Zod) · DTOs · fail-fast.

**DevOps:** contenedorización · infraestructura como código · CI/CD.

**Extras:** funciones/variables/parámetros en español latinoamericano · UX/UI educativa (tips y placeholders intuitivos en cada acción del cliente).

**Restricciones:**
- No pasar de ~500-600 líneas por archivo.
- No tener políticas RLS con `USING (true)` para insert, update y delete.
- Prohibido hardcodear claves, API keys o contraseñas en código.
- Evitar `NEXT_PUBLIC_` para credenciales o claves sensibles.
- `Service_Role Key` usada solo server-side.
- Prohibido `console.log` de datos sensibles.

## 5. Índice de Documentación (Leer Bajo Demanda)
Antes de planificar o ejecutar una tarea compleja, leer el documento correspondiente en `docs/`:
- **Base de Datos y Entidades:** `docs/SCHEMA.md`
- **Rutas, Navegación y Flujos:** `docs/SITEMAP.md`
- **Roles, Accesos y RLS:** `docs/ROLES.md`
- **Estrategia de Datos Semilla:** `docs/SEED.md`
- **Diccionario de Excepciones:** `docs/ERRORS.md`
- **Inicialización y CI/CD:** `docs/SETUP.md`
- **Requisitos completos (MVP + Post-MVP):** `docs/REQUISITOS.md`
- **Planificación integral de producto:** `docs/PLANIFICACION.md`

## 6. Guía de Comportamiento e Instrucciones de Handoff
1. **Cero Placeholders:** todo componente generado debe incluir código completo listo para producción (excepto los stubs explícitamente marcados como tales en este scaffold inicial).
2. **Estructura Modular:** seguir rigurosamente Clean Architecture y las convenciones descritas en `README.md`.
3. **Flujo de Handoff:** al finalizar una tarea, resumir el cambio técnico y el checklist correspondiente (ver `.github/PULL_REQUEST_TEMPLATE.md`).
