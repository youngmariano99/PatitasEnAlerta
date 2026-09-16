import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type {
  DatosSugerenciaCompatibilidad,
  IRepositorioSugerenciasCompatibilidad,
  SugerenciaCompatibilidad,
} from '@dominio/puertos/IRepositorioSugerenciasCompatibilidad';

const SELECT_SUGERENCIA = {
  id: true,
  cuestionarioId: true,
  vitrinaAdopcionId: true,
  scoreCompatibilidad: true,
  metodo: true,
  generadoEn: true,
} as const;

function aSugerencia(fila: {
  id: string;
  cuestionarioId: string;
  vitrinaAdopcionId: string;
  scoreCompatibilidad: { toString(): string };
  metodo: string;
  generadoEn: Date;
}): SugerenciaCompatibilidad {
  return {
    id: fila.id,
    cuestionarioId: fila.cuestionarioId,
    vitrinaAdopcionId: fila.vitrinaAdopcionId,
    scoreCompatibilidad: Number(fila.scoreCompatibilidad),
    metodo: fila.metodo,
    generadoEn: fila.generadoEn,
  };
}

@injectable()
export class PrismaSugerenciasCompatibilidadRepositorio implements IRepositorioSugerenciasCompatibilidad {
  async crear(datos: DatosSugerenciaCompatibilidad): Promise<SugerenciaCompatibilidad> {
    const creada = await prisma.sugerenciaCompatibilidad.create({
      data: datos,
      select: SELECT_SUGERENCIA,
    });
    return aSugerencia(creada);
  }
}
