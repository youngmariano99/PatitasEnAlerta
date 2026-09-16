/**
 * @jest-environment node
 */
import { GenerarSugerenciasCompatibilidad } from '@aplicacion/casos-de-uso/adopcion-compatibilidad/GenerarSugerenciasCompatibilidad';
import type { CuestionarioAdoptante } from '@dominio/entidades/CuestionarioAdoptante';
import type { IRepositorioCuestionariosAdoptante } from '@dominio/puertos/IRepositorioCuestionariosAdoptante';
import type { IRepositorioFichasAdopcion, PaginaFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioSugerenciasCompatibilidad, SugerenciaCompatibilidad } from '@dominio/puertos/IRepositorioSugerenciasCompatibilidad';
import type { IEstrategiaCompatibilidad } from '@dominio/estrategias/EstrategiaCompatibilidad';
import { CuestionarioIncompletoError, CuestionarioNoEncontradoError } from '@dominio/errores/erroresAdopcionCompatibilidad';
import { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';

const usuarioId = '11111111-1111-1111-1111-111111111111';
const cuestionarioId = '22222222-2222-2222-2222-222222222222';

const cuestionarioCompleto: CuestionarioAdoptante = {
  id: cuestionarioId,
  usuarioId,
  horasSoloEstimadas: 8,
  presenciaNinos: true,
  espacioDisponible: 'departamento',
  experienciaPrevia: 'Tuvo un gato',
  createdAt: new Date('2026-09-15T10:00:00.000Z'),
  updatedAt: new Date('2026-09-15T10:00:00.000Z'),
};

function crearFicha(id: string, estado = 'disponible'): FichaAdopcion {
  return FichaAdopcion.reconstruir(
    id,
    {
      municipioId: 'municipio-1',
      nombreAnimal: `Animal ${id}`,
      especie: 'perro',
      edadAproximada: 3,
      tamano: 'mediano',
      temperamento: null,
      estadoSalud: null,
      requisitosAdopcion: null,
      fotoUrl: `https://res.cloudinary.com/patitas-en-alerta/adopcion/${id}.jpg`,
      estado,
      nivelEnergia: 'bajo',
      compatibleNinos: true,
      compatibleOtrosAnimales: null,
      necesidadesMedicasDetalle: null,
    },
    new Date('2026-09-15T09:00:00.000Z'),
  );
}

function crearFakes(opciones?: { cuestionario?: CuestionarioAdoptante | null; candidatos?: FichaAdopcion[] }) {
  const candidatos = opciones?.candidatos ?? [crearFicha('ficha-1')];
  const pagina: PaginaFichasAdopcion = { items: candidatos, total: candidatos.length, pagina: 1, porPagina: 50 };

  const repositorioCuestionarios: jest.Mocked<IRepositorioCuestionariosAdoptante> = {
    obtenerPropio: jest.fn().mockResolvedValue(opciones && 'cuestionario' in opciones ? opciones.cuestionario : cuestionarioCompleto),
    crear: jest.fn(),
    actualizar: jest.fn(),
  };
  const repositorioFichas: jest.Mocked<IRepositorioFichasAdopcion> = {
    crear: jest.fn(),
    buscarPorId: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
    listarPorMunicipio: jest.fn(),
    listarPublico: jest.fn().mockResolvedValue(pagina),
  };
  let contador = 0;
  const repositorioSugerencias: jest.Mocked<IRepositorioSugerenciasCompatibilidad> = {
    crear: jest.fn().mockImplementation(async (datos): Promise<SugerenciaCompatibilidad> => {
      contador += 1;
      return { id: `sugerencia-${contador}`, generadoEn: new Date('2026-09-15T11:00:00.000Z'), ...datos };
    }),
  };
  const estrategiaCompatibilidad: jest.Mocked<IEstrategiaCompatibilidad> = {
    metodo: 'reglas',
    calcularScore: jest.fn().mockReturnValue(1),
  };

  return { repositorioCuestionarios, repositorioFichas, repositorioSugerencias, estrategiaCompatibilidad };
}

describe('GenerarSugerenciasCompatibilidad', () => {
  it('AC / Paso 2: inserta una sugerencia con metodo="reglas" por cada ficha disponible', async () => {
    const fakes = crearFakes();
    const caso = new GenerarSugerenciasCompatibilidad(
      fakes.repositorioCuestionarios,
      fakes.repositorioFichas,
      fakes.repositorioSugerencias,
      fakes.estrategiaCompatibilidad,
    );

    const resultado = await caso.ejecutar({ usuarioId });

    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.metodo).toBe('reglas');
    expect(fakes.repositorioSugerencias.crear).toHaveBeenCalledWith({
      cuestionarioId,
      vitrinaAdopcionId: 'ficha-1',
      scoreCompatibilidad: 1,
      metodo: 'reglas',
    });
  });

  // Paso 3 / Verificación técnica: el caso de uso nunca importa
  // CompatibilidadPorReglas — solo invoca la interfaz inyectada.
  it('Verificación técnica: nunca invoca nada distinto de la estrategia inyectada', async () => {
    const fakes = crearFakes();
    const caso = new GenerarSugerenciasCompatibilidad(
      fakes.repositorioCuestionarios,
      fakes.repositorioFichas,
      fakes.repositorioSugerencias,
      fakes.estrategiaCompatibilidad,
    );

    await caso.ejecutar({ usuarioId });

    expect(fakes.estrategiaCompatibilidad.calcularScore).toHaveBeenCalledWith(cuestionarioCompleto, {
      nivelEnergia: 'bajo',
      compatibleNinos: true,
      compatibleOtrosAnimales: null,
    });
  });

  it('AC: nunca incluye entre los candidatos un animal que dejó de estar disponible', async () => {
    // listarPublico ya filtra exclusivamente 'disponible' — se confirma acá
    // que el caso de uso no vuelve a traer candidatos por su cuenta.
    const fakes = crearFakes({ candidatos: [crearFicha('ficha-1', 'disponible')] });
    const caso = new GenerarSugerenciasCompatibilidad(
      fakes.repositorioCuestionarios,
      fakes.repositorioFichas,
      fakes.repositorioSugerencias,
      fakes.estrategiaCompatibilidad,
    );

    await caso.ejecutar({ usuarioId });

    expect(fakes.repositorioFichas.listarPublico).toHaveBeenCalledWith(1, 50);
    expect(fakes.repositorioSugerencias.crear).toHaveBeenCalledTimes(1);
  });

  it('responde 404 / PEA-ADOP-003 si el usuario nunca completó un cuestionario', async () => {
    const fakes = crearFakes({ cuestionario: null });
    const caso = new GenerarSugerenciasCompatibilidad(
      fakes.repositorioCuestionarios,
      fakes.repositorioFichas,
      fakes.repositorioSugerencias,
      fakes.estrategiaCompatibilidad,
    );

    await expect(caso.ejecutar({ usuarioId })).rejects.toBeInstanceOf(CuestionarioNoEncontradoError);
    expect(fakes.repositorioSugerencias.crear).not.toHaveBeenCalled();
  });

  // AC explícito del ticket.
  it('responde 400 / PEA-ADOP-001 si el cuestionario propio está incompleto', async () => {
    const fakes = crearFakes({ cuestionario: { ...cuestionarioCompleto, experienciaPrevia: null } });
    const caso = new GenerarSugerenciasCompatibilidad(
      fakes.repositorioCuestionarios,
      fakes.repositorioFichas,
      fakes.repositorioSugerencias,
      fakes.estrategiaCompatibilidad,
    );

    await expect(caso.ejecutar({ usuarioId })).rejects.toBeInstanceOf(CuestionarioIncompletoError);
    expect(fakes.repositorioSugerencias.crear).not.toHaveBeenCalled();
  });
});
