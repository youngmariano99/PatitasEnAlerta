import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import { MARCADOR_CREDENCIAL_GESTIONADA_POR_SUPABASE } from '@infraestructura/adaptadores/marcadorCredencialSupabase';
import type { IRepositorioMunicipios, DatosNuevoMunicipio } from '@dominio/puertos/IRepositorioMunicipios';
import {
  PerfilMunicipio,
  ROL_MUNICIPIO_ID,
  ESTADO_VERIFICACION_MUNICIPIO,
} from '@dominio/entidades/PerfilMunicipio';

@injectable()
export class PrismaMunicipioRepositorio implements IRepositorioMunicipios {
  async crear(datos: DatosNuevoMunicipio): Promise<PerfilMunicipio> {
    // Única transacción Prisma (AUTH-03, Paso 2): usuarios + perfiles_municipio
    // se confirman o se revierten juntas — nunca a medias.
    const { usuario, perfil } = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: {
          id: datos.id,
          email: datos.email,
          passwordHash: MARCADOR_CREDENCIAL_GESTIONADA_POR_SUPABASE,
          rolId: ROL_MUNICIPIO_ID,
          estadoVerificacion: ESTADO_VERIFICACION_MUNICIPIO,
        },
        select: { id: true, email: true, estadoVerificacion: true },
      });

      const perfil = await tx.perfilMunicipio.create({
        data: {
          usuarioId: usuario.id,
          nombreInstitucional: datos.nombreInstitucional,
          verificadoEn: new Date(),
        },
        select: { nombreInstitucional: true },
      });

      return { usuario, perfil };
    });

    return PerfilMunicipio.reconstruir(usuario.id, {
      email: usuario.email,
      nombreInstitucional: perfil.nombreInstitucional,
      estadoVerificacion: usuario.estadoVerificacion,
    });
  }
}
