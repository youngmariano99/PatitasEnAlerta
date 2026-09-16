-- Endpoint público de comercios verificados por proximidad (Módulo 7, Post-MVP,
-- docs/REQUISITOS.md: "Visibilidad geolocalizada frente a dueños de mascotas").
-- Paso 2 del ticket: RLS + GRANT SELECT ON comercios TO anon, mismo criterio
-- que reportes/vitrina_adopcion (docs/ROLES.md, Patrón B) — defensa en
-- profundidad para cualquier acceso directo vía Supabase (anon/PostgREST),
-- ajeno al propio backend Next.js (Prisma corre con conexión privilegiada
-- vía DATABASE_URL, no sujeta a RLS).
--
-- Acotado a la política de SELECT que pide explícitamente este ticket.
-- INSERT/UPDATE (Patrón A/E ya documentados en docs/ROLES.md para
-- `comercios`: alta propia del comerciante, verificación exclusiva del
-- Administrador) quedan para la actividad dedicada que los implemente,
-- mismo criterio de diferimiento ya establecido en docs/DECISIONES.md.
ALTER TABLE "comercios" ENABLE ROW LEVEL SECURITY;

CREATE POLICY comercios_select_publico ON "comercios" FOR SELECT
  USING (estado_verificacion = 'verificado' OR usuario_id = auth.uid() OR rol_actual() = 'administrador');

GRANT SELECT ON "comercios" TO anon;
