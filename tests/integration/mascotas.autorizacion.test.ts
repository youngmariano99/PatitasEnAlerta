/**
 * @jest-environment node
 *
 * Patrón obligatorio (NFR Seguridad — Control de acceso): cada entidad con
 * dueño necesita al menos un test de integración que intente acceso cruzado
 * y espere 403 (PEA-SIS-002). Este archivo es el registro de auditoría
 * anti-IDOR/BOLA de `mascotas` — ver también
 * tests/integration/RepositorioProxy.antiIdor.test.ts para las otras
 * entidades con dueño (reportes, turnos, entradas_libreta_sanitaria), cuyos
 * casos de uso todavía no existen (Módulos 2-4 sin implementar).
 */
import { RepositorioProxy, type RepositorioConBusquedaPorId } from '@infraestructura/proxies/RepositorioProxy';
import { ActualizarMascota } from '@aplicacion/casos-de-uso/mascotas/ActualizarMascota';
import { DarDeBajaMascota } from '@aplicacion/casos-de-uso/mascotas/DarDeBajaMascota';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import { Mascota } from '@dominio/entidades/Mascota';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

const idMascota = '11111111-1111-4111-8111-111111111111';
const dueñoReal = '22222222-2222-4222-8222-222222222222';
const otroUsuario = '33333333-3333-4333-8333-333333333333';

const mascotaDeOtroDueño = Mascota.reconstruir(idMascota, {
  dueñoId: dueñoReal,
  nombre: 'Toby',
  especie: 'perro',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/toby.jpg',
  raza: null,
  edadAproximada: null,
  identificacionChip: null,
});

describe('Anti-IDOR/BOLA — mascotas', () => {
  it('un usuario no puede leer una mascota de otro dueño (403 / PEA-SIS-002)', async () => {
    const repositorioReal: RepositorioConBusquedaPorId<Mascota> = { buscarPorId: async () => mascotaDeOtroDueño };
    const proxy = new RepositorioProxy(repositorioReal, otroUsuario, (mascota, solicitanteId: string) => mascota.dueñoId === solicitanteId);

    await expect(proxy.buscarPorId(idMascota)).rejects.toMatchObject({ codigo: 'PEA-SIS-002', statusHttp: 403 });
  });

  it('un usuario no puede editar una mascota de otro dueño (403 / PEA-SIS-002)', async () => {
    const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
      crear: jest.fn(),
      buscarPorId: jest.fn().mockResolvedValue(mascotaDeOtroDueño),
      listarPorDueño: jest.fn(),
      actualizar: jest.fn(),
      darDeBaja: jest.fn(),
    };
    const almacenamientoImagenes: jest.Mocked<IAlmacenamientoImagenes> = {
      esUrlDeImagenValida: jest.fn().mockReturnValue(true),
      fueSubidaPor: jest.fn().mockResolvedValue(true),
    };
    const caso = new ActualizarMascota(repositorioMascotas, almacenamientoImagenes);

    await expect(
      caso.ejecutar({ id: idMascota, dueñoIdSolicitante: otroUsuario, nombre: 'Nombre robado' }),
    ).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
    expect(repositorioMascotas.actualizar).not.toHaveBeenCalled();
  });

  it('un usuario no puede dar de baja una mascota de otro dueño (403 / PEA-SIS-002)', async () => {
    const repositorioMascotas: jest.Mocked<IRepositorioMascotas> = {
      crear: jest.fn(),
      buscarPorId: jest.fn().mockResolvedValue(mascotaDeOtroDueño),
      listarPorDueño: jest.fn(),
      actualizar: jest.fn(),
      darDeBaja: jest.fn(),
    };
    const caso = new DarDeBajaMascota(repositorioMascotas);

    await expect(caso.ejecutar({ id: idMascota, dueñoIdSolicitante: otroUsuario })).rejects.toBeInstanceOf(
      AccesoNoAutorizadoError,
    );
    expect(repositorioMascotas.darDeBaja).not.toHaveBeenCalled();
  });
});
