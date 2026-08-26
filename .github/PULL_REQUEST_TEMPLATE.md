## Qué hace este PR

<!-- Descripción breve. Vincular la historia de usuario / actividad técnica correspondiente. -->

## Módulo afectado

- [ ] Módulo 1 — Autenticación y Registro de Mascotas
- [ ] Módulo 2 — Motor de Reportes Unificado
- [ ] Módulo 3 — Municipio (Eventos/Turnera/Vitrina)
- [ ] Módulo 4 — Veterinarios (Agenda/Libreta)
- [ ] Post-MVP (Módulos 5–9)
- [ ] Infraestructura / DevOps

## Checklist obligatorio antes de pedir revisión

- [ ] Sigo la capa correspondiente (dominio / aplicación / infraestructura / presentación) — sin lógica de negocio en componentes de UI.
- [ ] DTOs validados con Zod en la puerta del caso de uso (fail-fast).
- [ ] Si el endpoint expone un recurso con dueño: hay política RLS y/o middleware anti-IDOR/BOLA cubriéndolo, con test de acceso cruzado.
- [ ] Sin `console.log` de datos sensibles (uso Pino).
- [ ] Sin claves, tokens o `Service_Role Key` hardcodeadas ni expuestas vía `NEXT_PUBLIC_`.
- [ ] Soft delete (nunca `DELETE` físico) en entidades de negocio.
- [ ] Tests unitarios/integración agregados o actualizados; `npm run test:coverage` no baja del umbral.
- [ ] Cumple el sistema de diseño (sin púrpura/violeta/índigo, sin negro/blanco puro, `font-mono` en datos tabulares, táctil ≥44px, error nunca solo por color).
- [ ] Archivo(s) tocado(s) se mantienen dentro de las ~500–600 líneas.
- [ ] `npm run lint` y `npm run typecheck` pasan localmente.

## Cómo probarlo

<!-- Pasos manuales o comando de test específico -->
