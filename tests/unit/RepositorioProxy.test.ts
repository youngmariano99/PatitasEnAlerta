/**
 * @jest-environment node
 */
import { RepositorioProxy, type RepositorioConBusquedaPorId } from '@infraestructura/proxies/RepositorioProxy';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

interface EntidadDePrueba {
  id: string;
  dueñoId: string;
}

function crearRepositorioFalso(entidad: EntidadDePrueba | null): jest.Mocked<RepositorioConBusquedaPorId<EntidadDePrueba>> {
  return { buscarPorId: jest.fn().mockResolvedValue(entidad) };
}

const esPropietario = (entidad: EntidadDePrueba, solicitanteId: string) => entidad.dueñoId === solicitanteId;

describe('RepositorioProxy', () => {
  it('delega al repositorio real y devuelve la entidad cuando el solicitante es el dueño', async () => {
    const entidad = { id: 'recurso-1', dueñoId: 'dueno-1' };
    const repositorioReal = crearRepositorioFalso(entidad);
    const proxy = new RepositorioProxy(repositorioReal, 'dueno-1', esPropietario);

    const resultado = await proxy.buscarPorId('recurso-1');

    expect(resultado).toBe(entidad);
    expect(repositorioReal.buscarPorId).toHaveBeenCalledWith('recurso-1');
  });

  it('rechaza con 403 (PEA-SIS-002) cuando el recurso pertenece a otro solicitante', async () => {
    const repositorioReal = crearRepositorioFalso({ id: 'recurso-1', dueñoId: 'dueno-1' });
    const proxy = new RepositorioProxy(repositorioReal, 'otro-usuario', esPropietario);

    await expect(proxy.buscarPorId('recurso-1')).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
  });

  it('rechaza con el MISMO error 403 cuando el recurso no existe (nunca revela si existe o no)', async () => {
    const repositorioReal = crearRepositorioFalso(null);
    const proxy = new RepositorioProxy(repositorioReal, 'cualquier-usuario', esPropietario);

    const promesaInexistente = proxy.buscarPorId('recurso-fantasma').catch((e) => e);
    const promesaAjena = new RepositorioProxy(
      crearRepositorioFalso({ id: 'recurso-1', dueñoId: 'dueno-1' }),
      'otro-usuario',
      esPropietario,
    )
      .buscarPorId('recurso-1')
      .catch((e) => e);

    const [errorInexistente, errorAjeno] = await Promise.all([promesaInexistente, promesaAjena]);

    expect(errorInexistente).toBeInstanceOf(AccesoNoAutorizadoError);
    expect(errorAjeno).toBeInstanceOf(AccesoNoAutorizadoError);
    expect(errorInexistente.codigo).toBe(errorAjeno.codigo);
    expect(errorInexistente.statusHttp).toBe(errorAjeno.statusHttp);
    expect(errorInexistente.message).toBe(errorAjeno.message);
  });

  it('acepta un verificador que autoriza por rol además de por dueño (ej. administrador)', async () => {
    const repositorioReal = crearRepositorioFalso({ id: 'recurso-1', dueñoId: 'dueno-1' });
    const esPropietarioOAdmin = (entidad: EntidadDePrueba, solicitante: { id: string; rol: string }) =>
      entidad.dueñoId === solicitante.id || solicitante.rol === 'administrador';
    const proxy = new RepositorioProxy(repositorioReal, { id: 'admin-1', rol: 'administrador' }, esPropietarioOAdmin);

    await expect(proxy.buscarPorId('recurso-1')).resolves.toEqual({ id: 'recurso-1', dueñoId: 'dueno-1' });
  });
});
