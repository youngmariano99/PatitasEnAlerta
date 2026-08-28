/**
 * @jest-environment node
 *
 * Paso 4 del ticket AUTH-06: compara la respuesta para un email existente y
 * uno inexistente y verifica que sea idéntica (anti-enumeración).
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { POST } from '@app/api/auth/recuperar-password/route';

class ProveedorAutenticacionFalso implements IProveedorAutenticacion {
  registrarCredenciales(): never {
    throw new Error('no usado en este test');
  }

  eliminarCredenciales(): never {
    throw new Error('no usado en este test');
  }

  async solicitarRecuperacionPassword(email: string): Promise<void> {
    // Simula exactamente lo que hace Supabase Auth: nunca revela si el
    // email existe o no, ni con éxito ni con error — para "existe@..." y
    // "no-existe@..." el comportamiento observable desde afuera es idéntico.
    if (email === 'provoca-error-interno@ejemplo.test') {
      throw new Error('falla interna inesperada del proveedor');
    }
  }
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/recuperar-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/recuperar-password (AUTH-06, anti-enumeración)', () => {
  beforeEach(() => {
    container.reset();
    container.registerSingleton<IProveedorAutenticacion>('IProveedorAutenticacion', ProveedorAutenticacionFalso);
  });

  it('responde exactamente igual (status y body) para un email registrado y uno no registrado', async () => {
    const respuestaExistente = await POST(crearRequest({ email: 'existe@ejemplo.test' }));
    const respuestaInexistente = await POST(crearRequest({ email: 'no-existe@ejemplo.test' }));

    expect(respuestaExistente.status).toBe(respuestaInexistente.status);
    expect(await respuestaExistente.json()).toEqual(await respuestaInexistente.json());
  });

  it('responde igual que el camino feliz incluso si el proveedor falla de forma inesperada (defensa en profundidad)', async () => {
    const respuestaOk = await POST(crearRequest({ email: 'existe@ejemplo.test' }));
    const respuestaConFallaInterna = await POST(crearRequest({ email: 'provoca-error-interno@ejemplo.test' }));

    expect(respuestaConFallaInterna.status).toBe(respuestaOk.status);
    expect(await respuestaConFallaInterna.json()).toEqual(await respuestaOk.json());
  });

  it('rechaza con 400 un email con formato inválido (no es un vector de enumeración: aplica igual a cualquier string mal formado)', async () => {
    const respuesta = await POST(crearRequest({ email: 'no-es-un-email' }));

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.codigo).toBe('PEA-SIS-005');
  });
});
