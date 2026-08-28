/**
 * @jest-environment node
 */
import { ZodError } from 'zod';
import { RecuperarPassword } from '@aplicacion/casos-de-uso/auth/RecuperarPassword';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';

function crearFake(): jest.Mocked<IProveedorAutenticacion> {
  return {
    registrarCredenciales: jest.fn(),
    eliminarCredenciales: jest.fn(),
    solicitarRecuperacionPassword: jest.fn().mockResolvedValue(undefined),
  };
}

const redirectTo = 'https://patitasenalerta.test/auth/recuperar-password/nueva';

describe('RecuperarPassword', () => {
  it('normaliza el email y delega en el proveedor de autenticación con el redirectTo recibido', async () => {
    const proveedorAutenticacion = crearFake();
    const caso = new RecuperarPassword(proveedorAutenticacion);

    await caso.ejecutar({ email: '  Ana@Ejemplo.test  ', redirectTo });

    expect(proveedorAutenticacion.solicitarRecuperacionPassword).toHaveBeenCalledWith(
      'ana@ejemplo.test',
      redirectTo,
    );
  });

  it('rechaza fail-fast (Zod) un email con formato inválido, sin llamar al proveedor', async () => {
    const proveedorAutenticacion = crearFake();
    const caso = new RecuperarPassword(proveedorAutenticacion);

    await expect(caso.ejecutar({ email: 'no-es-un-email', redirectTo })).rejects.toBeInstanceOf(ZodError);
    expect(proveedorAutenticacion.solicitarRecuperacionPassword).not.toHaveBeenCalled();
  });

  it('resuelve exitosamente sin importar si el email pertenece o no a una cuenta real (anti-enumeración)', async () => {
    const proveedorAutenticacion = crearFake();
    const caso = new RecuperarPassword(proveedorAutenticacion);

    await expect(caso.ejecutar({ email: 'existe@ejemplo.test', redirectTo })).resolves.toBeUndefined();
    await expect(caso.ejecutar({ email: 'no-existe@ejemplo.test', redirectTo })).resolves.toBeUndefined();
  });
});
