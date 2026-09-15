import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosProductoComercio,
  IRepositorioProductosComercio,
  ProductoComercio,
  ProductoComercioActual,
} from '@dominio/puertos/IRepositorioProductosComercio';

const SELECT_PRODUCTO = {
  id: true,
  comercioId: true,
  nombre: true,
  descripcion: true,
  categoria: true,
  precio: true,
  createdAt: true,
} as const;

function aProductoComercio(fila: {
  id: string;
  comercioId: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: { toString(): string } | null;
  createdAt: Date;
}): ProductoComercio {
  return {
    id: fila.id,
    comercioId: fila.comercioId,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    categoria: fila.categoria,
    precio: fila.precio === null ? null : Number(fila.precio),
    createdAt: fila.createdAt,
  };
}

@injectable()
export class PrismaProductosComercioRepositorio implements IRepositorioProductosComercio {
  async crear(comercioId: string, datos: DatosProductoComercio): Promise<ProductoComercio> {
    const creado = await prisma.productoComercio.create({
      data: { comercioId, ...datos },
      select: SELECT_PRODUCTO,
    });
    return aProductoComercio(creado);
  }

  async obtenerActual(id: string): Promise<ProductoComercioActual | null> {
    return prisma.productoComercio.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, comercioId: true },
    });
  }

  async actualizar(id: string, comercioId: string, datos: DatosProductoComercio): Promise<ProductoComercio | null> {
    const resultado = await prisma.productoComercio.updateMany({
      where: { id, comercioId, deletedAt: null },
      data: datos,
    });
    if (resultado.count === 0) return null;

    // `updateMany` no devuelve la fila actualizada — se vuelve a leer, mismo
    // criterio que `PrismaProductosVeterinarioRepositorio.actualizar`.
    const actualizado = await prisma.productoComercio.findUniqueOrThrow({
      where: { id },
      select: SELECT_PRODUCTO,
    });
    return aProductoComercio(actualizado);
  }

  async darDeBaja(id: string, comercioId: string): Promise<boolean> {
    const resultado = await prisma.productoComercio.updateMany({
      where: { id, comercioId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return resultado.count > 0;
  }
}
