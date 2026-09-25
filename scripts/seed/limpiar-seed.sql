-- Limpieza previa a un re-seed: borra SOLO los datos sintéticos generados
-- por scripts/seed/*.sql, nunca cuentas reales de prueba creadas a mano
-- (docs/PROCEDIMIENTO_TESTING_MANUAL.md, Sección 0) ni datos reales de
-- producción.
--
-- Cómo identifica "qué es seed": todo usuario sembrado por estos scripts usa
-- un email con dominio '@ejemplo.test' (dueño1@ejemplo.test, vet3@ejemplo.test,
-- comerciante2@ejemplo.test, etc. — ver cada scripts/seed/seed-*.sql). Ningún
-- flujo real de alta (autoregistro, alta manual del Paso 0.1) usa ese
-- dominio, así que filtrar por él separa con seguridad "seed" de "real" sin
-- necesidad de trackear IDs aparte.
--
-- Ningún script de seed hace TRUNCATE/DELETE antes de insertar (son
-- puramente aditivos) — por eso correrlos dos veces duplica datos. Corré
-- este script antes de repetir el seed si querés partir de cero, no como
-- parte automática de cada seed.
--
-- Orden: estrictamente inverso al de inserción (hijos antes que padres),
-- para no violar ninguna foreign key (el esquema no tiene ON DELETE CASCADE
-- en ningún lado — ver prisma/schema.prisma).
--
-- Uso:
--   psql "$DATABASE_URL" -f scripts/seed/limpiar-seed.sql

BEGIN;

CREATE TEMP TABLE tmp_seed_usuarios AS
SELECT id FROM usuarios WHERE email LIKE '%@ejemplo.test';

-- Bloque 1.B (Post-MVP) — hijos antes que padres
DELETE FROM sugerencias_compatibilidad
WHERE cuestionario_id IN (SELECT id FROM cuestionarios_adoptante WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM cuestionarios_adoptante WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM respuestas_foro
WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios)
   OR tema_id IN (SELECT id FROM temas_foro WHERE creado_por IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM temas_foro WHERE creado_por IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM inscripciones_curso
WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios)
   OR curso_id IN (SELECT id FROM cursos WHERE publicado_por IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM cursos WHERE publicado_por IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM productos_comercio
WHERE comercio_id IN (SELECT id FROM comercios WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM comercios WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM historiales_compartidos
WHERE veterinario_origen_id IN (SELECT id FROM tmp_seed_usuarios)
   OR veterinario_destino_id IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM pedidos_producto
WHERE comprador_id IN (SELECT id FROM tmp_seed_usuarios)
   OR producto_id IN (SELECT id FROM productos_veterinario WHERE veterinario_id IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM productos_veterinario WHERE veterinario_id IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM colaboraciones
WHERE stakeholder_id IN (SELECT id FROM tmp_seed_usuarios)
   OR solicitud_id IN (SELECT id FROM solicitudes_recurso WHERE organizacion_id IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM solicitudes_recurso WHERE organizacion_id IN (SELECT id FROM tmp_seed_usuarios);

-- Bloque 1.A (MVP) — hijos antes que padres
DELETE FROM entradas_libreta_sanitaria
WHERE veterinario_id IN (SELECT id FROM tmp_seed_usuarios)
   OR mascota_id IN (SELECT id FROM mascotas WHERE dueño_id IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM autorizaciones_libreta
WHERE veterinario_id IN (SELECT id FROM tmp_seed_usuarios)
   OR mascota_id IN (SELECT id FROM mascotas WHERE dueño_id IN (SELECT id FROM tmp_seed_usuarios));

DELETE FROM sugerencias_compatibilidad
WHERE vitrina_adopcion_id IN (SELECT id FROM vitrina_adopcion WHERE municipio_id IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM vitrina_adopcion WHERE municipio_id IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM turnos
WHERE proveedor_id IN (SELECT id FROM tmp_seed_usuarios)
   OR reservado_por IN (SELECT id FROM tmp_seed_usuarios)
   OR evento_id IN (SELECT id FROM eventos WHERE municipio_id IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM disponibilidad_veterinario WHERE veterinario_id IN (SELECT id FROM tmp_seed_usuarios);
DELETE FROM eventos WHERE municipio_id IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM notificaciones WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM reportes_historial_estado
WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios)
   OR reporte_id IN (SELECT id FROM reportes WHERE reportado_por IN (SELECT id FROM tmp_seed_usuarios));
DELETE FROM reportes WHERE reportado_por IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM mascotas WHERE dueño_id IN (SELECT id FROM tmp_seed_usuarios);

DELETE FROM verificaciones WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios);
DELETE FROM perfiles_veterinario WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios);
DELETE FROM perfiles_municipio WHERE usuario_id IN (SELECT id FROM tmp_seed_usuarios);

-- Por último, los usuarios sintéticos en sí (roles/catálogo NO se tocan).
DELETE FROM usuarios WHERE id IN (SELECT id FROM tmp_seed_usuarios);

REFRESH MATERIALIZED VIEW mv_metricas_reportes_periodo;
REFRESH MATERIALIZED VIEW mv_metricas_turnos_periodo;

COMMIT;
