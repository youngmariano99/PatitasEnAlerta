/**
 * @jest-environment node
 */
import { SupabaseAuthAdapter } from '@infraestructura/adaptadores/SupabaseAuthAdapter';
import { EmailYaRegistradoError } from '@dominio/errores/erroresAutenticacion';

const createUserMock = jest.fn();
const deleteUserMock = jest.fn();
const resetPasswordForEmailMock = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      admin: { createUser: createUserMock, deleteUser: deleteUserMock },
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  })),
}));

describe('SupabaseAuthAdapter', () => {
  const envOriginal = { ...process.env };

  beforeEach(() => {
    createUserMock.mockReset();
    deleteUserMock.mockReset();
    resetPasswordForEmailMock.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proyecto-test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'clave-service-role-de-prueba';
  });

  afterEach(() => {
    process.env = { ...envOriginal };
  });

  it('lanza un error claro si faltan las variables de entorno de Supabase', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => new SupabaseAuthAdapter()).toThrow(/Faltan variables de entorno de Supabase/);
  });

  it('registrarCredenciales retorna id y email cuando Supabase Auth da de alta al usuario', async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'ana@ejemplo.test' } }, error: null });
    const adapter = new SupabaseAuthAdapter();

    const resultado = await adapter.registrarCredenciales({ email: 'ana@ejemplo.test', password: 'contraseñaSegura123' });

    expect(resultado).toEqual({ id: 'auth-1', email: 'ana@ejemplo.test' });
    expect(createUserMock).toHaveBeenCalledWith({
      email: 'ana@ejemplo.test',
      password: 'contraseñaSegura123',
      email_confirm: false,
    });
  });

  it('registrarCredenciales mapea el status 422 de Supabase a EmailYaRegistradoError', async () => {
    createUserMock.mockResolvedValue({ data: { user: null }, error: { status: 422, message: 'Unprocessable' } });
    const adapter = new SupabaseAuthAdapter();

    await expect(
      adapter.registrarCredenciales({ email: 'ana@ejemplo.test', password: 'contraseñaSegura123' }),
    ).rejects.toBeInstanceOf(EmailYaRegistradoError);
  });

  it('registrarCredenciales mapea el mensaje "already registered" a EmailYaRegistradoError', async () => {
    createUserMock.mockResolvedValue({
      data: { user: null },
      error: { status: 400, message: 'User already registered' },
    });
    const adapter = new SupabaseAuthAdapter();

    await expect(
      adapter.registrarCredenciales({ email: 'ana@ejemplo.test', password: 'contraseñaSegura123' }),
    ).rejects.toBeInstanceOf(EmailYaRegistradoError);
  });

  it('registrarCredenciales relanza un error genérico ante cualquier otra falla de Supabase Auth', async () => {
    createUserMock.mockResolvedValue({ data: { user: null }, error: { status: 500, message: 'caída del servicio' } });
    const adapter = new SupabaseAuthAdapter();

    await expect(
      adapter.registrarCredenciales({ email: 'ana@ejemplo.test', password: 'contraseñaSegura123' }),
    ).rejects.toThrow(/No se pudo registrar las credenciales/);
  });

  it('registrarCredenciales falla si Supabase no devuelve error pero tampoco un usuario', async () => {
    createUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const adapter = new SupabaseAuthAdapter();

    await expect(
      adapter.registrarCredenciales({ email: 'ana@ejemplo.test', password: 'contraseñaSegura123' }),
    ).rejects.toThrow(/no devolvió un usuario/);
  });

  it('eliminarCredenciales no lanza cuando Supabase confirma el borrado', async () => {
    deleteUserMock.mockResolvedValue({ error: null });
    const adapter = new SupabaseAuthAdapter();

    await expect(adapter.eliminarCredenciales('auth-1')).resolves.toBeUndefined();
  });

  it('eliminarCredenciales loguea y relanza si Supabase falla al borrar', async () => {
    deleteUserMock.mockResolvedValue({ error: { message: 'no se pudo borrar' } });
    const adapter = new SupabaseAuthAdapter();

    await expect(adapter.eliminarCredenciales('auth-1')).rejects.toThrow('no se pudo borrar');
  });

  it('solicitarRecuperacionPassword invoca resetPasswordForEmail con el redirectTo recibido', async () => {
    resetPasswordForEmailMock.mockResolvedValue({ data: {}, error: null });
    const adapter = new SupabaseAuthAdapter();

    await adapter.solicitarRecuperacionPassword('ana@ejemplo.test', 'https://patitasenalerta.test/auth/recuperar-password/nueva');

    expect(resetPasswordForEmailMock).toHaveBeenCalledWith('ana@ejemplo.test', {
      redirectTo: 'https://patitasenalerta.test/auth/recuperar-password/nueva',
    });
  });

  it('solicitarRecuperacionPassword NUNCA rechaza, ni siquiera si Supabase devuelve un error (anti-enumeración)', async () => {
    resetPasswordForEmailMock.mockResolvedValue({ data: null, error: { message: 'rate limit exceeded' } });
    const adapter = new SupabaseAuthAdapter();

    await expect(
      adapter.solicitarRecuperacionPassword('ana@ejemplo.test', 'https://patitasenalerta.test/auth/recuperar-password/nueva'),
    ).resolves.toBeUndefined();
  });
});
