/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type {
  CambiosFichaAdopcion,
  DatosNuevaFichaAdopcion,
  FiltrosListadoFichasAdopcion,
  IRepositorioFichasAdopcion,
  PaginaFichasAdopcion,
} from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

// Importa los route handlers DESPUÉS del mock de '@supabase/ssr' — Jest
// hoistea jest.mock, así que el orden de imports acá abajo no afecta el
// mockeo real (mismo criterio que tests/integration/reportes.crear.test.ts).
import { GET, POST } from '@app/api/municipio/adopciones/route';
import { DELETE, PATCH } from '@app/api/municipio/adopciones/[id]/route';

class RepositorioFichasFalso implements IRepositorioFichasAdopcion {
  public fichas = new Map<string, FichaAdopcion>();
  private contador = 0;

  async crear(datos: DatosNuevaFichaAdopcion): Promise<FichaAdopcion> {
    this.contador += 1;
    const ficha = FichaAdopcion.reconstruir(
      `ficha-${this.contador}`,
      { ...datos, estado: 'disponible' },
      new Date('2026-09-01T09:00:00.000Z'),
    );
    this.fichas.set(ficha.id, ficha);
    return ficha;
  }

  async buscarPorId(id: string): Promise<FichaAdopcion | null> {
    return this.fichas.get(id) ?? null;
  }

  async actualizar(id: string, cambios: CambiosFichaAdopcion): Promise<FichaAdopcion> {
    const existente = this.fichas.get(id)!;
    const actualizada = FichaAdopcion.reconstruir(
      id,
      {
        municipioId: existente.municipioId,
        nombreAnimal: cambios.nombreAnimal ?? existente.nombreAnimal,
        especie: cambios.especie ?? existente.especie,
        edadAproximada: cambios.edadAproximada ?? existente.edadAproximada,
        tamano: cambios.tamano ?? existente.tamano,
        temperamento: cambios.temperamento ?? existente.temperamento,
        estadoSalud: cambios.estadoSalud ?? existente.estadoSalud,
        requisitosAdopcion: cambios.requisitosAdopcion ?? existente.requisitosAdopcion,
        fotoUrl: cambios.fotoUrl ?? existente.fotoUrl,
        estado: existente.estado,
      },
      existente.createdAt,
    );
    this.fichas.set(id, actualizada);
    return actualizada;
  }

  async darDeBaja(id: string): Promise<FichaAdopcion> {
    const existente = this.fichas.get(id)!;
    const dadaDeBaja = FichaAdopcion.reconstruir(
      id,
      {
        municipioId: existente.municipioId,
        nombreAnimal: existente.nombreAnimal,
        especie: existente.especie,
        edadAproximada: existente.edadAproximada,
        tamano: existente.tamano,
        temperamento: existente.temperamento,
        estadoSalud: existente.estadoSalud,
        requisitosAdopcion: existente.requisitosAdopcion,
        fotoUrl: existente.fotoUrl,
        estado: 'baja',
      },
      existente.createdAt,
    );
    this.fichas.set(id, dadaDeBaja);
    return dadaDeBaja;
  }

  async listarPorMunicipio(
    filtros: FiltrosListadoFichasAdopcion,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaFichasAdopcion> {
    const items = Array.from(this.fichas.values()).filter(
      (f) => f.municipioId === filtros.municipioId && (!filtros.estado || f.estado === filtros.estado),
    );
    return { items, total: items.length, pagina, porPagina };
  }

  async listarPublico(pagina: number, porPagina: number): Promise<PaginaFichasAdopcion> {
    const items = Array.from(this.fichas.values()).filter((f) => f.estado === 'disponible');
    return { items, total: items.length, pagina, porPagina };
  }
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  public rol = 'municipio';

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return { id: usuarioId, email: 'municipio@ejemplo.test', rol: this.rol, estadoVerificacion: 'verificado', verificadoEn: null };
  }
}

function autenticarComo(usuarioId: string | null) {
  getUserMock.mockResolvedValue(
    usuarioId ? { data: { user: { id: usuarioId } }, error: null } : { data: { user: null }, error: { message: 'sin sesión' } },
  );
}

function crearRequest(url: string, metodo: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method: metodo,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const fichaValida = {
  nombreAnimal: 'Luna',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/adopciones/luna.jpg',
};

describe('CRUD de vitrina_adopcion (Módulo 3) — restringido a municipio', () => {
  let repositorioFichas: RepositorioFichasFalso;
  let repositorioPerfil: RepositorioPerfilFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    repositorioFichas = new RepositorioFichasFalso();
    repositorioPerfil = new RepositorioPerfilFalso();
    container.reset();
    container.registerInstance<IRepositorioFichasAdopcion>('IRepositorioFichasAdopcion', repositorioFichas);
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', repositorioPerfil);
  });

  describe('POST /api/municipio/adopciones (PublicarFichaAdopcion)', () => {
    it('rechaza sin sesión (401 / PEA-SIS-001)', async () => {
      autenticarComo(null);

      const respuesta = await POST(crearRequest('http://localhost/api/municipio/adopciones', 'POST', fichaValida));

      expect(respuesta.status).toBe(401);
    });

    // Paso 4 del checklist + AC explícito.
    it.each(['dueño', 'veterinario'])('rechaza con 403 / PEA-MUN-005 para un usuario con rol %s', async (rol) => {
      autenticarComo('usuario-1');
      repositorioPerfil.rol = rol;

      const respuesta = await POST(crearRequest('http://localhost/api/municipio/adopciones', 'POST', fichaValida));

      expect(respuesta.status).toBe(403);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-MUN-005');
      expect(repositorioFichas.fichas.size).toBe(0);
    });

    // Paso 2 / AC explícito.
    it.each(['nombreAnimal', 'especie', 'fotoUrl'])('rechaza con 400 si falta "%s"', async (campo) => {
      autenticarComo('municipio-1');
      const sinCampo = { ...fichaValida };
      delete (sinCampo as Record<string, unknown>)[campo];

      const respuesta = await POST(crearRequest('http://localhost/api/municipio/adopciones', 'POST', sinCampo));

      expect(respuesta.status).toBe(400);
      expect(repositorioFichas.fichas.size).toBe(0);
    });

    it('publica la ficha con estado inicial "disponible"', async () => {
      autenticarComo('municipio-1');

      const respuesta = await POST(crearRequest('http://localhost/api/municipio/adopciones', 'POST', fichaValida));

      expect(respuesta.status).toBe(201);
      const cuerpo = await respuesta.json();
      expect(cuerpo.estado).toBe('disponible');
      expect(cuerpo.municipioId).toBe('municipio-1');
    });
  });

  describe('PATCH /api/municipio/adopciones/[id] (ActualizarFichaAdopcion)', () => {
    async function crearFichaDePrueba() {
      autenticarComo('municipio-1');
      const respuesta = await POST(crearRequest('http://localhost/api/municipio/adopciones', 'POST', fichaValida));
      return (await respuesta.json()).id as string;
    }

    it.each(['dueño', 'veterinario'])('rechaza con 403 / PEA-MUN-005 para un usuario con rol %s', async (rol) => {
      const id = await crearFichaDePrueba();
      repositorioPerfil.rol = rol;

      const respuesta = await PATCH(
        crearRequest(`http://localhost/api/municipio/adopciones/${id}`, 'PATCH', { nombreAnimal: 'Luna II' }),
        { params: { id } },
      );

      expect(respuesta.status).toBe(403);
    });

    it('rechaza un id inexistente (404 / PEA-MUN-008)', async () => {
      autenticarComo('municipio-1');

      const respuesta = await PATCH(
        crearRequest('http://localhost/api/municipio/adopciones/no-existe', 'PATCH', { nombreAnimal: 'Luna II' }),
        { params: { id: 'no-existe' } },
      );

      expect(respuesta.status).toBe(404);
      const cuerpo = await respuesta.json();
      expect(cuerpo.codigo).toBe('PEA-MUN-008');
    });

    it('actualiza los campos provistos', async () => {
      const id = await crearFichaDePrueba();

      const respuesta = await PATCH(
        crearRequest(`http://localhost/api/municipio/adopciones/${id}`, 'PATCH', { temperamento: 'Muy juguetón' }),
        { params: { id } },
      );

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.temperamento).toBe('Muy juguetón');
      expect(cuerpo.nombreAnimal).toBe('Luna');
    });
  });

  describe('DELETE /api/municipio/adopciones/[id] (DarDeBajaFichaAdopcion)', () => {
    async function crearFichaDePrueba() {
      autenticarComo('municipio-1');
      const respuesta = await POST(crearRequest('http://localhost/api/municipio/adopciones', 'POST', fichaValida));
      return (await respuesta.json()).id as string;
    }

    it.each(['dueño', 'veterinario'])('rechaza con 403 / PEA-MUN-005 para un usuario con rol %s', async (rol) => {
      const id = await crearFichaDePrueba();
      repositorioPerfil.rol = rol;

      const respuesta = await DELETE(crearRequest(`http://localhost/api/municipio/adopciones/${id}`, 'DELETE'), {
        params: { id },
      });

      expect(respuesta.status).toBe(403);
    });

    // AC explícito: nunca DELETE físico — el estado pasa a 'baja'.
    it('AC: da de baja la ficha (estado="baja"), la fila sigue existiendo', async () => {
      const id = await crearFichaDePrueba();

      const respuesta = await DELETE(crearRequest(`http://localhost/api/municipio/adopciones/${id}`, 'DELETE'), {
        params: { id },
      });

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.estado).toBe('baja');
      // La fila sigue en el repositorio (no fue eliminada físicamente).
      expect(repositorioFichas.fichas.has(id)).toBe(true);
      expect(repositorioFichas.fichas.get(id)!.estado).toBe('baja');
    });

    it('rechaza un id inexistente (404 / PEA-MUN-008)', async () => {
      autenticarComo('municipio-1');

      const respuesta = await DELETE(crearRequest('http://localhost/api/municipio/adopciones/no-existe', 'DELETE'), {
        params: { id: 'no-existe' },
      });

      expect(respuesta.status).toBe(404);
    });
  });

  describe('GET /api/municipio/adopciones (ListarFichasAdopcion — panel)', () => {
    it.each(['dueño', 'veterinario'])('rechaza con 403 / PEA-MUN-005 para un usuario con rol %s', async (rol) => {
      autenticarComo('usuario-1');
      repositorioPerfil.rol = rol;

      const respuesta = await GET(crearRequest('http://localhost/api/municipio/adopciones', 'GET'));

      expect(respuesta.status).toBe(403);
    });

    it('lista todas las fichas propias, sin importar el estado', async () => {
      autenticarComo('municipio-1');
      await POST(crearRequest('http://localhost/api/municipio/adopciones', 'POST', fichaValida));
      const otraCreada = await POST(
        crearRequest('http://localhost/api/municipio/adopciones', 'POST', { ...fichaValida, nombreAnimal: 'Rocky' }),
      );
      const idBaja = (await otraCreada.json()).id as string;
      await DELETE(crearRequest(`http://localhost/api/municipio/adopciones/${idBaja}`, 'DELETE'), { params: { id: idBaja } });

      const respuesta = await GET(crearRequest('http://localhost/api/municipio/adopciones', 'GET'));

      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.total).toBe(2);
      expect(cuerpo.items.map((f: { estado: string }) => f.estado).sort()).toEqual(['baja', 'disponible']);
    });
  });
});
