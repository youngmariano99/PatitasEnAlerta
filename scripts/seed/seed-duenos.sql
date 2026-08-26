-- Siembra acotada al Módulo 1 (AUTH-01): 120 dueños de mascota, para poder
-- probar el formulario de registro (app/auth/registro) contra emails que ya
-- existen y verificar el flujo PEA-AUTH-001 (409) manualmente o en QA.
-- Extraído 1:1 del bloque "2. Usuarios: Dueños de mascota" de docs/SEED.md
-- (fuente de verdad del volumen documentado — no modificar acá sin
-- actualizar primero ese documento).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-duenos.sql

BEGIN;

INSERT INTO roles (id, nombre) VALUES
  (1,'dueño'), (2,'veterinario'), (3,'municipio'), (4,'administrador'),
  (5,'rescatista'), (6,'comerciante')
ON CONFLICT (id) DO NOTHING;

-- ⚠️ password_hash de relleno: válido únicamente para entornos locales/QA.
-- En staging/producción el alta real pasa por supabase.auth.admin.createUser()
-- (ver SupabaseAuthAdapter), nunca por este script (docs/SEED.md, caveat de autenticación).
INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
SELECT 'dueño' || gs || '@ejemplo.test',
       '$2b$10$devSeedOnlyNotForProduction00000000000000000000000',
       1, 'no_requerido'
FROM generate_series(1, 120) AS gs
ON CONFLICT DO NOTHING;

COMMIT;
