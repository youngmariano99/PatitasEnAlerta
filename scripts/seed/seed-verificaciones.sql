-- Siembra acotada al Módulo 1 (AUTH-08): 10 verificaciones con mezcla real
-- pendiente/aprobado/rechazado, para poblar la cola inicial del panel
-- /admin/verificaciones con casos de los tres estados (scripts/seed/seed-veterinarios.sql
-- ya siembra 8 veterinarios, pero solo alterna pendiente/verificado — sin
-- ningún caso 'rechazado' para probar ese estado del BadgeVerificacion ni el
-- flujo de motivo_rechazo). Usa emails propios (vet-verificacion{n}@ejemplo.test)
-- para no pisar los usuarios de seed-veterinarios.sql. Adaptado del bloque
-- "8. Verificaciones" de docs/SEED.md.
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/seed-verificaciones.sql

BEGIN;

INSERT INTO roles (id, nombre) VALUES
  (1,'dueño'), (2,'veterinario'), (3,'municipio'), (4,'administrador'),
  (5,'rescatista'), (6,'comerciante')
ON CONFLICT (id) DO NOTHING;

-- ⚠️ password_hash de relleno: válido únicamente para entornos locales/QA.
CREATE TEMP TABLE tmp_solicitantes_verificacion AS
WITH ins AS (
  INSERT INTO usuarios (email, password_hash, rol_id, estado_verificacion)
  SELECT 'vet-verificacion' || gs || '@ejemplo.test',
         'gestionado_por_supabase_auth',
         2, 'pendiente'
  FROM generate_series(1, 10) AS gs
  ON CONFLICT DO NOTHING
  RETURNING id
)
SELECT id, row_number() OVER () AS rn FROM ins;

INSERT INTO perfiles_veterinario (usuario_id, matricula, colegio_emisor)
SELECT id, 'MP-' || (2000 + rn), 'Colegio de Veterinarios de la Provincia de Buenos Aires'
FROM tmp_solicitantes_verificacion
ON CONFLICT DO NOTHING;

-- Mismo patrón de distribución que docs/SEED.md (25% pendiente, 50%
-- aprobado, 25% rechazado) pero con las 10 filas exactas que pide el ticket.
-- A diferencia del bloque original de docs/SEED.md, acá motivo_rechazo solo
-- se completa cuando estado='rechazado' (dato consistente para probar el
-- flujo real de ResolverVerificacionCommand).
INSERT INTO verificaciones (usuario_id, tipo, estado, motivo_rechazo, resuelto_en)
SELECT
  s.id,
  'veterinario',
  e.estado,
  CASE WHEN e.estado = 'rechazado' THEN 'Matrícula no encontrada en el padrón del colegio' ELSE NULL END,
  CASE WHEN e.estado <> 'pendiente' THEN now() - (random() * 20 || ' days')::interval ELSE NULL END
FROM tmp_solicitantes_verificacion s
CROSS JOIN LATERAL (
  SELECT (ARRAY['pendiente','aprobado','aprobado','rechazado'])[1 + floor(random() * 4)::int] AS estado
) e;

COMMIT;
