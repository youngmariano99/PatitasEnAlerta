-- Siembra acotada al Módulo 1 (AUTH-02/AUTH-07): 8 veterinarios con su
-- perfiles_veterinario y su fila en verificaciones. Estado MIXTO a
-- propósito (mitad 'pendiente', mitad 'verificado' — AUTH-07): permite
-- probar los dos estados visuales de BadgeVerificacion sin tener que
-- aprobar nada a mano, y sigue sirviendo para el escenario de AUTH-02
-- (matrícula/colegio duplicados, PEA-AUTH-006). Adaptado de los bloques
-- "3. Usuarios: Veterinarios" y "6. Perfiles de veterinario" de
-- docs/SEED.md (mismo patrón de matrícula MP-1000+n y colegio_emisor fijo).
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
         2,
         CASE WHEN gs % 2 = 0 THEN 'verificado' ELSE 'pendiente' END
  FROM generate_series(1, 8) AS gs
  ON CONFLICT DO NOTHING
  RETURNING id, estado_verificacion
)
SELECT id, estado_verificacion, row_number() OVER () AS rn FROM ins;

INSERT INTO perfiles_veterinario (usuario_id, matricula, colegio_emisor, verificado_en)
SELECT
  id,
  'MP-' || (1000 + rn),
  'Colegio de Veterinarios de la Provincia de Buenos Aires',
  CASE WHEN estado_verificacion = 'verificado' THEN now() - (random() * 20 || ' days')::interval ELSE NULL END
FROM tmp_veterinarios_seed
ON CONFLICT DO NOTHING;

INSERT INTO verificaciones (usuario_id, tipo, estado, resuelto_en)
SELECT
  id,
  'veterinario',
  CASE WHEN estado_verificacion = 'verificado' THEN 'aprobado' ELSE 'pendiente' END,
  CASE WHEN estado_verificacion = 'verificado' THEN now() - (random() * 20 || ' days')::interval ELSE NULL END
FROM tmp_veterinarios_seed;

COMMIT;
