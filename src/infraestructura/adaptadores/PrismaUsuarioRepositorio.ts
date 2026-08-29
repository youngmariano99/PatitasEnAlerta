import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import { MARCADOR_CREDENCIAL_GESTIONADA_POR_SUPABASE } from '@infraestructura/adaptadores/marcadorCredencialSupabase';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import { Usuario } from '@dominio/entidades/Usuario';

@injectable()
export class PrismaUsuarioRepositorio implements IRepositorioUsuarios {
  async existePorEmailActivo(email: string): Promise<boolean> {
    const usuario = await prisma.usuario.findFirst({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    return usuario !== null;
  }

  async crear(usuario: Usuario): Promise<Usuario> {
    const creado = await prisma.usuario.create({
      data: {
        id: usuario.id,
        email: usuario.email,
        passwordHash: MARCADOR_CREDENCIAL_GESTIONADA_POR_SUPABASE,
        rolId: usuario.rolId,
      },
      select: { id: true, email: true, rolId: true },
    });

    return Usuario.registrarDueño(creado.id, creado.email);
  }
}
