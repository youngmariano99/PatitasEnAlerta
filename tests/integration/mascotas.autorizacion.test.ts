/**
 * Patrón obligatorio (NFR Seguridad — Control de acceso): cada entidad con
 * dueño necesita al menos un test de integración que intente acceso cruzado
 * y espere 403. Este archivo es el placeholder a completar cuando exista el
 * endpoint real de mascotas (Módulo 1).
 *
 * Completar reemplazando los TODO una vez implementado:
 * src/aplicacion/casos-de-uso/mascotas/ActualizarMascota.ts
 */
describe('Anti-IDOR/BOLA — mascotas', () => {
  it.todo('un usuario no puede leer una mascota de otro dueño (403 / PEA-SIS-002)');
  it.todo('un usuario no puede editar una mascota de otro dueño (403 / PEA-SIS-002)');
  it.todo('un usuario no puede dar de baja una mascota de otro dueño (403 / PEA-SIS-002)');
});
