import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { DatosNuevoReporte, IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { DatosReporte } from '@dominio/entidades/Reporte';
import { Reporte } from '@dominio/entidades/Reporte';

const SELECT_REPORTE = {
  id: true,
  tipo: true,
  subtipo: true,
  reportadoPor: true,
  mascotaId: true,
  descripcion: true,
  fotoUrl: true,
  latitud: true,
  longitud: true,
  estado: true,
  createdAt: true,
} as const;

type FilaReporte = {
  id: string;
  tipo: string;
  subtipo: string | null;
  reportadoPor: string;
  mascotaId: string | null;
  descripcion: string;
  fotoUrl: string;
  latitud: number;
  longitud: number;
  estado: string;
  createdAt: Date;
};

function aEntidad(fila: FilaReporte): Reporte {
  const datos: DatosReporte = {
    tipo: fila.tipo,
    subtipo: fila.subtipo,
    reportadoPor: fila.reportadoPor,
    mascotaId: fila.mascotaId,
    descripcion: fila.descripcion,
    fotoUrl: fila.fotoUrl,
    latitud: fila.latitud,
    longitud: fila.longitud,
    estado: fila.estado,
  };
  return Reporte.reconstruir(fila.id, datos, fila.createdAt);
}

@injectable()
export class PrismaReporteRepositorio implements IRepositorioReportes {
  async crear(datos: DatosNuevoReporte): Promise<Reporte> {
    const creado = await prisma.reporte.create({
      data: {
        tipo: datos.tipo,
        subtipo: datos.subtipo,
        reportadoPor: datos.reportadoPor,
        mascotaId: datos.mascotaId,
        descripcion: datos.descripcion,
        fotoUrl: datos.fotoUrl,
        latitud: datos.latitud,
        longitud: datos.longitud,
        // `estado` no se envía: la columna nace en 'reportado' por DEFAULT
        // (docs/SCHEMA.md) — este repositorio nunca decide el estado inicial.
      },
      select: SELECT_REPORTE,
    });

    return aEntidad(creado);
  }
}
