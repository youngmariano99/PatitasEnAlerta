import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosProducto,
  IRepositorioProductosVeterinario,
  PaginaProductos,
  ProductoActual,
  ProductoVeterinario,
} from '@dominio/puertos/IRepositorioProductosVeterinario';

const SELECT_PRODUCTO = {
  id: true,
  veterinarioId: true,
  nombre: true,
  descripcion: true,
  precio: true,
  stock: true,
  createdAt: true,
} as const;

function aProductoVeterinario(fila: {
  id: string;
  veterinarioId: string;
  nombre: string;
  descripcion: string | null;
  precio: { toString(): string };
  stock: number;
  createdAt: Date;
}): ProductoVeterinario {
  return {
    id: fila.id,
    veterinarioId: fila.veterinarioId,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    precio: Number(fila.precio),
    stock: fila.stock,
    createdAt: fila.createdAt,
  };
}

@injectable()
export class PrismaProductosVeterinarioRepositorio implements IRepositorioProductosVeterinario {
  async crear(veterinarioId: string, datos: DatosProducto): Promise<ProductoVeterinario> {
    const creado = await prisma.productoVeterinario.create({
      data: {
        veterinarioId,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        precio: datos.precio,
        stock: datos.stock,
      },
      select: SELECT_PRODUCTO,
    });
    return aProductoVeterinario(creado);
  }

  async obtenerActual(productoId: string): Promise<ProductoActual | null> {
    const producto = await prisma.productoVeterinario.findFirst({
      where: { id: productoId, deletedAt: null },
      select: { id: true, veterinarioId: true },
    });
    return producto;
  }

  async actualizar(productoId: string, veterinarioId: string, datos: DatosProducto): Promise<ProductoVeterinario | null> {
    const resultado = await prisma.productoVeterinario.updateMany({
      where: { id: productoId, veterinarioId, deletedAt: null },
      data: {
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        precio: datos.precio,
        stock: datos.stock,
      },
    });
    if (resultado.count === 0) return null;

    // `updateMany` no devuelve la fila actualizada — se vuelve a leer, mismo
    // criterio que `PrismaColaboracionesRepositorio.actualizarEstado`.
    const actualizado = await prisma.productoVeterinario.findUniqueOrThrow({
      where: { id: productoId },
      select: SELECT_PRODUCTO,
    });
    return aProductoVeterinario(actualizado);
  }

  async darDeBaja(productoId: string, veterinarioId: string): Promise<boolean> {
    const resultado = await prisma.productoVeterinario.updateMany({
      where: { id: productoId, veterinarioId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return resultado.count > 0;
  }

  async listarPropios(veterinarioId: string, pagina: number, porPagina: number): Promise<PaginaProductos> {
    const where = { veterinarioId, deletedAt: null };

    const [filas, total] = await Promise.all([
      prisma.productoVeterinario.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_PRODUCTO,
      }),
      prisma.productoVeterinario.count({ where }),
    ]);

    return { items: filas.map(aProductoVeterinario), total, pagina, porPagina };
  }

  async listarActivos(pagina: number, porPagina: number): Promise<PaginaProductos> {
    const where = { deletedAt: null };

    const [filas, total] = await Promise.all([
      prisma.productoVeterinario.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: SELECT_PRODUCTO,
      }),
      prisma.productoVeterinario.count({ where }),
    ]);

    return { items: filas.map(aProductoVeterinario), total, pagina, porPagina };
  }
}
