/**
 * @jest-environment node
 */
import { PublicarCurso } from '@aplicacion/casos-de-uso/foros-cursos/PublicarCurso';
import type { Curso, IRepositorioCursos } from '@dominio/puertos/IRepositorioCursos';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const usuarioId = '11111111-1111-1111-1111-111111111111';

const datosValidos = {
  titulo: 'Tenencia responsable básica',
  descripcion: '<script>alert(1)</script>Curso introductorio orientado a tutores de mascotas.',
  contenidoUrl: 'https://cdn.patitasenalerta.test/cursos/1',
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: usuarioId, email: 'organizacion@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: new Date() };
}

function crearFakes(opciones?: { rol?: string }) {
  const cursoCreado: Curso = {
    id: 'curso-1',
    publicadoPor: usuarioId,
    titulo: datosValidos.titulo,
    descripcion: 'Curso introductorio orientado a tutores de mascotas.',
    contenidoUrl: datosValidos.contenidoUrl,
    createdAt: new Date('2026-09-14T10:00:00.000Z'),
  };
  const repositorioCursos: jest.Mocked<IRepositorioCursos> = {
    crear: jest.fn().mockResolvedValue(cursoCreado),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'organizacion')),
  };
  return { repositorioCursos, repositorioPerfil, cursoCreado };
}

describe('PublicarCurso', () => {
  it.each(['organizacion', 'municipio'])('Paso 1: publica el curso cuando quien invoca tiene rol %s', async (rol) => {
    const { repositorioCursos, repositorioPerfil } = crearFakes({ rol });
    const caso = new PublicarCurso(repositorioCursos, repositorioPerfil);

    const resultado = await caso.ejecutar({ datosCrudos: datosValidos, usuarioId });

    expect(resultado.publicadoPor).toBe(usuarioId);
    expect(repositorioCursos.crear).toHaveBeenCalledWith(usuarioId, {
      titulo: datosValidos.titulo,
      descripcion: 'Curso introductorio orientado a tutores de mascotas.',
      contenidoUrl: datosValidos.contenidoUrl,
    });
  });

  it('Paso 2: rechaza con Zod (400) un contenidoUrl mal formado', async () => {
    const { repositorioCursos, repositorioPerfil } = crearFakes();
    const caso = new PublicarCurso(repositorioCursos, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosValidos, contenidoUrl: 'no-es-una-url' }, usuarioId }),
    ).rejects.toThrow();
    expect(repositorioCursos.crear).not.toHaveBeenCalled();
  });

  it('Paso 3: sanitiza la descripción con DOMPurify antes de persistir, despojando cualquier etiqueta HTML', async () => {
    const { repositorioCursos, repositorioPerfil } = crearFakes();
    const caso = new PublicarCurso(repositorioCursos, repositorioPerfil);

    await caso.ejecutar({ datosCrudos: datosValidos, usuarioId });

    const [, datosEnviados] = repositorioCursos.crear.mock.calls[0]!;
    expect(datosEnviados.descripcion).not.toContain('<script>');
    expect(datosEnviados.descripcion).toBe('Curso introductorio orientado a tutores de mascotas.');
  });

  it.each(['dueño', 'veterinario', 'rescatista', 'comerciante', 'administrador'])(
    'Paso 4 / AC: rechaza con 403 / PEA-SIS-002 a un usuario con rol %s',
    async (rol) => {
      const { repositorioCursos, repositorioPerfil } = crearFakes({ rol });
      const caso = new PublicarCurso(repositorioCursos, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: datosValidos, usuarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
      expect(repositorioCursos.crear).not.toHaveBeenCalled();
    },
  );
});
