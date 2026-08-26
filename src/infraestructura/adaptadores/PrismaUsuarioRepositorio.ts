import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import { Usuario } from '@dominio/entidades/Usuario';

// La columna `password_hash` es NOT NULL en el esquema (docs/SCHEMA.md) pero
// Supabase Auth es la única fuente real de credenciales (docs/SEED.md,
// caveat de autenticación). Nunca se guarda acá una copia ni derivado real
// de la contraseña — solo este marcador fijo, no reversible ni sensible.
const MARCADOR_CREDENCIAL_GESTIONADA_POR_SUPABASE = 'gestionado_por_supabase_auth';

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
