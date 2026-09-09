/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { PublicarSolicitudRecurso } from '@aplicacion/casos-de-uso/red-colaboracion/PublicarSolicitudRecurso';
import { SolicitudRecurso } from '@dominio/entidades/SolicitudRecurso';
import type { DatosNuevaSolicitudRecurso, IRepositorioSolicitudesRecurso } from '@dominio/puertos/IRepositorioSolicitudesRecurso';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const organizacionId = '11111111-1111-1111-1111-111111111111';

const datosCrudosValidos = {
  tipo: 'transito',
  descripcion: 'Necesitamos tránsito temporal para 3 cachorros rescatados esta semana.',
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: organizacionId, email: 'ong@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: null };
}

function crearFakes(opciones?: { rol?: string }) {
  const repositorioSolicitudes: jest.Mocked<IRepositorioSolicitudesRecurso> = {
    crear: jest.fn().mockImplementation(async (datos: DatosNuevaSolicitudRecurso) =>
      SolicitudRecurso.reconstruir('solicitud-1', { ...datos, estado: 'abierta' }, new Date('2026-09-09T09:00:00.000Z')),
    ),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'organizacion')),
  };
  return { repositorioSolicitudes, repositorioPerfil };
}

describe('PublicarSolicitudRecurso', () => {
  it('publica la solicitud con organizacionId resuelto por la sesión y estado inicial "abierta"', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    const caso = new PublicarSolicitudRecurso(repositorioSolicitudes, repositorioPerfil);

    const resultado = await caso.ejecutar({ datosCrudos: datosCrudosValidos, organizacionId });

    expect(resultado.tipo).toBe('transito');
    expect(resultado.organizacionId).toBe(organizacionId);
    expect(resultado.estado).toBe('abierta');
    expect(resultado.reporteId).toBeNull();
    expect(repositorioSolicitudes.crear).toHaveBeenCalledWith({
      organizacionId,
      tipo: 'transito',
      descripcion: datosCrudosValidos.descripcion,
      reporteId: null,
    });
  });

  it('persiste reporteId cuando la organización lo declara', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    const caso = new PublicarSolicitudRecurso(repositorioSolicitudes, repositorioPerfil);
    const reporteId = '22222222-2222-2222-2222-222222222222';

    await caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, reporteId }, organizacionId });

    expect(repositorioSolicitudes.crear).toHaveBeenCalledWith(expect.objectContaining({ reporteId }));
  });

  it.each(['dueño', 'veterinario', 'municipio', 'administrador', 'rescatista'])(
    'rechaza con AccesoNoAutorizadoError (PEA-SIS-002) para rol %s, sin persistir nada',
    async (rol) => {
      const { repositorioSolicitudes, repositorioPerfil } = crearFakes({ rol });
      const caso = new PublicarSolicitudRecurso(repositorioSolicitudes, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: datosCrudosValidos, organizacionId })).rejects.toBeInstanceOf(
        AccesoNoAutorizadoError,
      );
      expect(repositorioSolicitudes.crear).not.toHaveBeenCalled();
    },
  );

  it('rechaza cuando no existe perfil para el organizacionId (anti-IDOR)', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    repositorioPerfil.obtenerPerfilPropio.mockResolvedValue(null);
    const caso = new PublicarSolicitudRecurso(repositorioSolicitudes, repositorioPerfil);

    await expect(caso.ejecutar({ datosCrudos: datosCrudosValidos, organizacionId })).rejects.toBeInstanceOf(
      AccesoNoAutorizadoError,
    );
    expect(repositorioSolicitudes.crear).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) sin persistir cuando falta el tipo', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    const caso = new PublicarSolicitudRecurso(repositorioSolicitudes, repositorioPerfil);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tipo: _tipo, ...sinTipo } = datosCrudosValidos;

    await expect(caso.ejecutar({ datosCrudos: sinTipo, organizacionId })).rejects.toBeInstanceOf(ZodError);
    expect(repositorioSolicitudes.crear).not.toHaveBeenCalled();
  });

  it('rechaza un tipo fuera del catálogo soportado', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    const caso = new PublicarSolicitudRecurso(repositorioSolicitudes, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, tipo: 'dinero' }, organizacionId }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(repositorioSolicitudes.crear).not.toHaveBeenCalled();
  });

  it('rechaza fail-fast (Zod) sin persistir cuando falta la descripción', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    const caso = new PublicarSolicitudRecurso(repositorioSolicitudes, repositorioPerfil);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { descripcion: _descripcion, ...sinDescripcion } = datosCrudosValidos;

    await expect(caso.ejecutar({ datosCrudos: sinDescripcion, organizacionId })).rejects.toBeInstanceOf(ZodError);
    expect(repositorioSolicitudes.crear).not.toHaveBeenCalled();
  });

  it('rechaza un reporteId con formato inválido', async () => {
    const { repositorioSolicitudes, repositorioPerfil } = crearFakes();
    const caso = new PublicarSolicitudRecurso(repositorioSolicitudes, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosCrudosValidos, reporteId: 'no-es-un-uuid' }, organizacionId }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
