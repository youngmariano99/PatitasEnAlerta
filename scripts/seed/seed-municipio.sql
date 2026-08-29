-- Siembra acotada al Módulo 1 (AUTH-03): la única cuenta institucional del
-- municipio (alcance single-tenant documentado en docs/SCHEMA.md). Adaptado
-- del bloque "4. Usuario: Municipio (single-tenant)" de docs/SEED.md.
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-municipio.sql

BEGIN;

INSERT INTO roles (id, nombre) VALUES
  (1,'dueño'), (2,'veterinario'), (3,'municipio'), (4,'administrador'),
  (5,'rescatista'), (6,'comerciante')
ON CONFLICT (id) DO NOTHING;

-- ⚠️ password_hash de relleno: válido únicamente para entornos locales/QA.
-- En staging/producción el alta real pasa por CrearCuentaMunicipio
-- (exclusiva de un Administrador vía POST /api/admin/municipio), nunca por
-- este script.
CREATE TEMP TABLE tmp_municipio_seed AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  VALUES ('municipio.pringles@ejemplo.test', 'gestionado_por_supabase_auth', 3, 'verificado')
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT id FROM ins;

INSERT INTO perfiles_municipio (usuario_id, nombre_institucional, verificado_en)
SELECT id, 'Municipalidad de Coronel Pringles — Zoonosis', now() - interval '10 days'
FROM tmp_municipio_seed
ON CONFLICT DO NOTHING;

COMMIT;
