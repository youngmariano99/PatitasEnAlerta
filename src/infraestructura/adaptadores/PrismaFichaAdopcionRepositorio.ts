import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  CambiosFichaAdopcion,
  DatosNuevaFichaAdopcion,
  FiltrosListadoFichasAdopcion,
  IRepositorioFichasAdopcion,
  PaginaFichasAdopcion,
} from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { DatosFichaAdopcion } from '@dominio/entidades/FichaAdopcion';
import { FichaAdopcion } from '@dominio/entidades/FichaAdopcion';

const SELECT_FICHA = {
  id: true,
  municipioId: true,
  nombreAnimal: true,
  especie: true,
  edadAproximada: true,
  tamano: true,
  temperamento: true,
  estadoSalud: true,
  requisitosAdopcion: true,
  fotoUrl: true,
  estado: true,
  createdAt: true,
} as const;

type FilaFicha = {
  id: string;
  municipioId: string;
  nombreAnimal: string;
  especie: string;
  edadAproximada: number | null;
  tamano: string | null;
  temperamento: string | null;
  estadoSalud: string | null;
  requisitosAdopcion: string | null;
  fotoUrl: string;
  estado: string;
  createdAt: Date;
};

function aEntidad(fila: FilaFicha): FichaAdopcion {
  const datos: DatosFichaAdopcion = {
    municipioId: fila.municipioId,
    nombreAnimal: fila.nombreAnimal,
    especie: fila.especie,
    edadAproximada: fila.edadAproximada,
    tamano: fila.tamano,
    temperamento: fila.temperamento,
    estadoSalud: fila.estadoSalud,
    requisitosAdopcion: fila.requisitosAdopcion,
    fotoUrl: fila.fotoUrl,
    estado: fila.estado,
  };
  return FichaAdopcion.reconstruir(fila.id, datos, fila.createdAt);
}

@injectable()
export class PrismaFichaAdopcionRepositorio implements IRepositorioFichasAdopcion {
  async crear(datos: DatosNuevaFichaAdopcion): Promise<FichaAdopcion> {
    const creada = await prisma.vitrinaAdopcion.create({
      data: {
        municipioId: datos.municipioId,
        nombreAnimal: datos.nombreAnimal,
        especie: datos.especie,
        edadAproximada: datos.edadAproximada,
        tamano: datos.tamano,
        temperamento: datos.temperamento,
        estadoSalud: datos.estadoSalud,
        requisitosAdopcion: datos.requisitosAdopcion,
        fotoUrl: datos.fotoUrl,
        // `estado` no se envía: la columna nace en 'disponible' por DEFAULT
        // (docs/SCHEMA.md) — este repositorio nunca decide el estado inicial.
      },
      select: SELECT_FICHA,
    });

    return aEntidad(creada);
  }

  async buscarPorId(id: string): Promise<FichaAdopcion | null> {
    const fila = await prisma.vitrinaAdopcion.findFirst({
      where: { id, deletedAt: null },
      select: SELECT_FICHA,
    });
    return fila ? aEntidad(fila) : null;
  }

  async actualizar(id: string, cambios: CambiosFichaAdopcion): Promise<FichaAdopcion> {
    const actualizada = await prisma.vitrinaAdopcion.update({
      where: { id },
      data: {
        nombreAnimal: cambios.nombreAnimal,
        especie: cambios.especie,
        edadAproximada: cambios.edadAproximada,
        tamano: cambios.tamano,
        temperamento: cambios.temperamento,
        estadoSalud: cambios.estadoSalud,
        requisitosAdopcion: cambios.requisitosAdopcion,
        fotoUrl: cambios.fotoUrl,
      },
      select: SELECT_FICHA,
    });

    return aEntidad(actualizada);
  }

  async darDeBaja(id: string): Promise<FichaAdopcion> {
    // NUNCA un DELETE físico (Paso 3, docs/SCHEMA.md CHECK estado): la fila
    // sigue existiendo, solo cambia su estado.
    const dadaDeBaja = await prisma.vitrinaAdopcion.update({
      where: { id },
      data: { estado: 'baja' },
      select: SELECT_FICHA,
    });

    return aEntidad(dadaDeBaja);
  }

  async listarPorMunicipio(
    filtros: FiltrosListadoFichasAdopcion,
    pagina: number,
    porPagina: number,
  ): Promise<PaginaFichasAdopcion> {
    const where = {
      deletedAt: null,
      municipioId: filtros.municipioId,
      ...(filtros.estado ? { estado: filtros.estado } : {}),
    };

    const [filas, total] = await Promise.all([
      prisma.vitrinaAdopcion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_FICHA,
      }),
      prisma.vitrinaAdopcion.count({ where }),
    ]);

    return { items: filas.map(aEntidad), total, pagina, porPagina };
  }

  async listarPublico(pagina: number, porPagina: number): Promise<PaginaFichasAdopcion> {
    // Filtra únicamente por `estado` — en esta instancia single-tenant
    // (docs/SCHEMA.md) toda la tabla pertenece al mismo `municipio_id`, así
    // que `ix_vitrina_municipio_estado (municipio_id, estado)` sigue siendo
    // efectivo para esta consulta (Paso 2 del ticket) aunque no se filtre
    // por `municipio_id` acá: Postgres solo tiene un valor posible en esa
    // primera columna.
    const where = { deletedAt: null, estado: 'disponible' };

    const [filas, total] = await Promise.all([
      prisma.vitrinaAdopcion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_FICHA,
      }),
      prisma.vitrinaAdopcion.count({ where }),
    ]);

    return { items: filas.map(aEntidad), total, pagina, porPagina };
  }
}
