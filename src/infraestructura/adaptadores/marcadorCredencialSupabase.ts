// La columna `password_hash` es NOT NULL en el esquema (docs/SCHEMA.md) pero
// Supabase Auth es la única fuente real de credenciales (docs/SEED.md,
// caveat de autenticación). Ningún repositorio guarda acá una copia ni
// derivado real de la contraseña — solo este marcador fijo, no reversible
// ni sensible. Compartido por cualquier repositorio que inserte en `usuarios`
// (dueños, veterinarios, y los que se sumen después).
export const MARCADOR_CREDENCIAL_GESTIONADA_POR_SUPABASE = 'gestionado_por_supabase_auth';
