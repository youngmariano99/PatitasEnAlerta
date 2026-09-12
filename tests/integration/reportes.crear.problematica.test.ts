/**
 * @jest-environment node
 */
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import type { IControlDeTasaConReintento } from '@dominio/puertos/IControlDeTasaConReintento';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import {
  AlmacenamientoImagenesFalso,
  ControlDeTasaAntiSaturacionFalso,
  ControlDeTasaFalso,
  NotificacionesRepositorioFalso,
  RepositorioPerfilFalso,
  RepositorioReportesFalso,
  autenticarComo,
  crearRequest,
  reporteValido,
} from './reportes.crear.fixtures';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

// Importa el route handler DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, mismo criterio que reportes.crear.test.ts.
import { POST } from '@app/api/reportes/route';

/**
 * Casos de tipo='problematica' de POST /api/reportes, separados de
 * reportes.crear.test.ts (mismos fakes de reportes.crear.fixtures.ts) para
 * respetar el límite de 300 líneas por archivo (CLAUDE.md).
 */
describe('POST /api/reportes — tipo=problematica (subtipo obligatorio y CHECK)', () => {
  let repositorioReportes: RepositorioReportesFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioReportes = new RepositorioReportesFalso();
    container.reset();
    container.registerInstance<IRepositorioReportes>('IRepositorioReportes', repositorioReportes);
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', new NotificacionesRepositorioFalso());
    container.registerInstance<IControlDeTasa>('IControlDeTasa', new ControlDeTasaFalso());
    container.registerInstance<IControlDeTasaConReintento>('IControlDeTasaConReintento', new ControlDeTasaAntiSaturacionFalso());
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', new RepositorioPerfilFalso());
    container.registerInstance<IAlmacenamientoImagenes>('IAlmacenamientoImagenes', new AlmacenamientoImagenesFalso());
  });

  it('rechaza tipo="problematica" sin subtipo (400 / PEA-REP-001)', async () => {
    autenticarComo(getUserMock, 'usuario-1');

    const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'problematica' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-001');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('rechaza un subtipo fuera del CHECK (animal_suelto | foco_sanitario | accidente_vial) con 400 / PEA-REP-001', async () => {
    autenticarComo(getUserMock, 'usuario-1');

    const respuesta = await POST(
      crearRequest({ ...reporteValido, tipo: 'problematica', subtipo: 'incendio_forestal' }),
    );

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-REP-001');
    expect(repositorioReportes.creados).toHaveLength(0);
  });

  it('publica un reporte "problematica" con subtipo válido, con mascota_id siempre NULL en la fila persistida', async () => {
    autenticarComo(getUserMock, 'usuario-1');

    const respuesta = await POST(
      crearRequest({
        ...reporteValido,
        tipo: 'problematica',
        subtipo: 'animal_suelto',
        mascotaId: '11111111-1111-1111-1111-111111111111',
      }),
    );

    expect(respuesta.status).toBe(201);
    const cuerpo = await respuesta.json();
    expect(cuerpo.tipo).toBe('problematica');
    expect(cuerpo.subtipo).toBe('animal_suelto');
    expect(cuerpo.mascotaId).toBeNull();
    expect(repositorioReportes.creados[0]).toMatchObject({
      tipo: 'problematica',
      subtipo: 'animal_suelto',
      mascotaId: null,
    });
    expect(repositorioReportes.llamadasBusquedaCoincidencias).toHaveLength(0);
  });

  it.each(['animal_suelto', 'foco_sanitario', 'accidente_vial'])(
    'acepta el subtipo "%s" del CHECK',
    async (subtipo) => {
      autenticarComo(getUserMock, 'usuario-1');

      const respuesta = await POST(crearRequest({ ...reporteValido, tipo: 'problematica', subtipo }));

      expect(respuesta.status).toBe(201);
    },
  );
});
