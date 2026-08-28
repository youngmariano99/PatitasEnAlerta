import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { CambiosMascota, IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { DatosMascota } from '@dominio/entidades/Mascota';
import { Mascota } from '@dominio/entidades/Mascota';

const SELECT_MASCOTA = {
  id: true,
  duenoId: true,
  nombre: true,
  especie: true,
  fotoUrl: true,
  raza: true,
  edadAproximada: true,
  identificacionChip: true,
} as const;

type FilaMascota = {
  id: string;
  duenoId: string;
  nombre: string;
  especie: string;
  fotoUrl: string;
  raza: string | null;
  edadAproximada: number | null;
  identificacionChip: string | null;
};

function aEntidad(fila: FilaMascota): Mascota {
  return Mascota.reconstruir(fila.id, {
    dueñoId: fila.duenoId,
    nombre: fila.nombre,
    especie: fila.especie,
    fotoUrl: fila.fotoUrl,
    raza: fila.raza,
    edadAproximada: fila.edadAproximada,
    identificacionChip: fila.identificacionChip,
  });
}

@injectable()
export class PrismaMascotaRepositorio implements IRepositorioMascotas {
  async crear(datos: DatosMascota): Promise<Mascota> {
    const creada = await prisma.mascota.create({
      data: {
        duenoId: datos.dueñoId,
        nombre: datos.nombre,
        especie: datos.especie,
        fotoUrl: datos.fotoUrl,
        raza: datos.raza,
        edadAproximada: datos.edadAproximada,
        identificacionChip: datos.identificacionChip,
      },
      select: SELECT_MASCOTA,
    });

    return aEntidad(creada);
  }

  // Soft delete: toda lectura filtra deleted_at IS NULL — una mascota dada
  // de baja tiene que dejar de existir para cualquier consulta normal sin
  // dejar de existir en la tabla (NFR Trazabilidad / auditoría).
  async buscarPorId(id: string): Promise<Mascota | null> {
    const fila = await prisma.mascota.findFirst({
      where: { id, deletedAt: null },
      select: SELECT_MASCOTA,
    });
    return fila ? aEntidad(fila) : null;
  }

  async listarPorDueño(dueñoId: string): Promise<Mascota[]> {
    const filas = await prisma.mascota.findMany({
      where: { duenoId: dueñoId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: SELECT_MASCOTA,
    });
    return filas.map(aEntidad);
  }

  async actualizar(id: string, cambios: CambiosMascota): Promise<Mascota> {
    const actualizada = await prisma.mascota.update({
      where: { id },
      data: {
        nombre: cambios.nombre,
        especie: cambios.especie,
        fotoUrl: cambios.fotoUrl,
        raza: cambios.raza,
        edadAproximada: cambios.edadAproximada,
        identificacionChip: cambios.identificacionChip,
      },
      select: SELECT_MASCOTA,
    });

    return aEntidad(actualizada);
  }

  // Nunca DELETE físico: solo marca deleted_at. La fila sigue existiendo en
  // `mascotas` para auditoría — el filtro de todas las lecturas de arriba es
  // lo único que la excluye de los listados/búsquedas normales.
  async darDeBaja(id: string): Promise<void> {
    await prisma.mascota.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
