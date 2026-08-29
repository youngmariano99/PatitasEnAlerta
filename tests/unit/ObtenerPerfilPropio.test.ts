/**
 * @jest-environment node
 */
import { ObtenerPerfilPropio } from '@aplicacion/casos-de-uso/perfil/ObtenerPerfilPropio';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';

function crearFake(perfil: ResumenPerfilPropio | null): jest.Mocked<IRepositorioPerfil> {
  return { obtenerPerfilPropio: jest.fn().mockResolvedValue(perfil) };
}

describe('ObtenerPerfilPropio', () => {
  it('retorna el perfil del usuario autenticado', async () => {
    const perfil: ResumenPerfilPropio = {
      id: 'vet-1',
      email: 'vet@ejemplo.test',
      rol: 'veterinario',
      estadoVerificacion: 'pendiente',
      verificadoEn: null,
    };
    const repositorioPerfil = crearFake(perfil);
    const caso = new ObtenerPerfilPropio(repositorioPerfil);

    const resultado = await caso.ejecutar('vet-1');

    expect(resultado).toEqual(perfil);
    expect(repositorioPerfil.obtenerPerfilPropio).toHaveBeenCalledWith('vet-1');
  });

  it('lanza un error si la sesión apunta a un usuario sin fila activa (caso anómalo)', async () => {
    const repositorioPerfil = crearFake(null);
    const caso = new ObtenerPerfilPropio(repositorioPerfil);

    await expect(caso.ejecutar('vet-inexistente')).rejects.toThrow(
      'No se encontró un usuario activo para la sesión autenticada.',
    );
  });
});
