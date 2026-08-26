import { injectable } from 'tsyringe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  IProveedorAutenticacion,
  CredencialesRegistro,
  UsuarioAutenticado,
} from '@dominio/puertos/IProveedorAutenticacion';
import { EmailYaRegistradoError } from '@dominio/errores/erroresAutenticacion';
import { logger } from '@infraestructura/logging/logger';

const PATRON_EMAIL_YA_REGISTRADO = /already registered|already exists/i;

/**
 * Adapter (patrón Adapter) sobre el Admin API de Supabase Auth. Usa la
 * Service_Role Key exclusivamente server-side — nunca en NEXT_PUBLIC_
 * (restricción de seguridad del proyecto, ver CLAUDE.md).
 */
@injectable()
export class SupabaseAuthAdapter implements IProveedorAutenticacion {
  private readonly cliente: SupabaseClient;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const claveServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !claveServiceRole) {
      throw new Error(
        'Faltan variables de entorno de Supabase (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
      );
    }

    this.cliente = createClient(url, claveServiceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  async registrarCredenciales(datos: CredencialesRegistro): Promise<UsuarioAutenticado> {
    const { data, error } = await this.cliente.auth.admin.createUser({
      email: datos.email,
      password: datos.password,
      // La confirmación de email queda a cargo del flujo estándar configurado
      // en Supabase Auth (docs/SETUP.md, paso 3) — no se marca confirmado acá.
      email_confirm: false,
    });

    if (error) {
      if (error.status === 422 || PATRON_EMAIL_YA_REGISTRADO.test(error.message)) {
        throw new EmailYaRegistradoError();
      }
      throw new Error(`No se pudo registrar las credenciales en Supabase Auth: ${error.message}`);
    }
    if (!data.user) {
      throw new Error('Supabase Auth no devolvió un usuario tras el alta.');
    }

    return { id: data.user.id, email: data.user.email ?? datos.email };
  }

  async eliminarCredenciales(id: string): Promise<void> {
    const { error } = await this.cliente.auth.admin.deleteUser(id);
    if (error) {
      logger.error({ err: error, usuarioId: id }, 'No se pudo eliminar el usuario de Supabase Auth');
      throw new Error(error.message);
    }
  }
}
