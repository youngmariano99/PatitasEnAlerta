import { CasoDeUsoBase } from '@aplicacion/casos-de-uso/CasoDeUsoBase';

type EntradaTest = { valor: string };
type SalidaTest = { valorProcesado: string };

class CasoDeUsoDePrueba extends CasoDeUsoBase<EntradaTest, SalidaTest> {
  autorizarLlamado = false;

  protected validar(input: EntradaTest): EntradaTest {
    if (!input.valor) throw new Error('valor requerido');
    return input;
  }

  protected async autorizar(): Promise<void> {
    this.autorizarLlamado = true;
  }

  protected async persistir(dato: EntradaTest): Promise<SalidaTest> {
    return { valorProcesado: dato.valor.toUpperCase() };
  }
}

describe('CasoDeUsoBase (Template Method)', () => {
  it('ejecuta validar → autorizar → persistir en orden y retorna el resultado', async () => {
    const caso = new CasoDeUsoDePrueba();

    const resultado = await caso.ejecutar({ valor: 'hola' });

    expect(caso.autorizarLlamado).toBe(true);
    expect(resultado).toEqual({ valorProcesado: 'HOLA' });
  });

  it('propaga el error de validación sin llegar a autorizar/persistir', async () => {
    const caso = new CasoDeUsoDePrueba();

    await expect(caso.ejecutar({ valor: '' })).rejects.toThrow('valor requerido');
    expect(caso.autorizarLlamado).toBe(false);
  });
});
