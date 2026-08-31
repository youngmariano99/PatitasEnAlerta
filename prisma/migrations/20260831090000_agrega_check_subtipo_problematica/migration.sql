-- `subtipo` (agregado junto con `reportes` desde la migración inicial) nunca
-- tuvo un CHECK a nivel de base de datos — quedaba enforced únicamente por
-- CrearReporteDto (Zod). Esta actividad (REP-03, problemática urbana)
-- completa la defensa en profundidad ya usada para `tipo`/`estado`
-- (docs/SCHEMA.md: "Campos categóricos: TEXT + CHECK en vez de ENUM nativo").
--
-- Tres reglas independientes:
-- 1) Si `subtipo` no es NULL, tiene que ser uno de los tres valores válidos.
-- 2) Todo reporte 'problematica' tiene que tener `subtipo` (nunca NULL) —
--    mismo criterio cruzado que `ck_turnos_proveedor_evento` en `turnos`.
-- 3) Un reporte 'problematica' nunca puede tener `mascota_id` — no es un
--    reporte sobre una mascota registrada (CrearReporte.ts ya lo fuerza a
--    NULL en la capa de aplicación; esto lo garantiza también en la BD).

ALTER TABLE "reportes"
  ADD CONSTRAINT "reportes_subtipo_valido_check"
  CHECK ("subtipo" IS NULL OR "subtipo" IN ('animal_suelto', 'foco_sanitario', 'accidente_vial'));

ALTER TABLE "reportes"
  ADD CONSTRAINT "reportes_problematica_requiere_subtipo_check"
  CHECK ("tipo" <> 'problematica' OR "subtipo" IS NOT NULL);

ALTER TABLE "reportes"
  ADD CONSTRAINT "reportes_problematica_sin_mascota_check"
  CHECK ("tipo" <> 'problematica' OR "mascota_id" IS NULL);
