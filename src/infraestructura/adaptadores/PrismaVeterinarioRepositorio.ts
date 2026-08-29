import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import { MARCADOR_CREDENCIAL_GESTIONADA_POR_SUPABASE } from '@infraestructura/adaptadores/marcadorCredencialSupabase';
import type { IRepositorioVeterinarios, DatosNuevoVeterinario } from '@dominio/puertos/IRepositorioVeterinarios';
import { PerfilVeterinario, ROL_VETERINARIO_ID, ESTADO_VERIFICACION_PENDIENTE } from '@dominio/entidades/PerfilVeterinario';

@injectable()
export class PrismaVeterinarioRepositorio implements IRepositorioVeterinarios {
  async crear(datos: DatosNuevoVeterinario): Promise<PerfilVeterinario> {
    // Única transacción Prisma (AUTH-02, Paso 2/3): usuarios + perfiles_veterinario
    // + verificaciones se confirman o se revierten juntas — nunca a medias.
    const { usuario, perfil } = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          id: datos.id,
          email: datos.email,
          passwordHash: MARCADOR_CREDENCIAL_GESTIONADA_POR_SUPABASE,
          rolId: ROL_VETERINARIO_ID,
          estadoVerificacion: ESTADO_VERIFICACION_PENDIENTE,
        },
        select: { id: true, email: true, estadoVerificacion: true },
      });

      const perfil = await tx.perfilVeterinario.create({
        data: {
          usuarioId: usuario.id,
          matricula: datos.matricula,
          colegioEmisor: datos.colegioEmisor,
        },
        select: { matricula: true, colegioEmisor: true },
      });

      await tx.verificacion.create({
        data: { usuarioId: usuario.id, tipo: 'veterinario', estado: 'pendiente' },
      });

      return { usuario, perfil };
    });

    return PerfilVeterinario.reconstruir(usuario.id, {
      email: usuario.email,
      matricula: perfil.matricula,
      colegioEmisor: perfil.colegioEmisor,
      estadoVerificacion: usuario.estadoVerificacion,
    });
  }
}
