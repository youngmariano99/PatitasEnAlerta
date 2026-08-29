-- Siembra acotada al Módulo 1 (AUTH-02): 8 veterinarios con su
-- perfiles_veterinario y su fila en verificaciones, para poder probar la
-- validación de matrícula+colegio duplicados (PEA-AUTH-006) contra datos ya
-- existentes. Adaptado de los bloques "3. Usuarios: Veterinarios" y
-- "6. Perfiles de veterinario" de docs/SEED.md (mismo patrón de matrícula
-- MP-1000+n y colegio_emisor fijo).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-veterinarios.sql

BEGIN;

INSERT INTO roles (id, nombre) VALUES
  (1,'dueño'), (2,'veterinario'), (3,'municipio'), (4,'administrador'),
  (5,'rescatista'), (6,'comerciante')
ON CONFLICT (id) DO NOTHING;

-- ⚠️ password_hash de relleno: válido únicamente para entornos locales/QA.
-- En staging/producción el alta real pasa por RegistrarVeterinario (Supabase
-- Auth + transacción usuarios/perfiles_veterinario/verificaciones), nunca
-- por este script.
CREATE TEMP TABLE tmp_veterinarios_seed AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  SELECT 'vet' || gs || '@ejemplo.test',
         'gestionado_por_supabase_auth',
         2, 'pendiente'
  FROM generate_series(1, 8) AS gs
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT id, row_number() OVER () AS rn FROM ins;

INSERT INTO perfiles_veterinario (usuario_id, matricula, colegio_emisor)
SELECT id, 'MP-' || (1000 + rn), 'Colegio de Veterinarios de la Provincia de Buenos Aires'
FROM tmp_veterinarios_seed
ON CONFLICT DO NOTHING;

INSERT INTO verificaciones (usuario_id, tipo, estado)
SELECT id, 'veterinario', 'pendiente'
FROM tmp_veterinarios_seed;

COMMIT;
