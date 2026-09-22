-- El catálogo fijo de 7 roles (`roles`) solo existía en el script de datos
-- de prueba de docs/SEED.md — en un ambiente real, sin correr ese seed de
-- datos falsos, la tabla quedaría vacía y nadie podría registrarse (el alta
-- de usuario depende de un rol_id válido). Se extrae a su propia migración
-- idempotente, separada de los datos de prueba aleatorios — mismo criterio
-- de "ON CONFLICT DO NOTHING" que docs/SEED.md ya usaba para poder
-- re-ejecutar el seed sin duplicar el catálogo.

INSERT INTO roles (id, nombre) VALUES
  (1, 'dueño'),
  (2, 'veterinario'),
  (3, 'municipio'),
  (4, 'administrador'),
  (5, 'rescatista'),
  (6, 'comerciante'),
  (7, 'organizacion')
ON CONFLICT (id) DO NOTHING;
