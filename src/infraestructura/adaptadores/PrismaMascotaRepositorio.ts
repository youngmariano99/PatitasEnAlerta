import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { DatosMascota } from '@dominio/entidades/Mascota';
import { Mascota } from '@dominio/entidades/Mascota';

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
      select: {
        id: true,
        duenoId: true,
        nombre: true,
        especie: true,
        fotoUrl: true,
        raza: true,
        edadAproximada: true,
        identificacionChip: true,
      },
    });

    return Mascota.reconstruir(creada.id, {
      dueñoId: creada.duenoId,
      nombre: creada.nombre,
      especie: creada.especie,
      fotoUrl: creada.fotoUrl,
      raza: creada.raza,
      edadAproximada: creada.edadAproximada,
      identificacionChip: creada.identificacionChip,
    });
  }
}
