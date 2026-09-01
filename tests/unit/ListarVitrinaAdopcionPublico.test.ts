/**
 * @jest-environment node
 */
import { ListarVitrinaAdopcionPublico } from '@aplicacion/casos-de-uso/municipio/ListarVitrinaAdopcionPublico';
import type { IRepositorioFichasAdopcion, PaginaFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';

const paginaVacia: PaginaFichasAdopcion = { items: [], total: 0, pagina: 1, porPagina: 50 };

function crearFakes(pagina: PaginaFichasAdopcion = paginaVacia) {
  const repositorioFichas: jest.Mocked<IRepositorioFichasAdopcion> = {
    crear: jest.fn(),
    buscarPorId: jest.fn(),
    actualizar: jest.fn(),
    darDeBaja: jest.fn(),
    listarPorMunicipio: jest.fn(),
    listarPublico: jest.fn().mockResolvedValue(pagina),
  };
  return { repositorioFichas };
}

describe('ListarVitrinaAdopcionPublico', () => {
  it('delega en el repositorio con pagina/porPagina, sin ningún filtro adicional', async () => {
    const { repositorioFichas } = crearFakes();
    const caso = new ListarVitrinaAdopcionPublico(repositorioFichas);

    await caso.ejecutar({ pagina: 2, porPagina: 20 });

    expect(repositorioFichas.listarPublico).toHaveBeenCalledWith(2, 20);
  });

  it('AC (Paso 2): aplica el tope de 50 por página aunque el llamador pida más (defensa en profundidad)', async () => {
    const { repositorioFichas } = crearFakes();
    const caso = new ListarVitrinaAdopcionPublico(repositorioFichas);

    await caso.ejecutar({ pagina: 1, porPagina: 999 });

    expect(repositorioFichas.listarPublico).toHaveBeenCalledWith(1, 50);
  });

  it('nunca pide una página menor a 1', async () => {
    const { repositorioFichas } = crearFakes();
    const caso = new ListarVitrinaAdopcionPublico(repositorioFichas);

    await caso.ejecutar({ pagina: -3, porPagina: 50 });

    expect(repositorioFichas.listarPublico).toHaveBeenCalledWith(1, 50);
  });

  it('devuelve la página tal como la entrega el repositorio', async () => {
    const ficha = FichaAdopcion.reconstruir(
      'ficha-1',
      {
        municipioId: 'municipio-1',
        nombreAnimal: 'Luna',
        especie: 'perro',
        edadAproximada: 3,
        tamano: 'mediano',
        temperamento: 'Sociable',
        estadoSalud: 'Sana, castrada',
        requisitosAdopcion: 'Visita previa',
        fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/adopcion/luna.jpg',
        estado: 'disponible',
      },
      new Date('2026-08-01T12:00:00.000Z'),
    );
    const pagina: PaginaFichasAdopcion = { items: [ficha], total: 1, pagina: 1, porPagina: 50 };
    const { repositorioFichas } = crearFakes(pagina);
    const caso = new ListarVitrinaAdopcionPublico(repositorioFichas);

    const resultado = await caso.ejecutar({ pagina: 1, porPagina: 50 });

    expect(resultado).toEqual(pagina);
  });

  it('AC (verificación técnica): no requiere ninguna verificación de sesión ni de rol (autorizar es no-op — acceso anónimo)', async () => {
    const { repositorioFichas } = crearFakes();
    const caso = new ListarVitrinaAdopcionPublico(repositorioFichas);

    await expect(caso.ejecutar({ pagina: 1, porPagina: 50 })).resolves.toEqual(paginaVacia);
  });
});
