/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { ListarHistorialReporte } from '@aplicacion/casos-de-uso/reportes/ListarHistorialReporte';
import type { HistorialEstadoItem, IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { ReporteNoEncontradoError } from '@dominio/errores/erroresReportes';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const reporteId = '11111111-1111-1111-1111-111111111111';
const duenoId = '22222222-2222-2222-2222-222222222222';
const otroUsuarioId = '33333333-3333-3333-3333-333333333333';

const HISTORIAL: HistorialEstadoItem[] = [
  {
    id: 'h1',
    estadoAnterior: 'reportado',
    estadoNuevo: 'en_revision',
    usuarioId: 'municipio-1',
    registradoEn: new Date('2026-08-01T10:00:00.000Z'),
  },
  {
    id: 'h2',
    estadoAnterior: 'en_revision',
    estadoNuevo: 'en_atencion',
    usuarioId: 'municipio-1',
    registradoEn: new Date('2026-08-02T10:00:00.000Z'),
  },
];

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: otroUsuarioId, email: 'usuario@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { propietarioId?: string | null; rolSolicitante?: string }) {
  const propietarioId = opciones && 'propietarioId' in opciones ? opciones.propietarioId : duenoId;
  const repositorioReportes: jest.Mocked<IRepositorioReportes> = {
    crear: jest.fn(),
    buscarPerdidosActivosPorZonaYEspecie: jest.fn(),
    listar: jest.fn(),
    obtenerEstadoActual: jest.fn(),
    actualizarEstado: jest.fn(),
    obtenerPropietario: jest.fn().mockResolvedValue(propietarioId),
    listarHistorialEstado: jest.fn().mockResolvedValue(HISTORIAL),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rolSolicitante ?? 'dueño')),
  };
  return { repositorioReportes, repositorioPerfil };
}

describe('ListarHistorialReporte', () => {
  it('el dueño del reporte accede a su propio historial, ordenado cronológicamente', async () => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ propietarioId: duenoId });
    const caso = new ListarHistorialReporte(repositorioReportes, repositorioPerfil);

    const resultado = await caso.ejecutar({ reporteId, solicitanteId: duenoId });

    expect(resultado).toEqual(HISTORIAL);
    expect(repositorioReportes.listarHistorialEstado).toHaveBeenCalledWith(reporteId);
    // El dueño no necesita que se consulte su rol — la comparación de ownership alcanza.
    expect(repositorioPerfil.obtenerPerfilPropio).not.toHaveBeenCalled();
  });

  it.each(['municipio', 'administrador'])('rol %s accede al historial de cualquier reporte, aunque no sea el dueño', async (rol) => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ propietarioId: duenoId, rolSolicitante: rol });
    const caso = new ListarHistorialReporte(repositorioReportes, repositorioPerfil);

    const resultado = await caso.ejecutar({ reporteId, solicitanteId: otroUsuarioId });

    expect(resultado).toEqual(HISTORIAL);
  });

  it.each(['dueño', 'veterinario'])('rechaza con PEA-SIS-002 (403) a un usuario %s ajeno al reporte', async (rol) => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ propietarioId: duenoId, rolSolicitante: rol });
    const caso = new ListarHistorialReporte(repositorioReportes, repositorioPerfil);

    await expect(caso.ejecutar({ reporteId, solicitanteId: otroUsuarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioReportes.listarHistorialEstado).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-REP-005 (404) si el reporte no existe o está soft-deleted', async () => {
    const { repositorioReportes, repositorioPerfil } = crearFakes({ propietarioId: null });
    const caso = new ListarHistorialReporte(repositorioReportes, repositorioPerfil);

    await expect(caso.ejecutar({ reporteId, solicitanteId: duenoId })).rejects.toBeInstanceOf(ReporteNoEncontradoError);
    expect(repositorioReportes.listarHistorialEstado).not.toHaveBeenCalled();
    // No existe: ni siquiera se consulta el perfil del solicitante.
    expect(repositorioPerfil.obtenerPerfilPropio).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast un reporteId que no es un UUID válido', async () => {
    const { repositorioReportes, repositorioPerfil } = crearFakes();
    const caso = new ListarHistorialReporte(repositorioReportes, repositorioPerfil);

    await expect(caso.ejecutar({ reporteId: 'no-es-uuid', solicitanteId: duenoId })).rejects.toBeInstanceOf(ZodError);
  });
});
