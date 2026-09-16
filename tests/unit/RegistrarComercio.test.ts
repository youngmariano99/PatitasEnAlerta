/**
 * @jest-environment node
 */
import { RegistrarComercio } from '@aplicacion/casos-de-uso/comercios/RegistrarComercio';
import type { Comercio, IRepositorioComercios } from '@dominio/puertos/IRepositorioComercios';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import { ComercioTipoInvalidoError } from '@dominio/errores/erroresComercios';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';

const usuarioId = '11111111-1111-1111-1111-111111111111';

const datosValidos = {
  nombreComercio: 'Pet Shop Pringles',
  tipoComercio: 'pet_shop',
  direccion: 'Av. San Martín 500',
  latitud: -37.9989,
  longitud: -61.3565,
};

function crearPerfil(rol: string): ResumenPerfilPropio {
  return { id: usuarioId, email: 'comercio@ejemplo.test', rol, estadoVerificacion: 'verificado', verificadoEn: new Date() };
}

function crearFakes(opciones?: { rol?: string }) {
  const comercioCreado: Comercio = {
    id: 'comercio-1',
    usuarioId,
    nombreComercio: datosValidos.nombreComercio,
    tipoComercio: datosValidos.tipoComercio,
    direccion: datosValidos.direccion,
    latitud: datosValidos.latitud,
    longitud: datosValidos.longitud,
    estadoVerificacion: 'pendiente',
    createdAt: new Date('2026-09-14T10:00:00.000Z'),
  };
  const repositorioComercios: jest.Mocked<IRepositorioComercios> = {
    crear: jest.fn().mockResolvedValue(comercioCreado),
    obtenerPropio: jest.fn(),
    listarVerificados: jest.fn(),
  };
  const repositorioPerfil: jest.Mocked<IRepositorioPerfil> = {
    obtenerPerfilPropio: jest.fn().mockResolvedValue(crearPerfil(opciones?.rol ?? 'comerciante')),
  };
  return { repositorioComercios, repositorioPerfil, comercioCreado };
}

describe('RegistrarComercio', () => {
  it('Paso 2: registra el comercio con usuarioId de la sesión, en estado pendiente', async () => {
    const { repositorioComercios, repositorioPerfil, comercioCreado } = crearFakes();
    const caso = new RegistrarComercio(repositorioComercios, repositorioPerfil);

    const resultado = await caso.ejecutar({ datosCrudos: datosValidos, usuarioId });

    expect(resultado.estadoVerificacion).toBe('pendiente');
    expect(repositorioComercios.crear).toHaveBeenCalledWith(usuarioId, {
      nombreComercio: datosValidos.nombreComercio,
      tipoComercio: datosValidos.tipoComercio,
      direccion: datosValidos.direccion,
      latitud: datosValidos.latitud,
      longitud: datosValidos.longitud,
    });
    expect(comercioCreado.estadoVerificacion).toBe('pendiente');
  });

  it('AC / Paso 3: rechaza con 400 / PEA-COM-002 un tipo_comercio fuera del catálogo', async () => {
    const { repositorioComercios, repositorioPerfil } = crearFakes();
    const caso = new RegistrarComercio(repositorioComercios, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosValidos, tipoComercio: 'veterinaria_grande' }, usuarioId }),
    ).rejects.toBeInstanceOf(ComercioTipoInvalidoError);
    expect(repositorioComercios.crear).not.toHaveBeenCalled();
  });

  it('rechaza con PEA-COM-002 cuando falta tipo_comercio', async () => {
    const { repositorioComercios, repositorioPerfil } = crearFakes();
    const caso = new RegistrarComercio(repositorioComercios, repositorioPerfil);
    const sinTipo: Record<string, unknown> = { ...datosValidos };
    delete sinTipo.tipoComercio;

    await expect(caso.ejecutar({ datosCrudos: sinTipo, usuarioId })).rejects.toBeInstanceOf(ComercioTipoInvalidoError);
  });

  it('rechaza con el genérico PEA-SIS-005 cuando falla un campo distinto de tipo_comercio', async () => {
    const { repositorioComercios, repositorioPerfil } = crearFakes();
    const caso = new RegistrarComercio(repositorioComercios, repositorioPerfil);

    await expect(
      caso.ejecutar({ datosCrudos: { ...datosValidos, nombreComercio: '' }, usuarioId }),
    ).rejects.toBeInstanceOf(PayloadInvalidoError);
    expect(repositorioComercios.crear).not.toHaveBeenCalled();
  });

  it.each(['dueño', 'veterinario', 'rescatista', 'organizacion', 'municipio', 'administrador'])(
    'Verificación técnica: rechaza con 403 / PEA-SIS-002 a un usuario con rol %s',
    async (rol) => {
      const { repositorioComercios, repositorioPerfil } = crearFakes({ rol });
      const caso = new RegistrarComercio(repositorioComercios, repositorioPerfil);

      await expect(caso.ejecutar({ datosCrudos: datosValidos, usuarioId })).rejects.toBeInstanceOf(AccesoNoAutorizadoError);
      expect(repositorioComercios.crear).not.toHaveBeenCalled();
    },
  );
});
