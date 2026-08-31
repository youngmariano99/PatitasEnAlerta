/**
 * @jest-environment node
 */
import { crearPipelineValidacionReporte } from '@aplicacion/pipelines/ValidacionReporte';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import {
  CategoriaReporteObligatoriaError,
  FotoReporteObligatoriaError,
  GeolocalizacionNoDisponibleError,
  LimiteDeReportesExcedidoError,
} from '@dominio/errores/erroresReportes';
import { PayloadInvalidoError } from '@dominio/errores/erroresAutenticacion';

function crearFakes(opciones?: { permitirTasa?: boolean; fotoValida?: boolean }) {
  const controlDeTasa: jest.Mocked<IControlDeTasa> = {
    permitir: jest.fn().mockResolvedValue(opciones?.permitirTasa ?? true),
  };
  const almacenamientoImagenes: jest.Mocked<IAlmacenamientoImagenes> = {
    esUrlDeImagenValida: jest.fn().mockReturnValue(opciones?.fotoValida ?? true),
  };
  return { controlDeTasa, almacenamientoImagenes };
}

const datosValidos = {
  tipo: 'perdido' as const,
  descripcion: 'Se perdió cerca de la plaza.',
  fotoUrl: 'https://res.cloudinary.com/patitas-en-alerta/image/upload/v1/reportes/toby.jpg',
  latitud: -37.9989,
  longitud: -61.3565,
};

describe('pipeline ValidacionReporte (Chain of Responsibility)', () => {
  it('arma el comando completo cuando los cuatro eslabones aprueban', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });

    const resultado = await pipeline.manejar({ datosCrudos: datosValidos, reportadoPor: 'usuario-1' }, datosValidos);

    expect(resultado).toEqual({ ...datosValidos, reportadoPor: 'usuario-1' });
    expect(controlDeTasa.permitir).toHaveBeenCalledWith('usuario-1');
    expect(almacenamientoImagenes.esUrlDeImagenValida).toHaveBeenCalledWith(datosValidos.fotoUrl);
  });

  it('ValidadorEsquemaZod corta la cadena con PEA-REP-001 si falta la categoría, antes de invocar cualquier otro eslabón', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tipo: _tipo, ...sinTipo } = datosValidos;

    await expect(pipeline.manejar({ datosCrudos: sinTipo, reportadoPor: 'usuario-1' }, sinTipo)).rejects.toBeInstanceOf(
      CategoriaReporteObligatoriaError,
    );
    expect(controlDeTasa.permitir).not.toHaveBeenCalled();
    expect(almacenamientoImagenes.esUrlDeImagenValida).not.toHaveBeenCalled();
  });

  it('ValidadorEsquemaZod rechaza un tipo fuera de TIPOS_REPORTE_SOPORTADOS con PEA-REP-001', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
    const tipoNoSoportado = { ...datosValidos, tipo: 'urgencia_vial' };

    await expect(
      pipeline.manejar({ datosCrudos: tipoNoSoportado, reportadoPor: 'usuario-1' }, tipoNoSoportado),
    ).rejects.toBeInstanceOf(CategoriaReporteObligatoriaError);
  });

  it('ValidadorEsquemaZod rechaza tipo="problematica" sin subtipo con PEA-REP-001 (REP-03)', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
    const sinSubtipo = { ...datosValidos, tipo: 'problematica' };

    await expect(
      pipeline.manejar({ datosCrudos: sinSubtipo, reportadoPor: 'usuario-1' }, sinSubtipo),
    ).rejects.toBeInstanceOf(CategoriaReporteObligatoriaError);
    expect(controlDeTasa.permitir).not.toHaveBeenCalled();
  });

  it('ValidadorEsquemaZod rechaza tipo="problematica" con un subtipo fuera del CHECK con PEA-REP-001', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
    const subtipoInvalido = { ...datosValidos, tipo: 'problematica', subtipo: 'incendio' };

    await expect(
      pipeline.manejar({ datosCrudos: subtipoInvalido, reportadoPor: 'usuario-1' }, subtipoInvalido),
    ).rejects.toBeInstanceOf(CategoriaReporteObligatoriaError);
  });

  it.each(['animal_suelto', 'foco_sanitario', 'accidente_vial'] as const)(
    'acepta tipo="problematica" con subtipo="%s" válido y fuerza mascotaId ausente',
    async (subtipo) => {
      const { controlDeTasa, almacenamientoImagenes } = crearFakes();
      const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
      const problematica = { ...datosValidos, tipo: 'problematica', subtipo };

      const resultado = await pipeline.manejar({ datosCrudos: problematica, reportadoPor: 'vecino-1' }, problematica);

      expect(resultado).toEqual({ ...problematica, reportadoPor: 'vecino-1' });
    },
  );

  it('acepta tipo="encontrado" (mismo pipeline reutilizado, REP-02) y propaga especie', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
    const encontrado = { ...datosValidos, tipo: 'encontrado', especie: 'perro' };

    const resultado = await pipeline.manejar({ datosCrudos: encontrado, reportadoPor: 'vecino-1' }, encontrado);

    expect(resultado).toEqual({ ...encontrado, reportadoPor: 'vecino-1' });
  });

  it('acepta tipo="encontrado" sin mascotaId ni especie (vecino sin mascota propia registrada)', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
    const encontrado = { ...datosValidos, tipo: 'encontrado' };

    const resultado = await pipeline.manejar({ datosCrudos: encontrado, reportadoPor: 'vecino-1' }, encontrado);

    expect(resultado.mascotaId).toBeUndefined();
    expect(resultado.especie).toBeUndefined();
  });

  it('ValidadorEsquemaZod corta la cadena con PEA-REP-002 si falta la foto', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fotoUrl: _fotoUrl, ...sinFoto } = datosValidos;

    await expect(pipeline.manejar({ datosCrudos: sinFoto, reportadoPor: 'usuario-1' }, sinFoto)).rejects.toBeInstanceOf(
      FotoReporteObligatoriaError,
    );
    expect(controlDeTasa.permitir).not.toHaveBeenCalled();
  });

  it('ValidadorEsquemaZod cae en PEA-SIS-005 genérico para un campo sin código propio (descripción vacía)', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
    const sinDescripcion = { ...datosValidos, descripcion: '' };

    await expect(
      pipeline.manejar({ datosCrudos: sinDescripcion, reportadoPor: 'usuario-1' }, sinDescripcion),
    ).rejects.toBeInstanceOf(PayloadInvalidoError);
  });

  it('ValidadorRateLimit corta la cadena con PEA-REP-004 sin llegar a Cloudinary/geolocalización', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes({ permitirTasa: false });
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });

    await expect(
      pipeline.manejar({ datosCrudos: datosValidos, reportadoPor: 'usuario-1' }, datosValidos),
    ).rejects.toBeInstanceOf(LimiteDeReportesExcedidoError);
    expect(almacenamientoImagenes.esUrlDeImagenValida).not.toHaveBeenCalled();
  });

  it('ValidadorContenidoImagen corta la cadena con PEA-REP-002 si la fotoUrl no pertenece a nuestra cuenta de Cloudinary', async () => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes({ fotoValida: false });
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });

    await expect(
      pipeline.manejar({ datosCrudos: datosValidos, reportadoPor: 'usuario-1' }, datosValidos),
    ).rejects.toBeInstanceOf(FotoReporteObligatoriaError);
  });

  it.each([
    ['fuera de rango', { latitud: 200, longitud: -61.3565 }],
    ['null island (0,0)', { latitud: 0, longitud: 0 }],
  ])('ValidadorGeolocalizacion corta la cadena con PEA-REP-003 ante una coordenada %s', async (_caso, coordenadas) => {
    const { controlDeTasa, almacenamientoImagenes } = crearFakes();
    const pipeline = crearPipelineValidacionReporte({ controlDeTasa, almacenamientoImagenes });
    const datos = { ...datosValidos, ...coordenadas };

    await expect(pipeline.manejar({ datosCrudos: datos, reportadoPor: 'usuario-1' }, datos)).rejects.toBeInstanceOf(
      GeolocalizacionNoDisponibleError,
    );
  });
});
