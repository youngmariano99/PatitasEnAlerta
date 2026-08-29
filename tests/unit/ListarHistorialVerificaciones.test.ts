/**
 * @jest-environment node
 */
import { ListarHistorialVerificaciones } from '@aplicacion/casos-de-uso/auth/ListarHistorialVerificaciones';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type { IRepositorioVerificaciones } from '@dominio/puertos/IRepositorioVerificaciones';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

function perfil(rol: string): ResumenPerfilPropio {
  return { id: 'admin-1', email: 'admin@ejemplo.test', rol, estadoVerificacion: 'no_requerido', verificadoEn: null };
}

function crearFakes(rol = 'administrador') {
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(perfil(rol)),
  };
  const repositorioVerificaciones: jest.Mocked<IRepositorioVerificaciones> = {
    listarPendientes: jest.fn(),
    listarResueltas: jest.fn().mockResolvedValue({ items: [], total: 0, pagina: 1, porPagina: 50 }),
    resolver: jest.fn(),
  };
  return { repositorioPerfil, repositorioVerificaciones };
}

describe('ListarHistorialVerificaciones', () => {
  it('lista la página pedida del historial cuando el solicitante es administrador', async () => {
    const { repositorioPerfil, repositorioVerificaciones } = crearFakes();
    const caso = new ListarHistorialVerificaciones(repositorioPerfil, repositorioVerificaciones);

    await caso.ejecutar({ solicitanteId: 'admin-1', pagina: 2, porPagina: 20 });

    expect(repositorioVerificaciones.listarResueltas).toHaveBeenCalledWith(2, 20);
  });

  it('impone el tope de 50 por página aunque se pida un valor mayor (defensa en profundidad)', async () => {
    const { repositorioPerfil, repositorioVerificaciones } = crearFakes();
    const caso = new ListarHistorialVerificaciones(repositorioPerfil, repositorioVerificaciones);

    await caso.ejecutar({ solicitanteId: 'admin-1', pagina: 1, porPagina: 500 });

    expect(repositorioVerificaciones.listarResueltas).toHaveBeenCalledWith(1, 50);
  });

  it('rechaza con 403 (PEA-SIS-002) a un solicitante que no es administrador', async () => {
    const { repositorioPerfil, repositorioVerificaciones } = crearFakes('veterinario');
    const caso = new ListarHistorialVerificaciones(repositorioPerfil, repositorioVerificaciones);

    await expect(caso.ejecutar({ solicitanteId: 'admin-1', pagina: 1, porPagina: 50 })).rejects.toBeInstanceOf(
      AccesoNoAutorizadoError,
    );
    expect(repositorioVerificaciones.listarResueltas).not.toHaveBeenCalled();
  });
});
