-- `notificaciones` (docs/ROLES.md, mapa 3.7) hasta ahora solo tenía SELECT
-- propia + INSERT restringido a administrador ("generadas por la
-- aplicación"). Le faltaba la única escritura que el usuario final sí puede
-- hacer sobre su propia notificación: marcarla como leída (AC de esta
-- actividad, "Notificación de coincidencia de reporte" — ver
-- MarcarNotificacionLeida.ts). Mismo criterio de propiedad por fila que el
-- resto de las políticas de este catálogo (USING/WITH CHECK con
-- usuario_id = auth.uid()), no un WITH CHECK column-level (Postgres RLS no
-- restringe columnas por sí solo) — la app (Prisma, vía service_role) es la
-- única que decide qué campos toca en cada UPDATE.

CREATE POLICY notificaciones_marcar_leida ON notificaciones FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
