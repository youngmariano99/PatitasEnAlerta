import { CompatibilidadPorReglas } from '@dominio/estrategias/EstrategiaCompatibilidad';
import type { DatosCuestionarioAdoptante } from '@dominio/entidades/CuestionarioAdoptante';

function crearCuestionario(
  overrides?: Partial<DatosCuestionarioAdoptante>,
): DatosCuestionarioAdoptante {
  return {
    horasSoloEstimadas: null,
    presenciaNinos: null,
    espacioDisponible: null,
    experienciaPrevia: null,
    ...overrides,
  };
}

describe('CompatibilidadPorReglas', () => {
  it('Paso 1: expone metodo="reglas"', () => {
    expect(new CompatibilidadPorReglas().metodo).toBe('reglas');
  });

  it('score 1.0 cuando ambos criterios coinciden', () => {
    const estrategia = new CompatibilidadPorReglas();
    const cuestionario = crearCuestionario({ presenciaNinos: true, horasSoloEstimadas: 8 });

    const score = estrategia.calcularScore(cuestionario, {
      nivelEnergia: 'bajo',
      compatibleNinos: true,
      compatibleOtrosAnimales: null,
    });

    expect(score).toBe(1);
  });

  it('score 0 cuando ningún criterio coincide', () => {
    const estrategia = new CompatibilidadPorReglas();
    const cuestionario = crearCuestionario({ presenciaNinos: true, horasSoloEstimadas: 8 });

    const score = estrategia.calcularScore(cuestionario, {
      nivelEnergia: 'alto',
      compatibleNinos: false,
      compatibleOtrosAnimales: null,
    });

    expect(score).toBe(0);
  });

  it('score 0.5 cuando solo uno de los dos criterios coincide', () => {
    const estrategia = new CompatibilidadPorReglas();
    const cuestionario = crearCuestionario({ presenciaNinos: true, horasSoloEstimadas: 8 });

    const score = estrategia.calcularScore(cuestionario, {
      nivelEnergia: 'bajo',
      compatibleNinos: false,
      compatibleOtrosAnimales: null,
    });

    expect(score).toBe(0.5);
  });

  it('sin niños en casa, cualquier compatibleNinos coincide (no descarta)', () => {
    const estrategia = new CompatibilidadPorReglas();
    const cuestionario = crearCuestionario({ presenciaNinos: false, horasSoloEstimadas: 1 });

    const score = estrategia.calcularScore(cuestionario, {
      nivelEnergia: 'alto',
      compatibleNinos: false,
      compatibleOtrosAnimales: null,
    });

    expect(score).toBe(1);
  });

  it('2 horas solo o menos no restringe por nivel de energía', () => {
    const estrategia = new CompatibilidadPorReglas();
    const cuestionario = crearCuestionario({ presenciaNinos: false, horasSoloEstimadas: 2 });

    const score = estrategia.calcularScore(cuestionario, {
      nivelEnergia: 'alto',
      compatibleNinos: null,
      compatibleOtrosAnimales: null,
    });

    expect(score).toBe(1);
  });

  it('entre 2 y 6 horas solo, energía media también coincide (no exige "bajo")', () => {
    const estrategia = new CompatibilidadPorReglas();
    const cuestionario = crearCuestionario({ presenciaNinos: false, horasSoloEstimadas: 4 });

    const score = estrategia.calcularScore(cuestionario, {
      nivelEnergia: 'medio',
      compatibleNinos: null,
      compatibleOtrosAnimales: null,
    });

    expect(score).toBe(1);
  });

  it('un dato no declarado (null) en cualquiera de los dos lados no penaliza', () => {
    const estrategia = new CompatibilidadPorReglas();
    const cuestionario = crearCuestionario();

    const score = estrategia.calcularScore(cuestionario, {
      nivelEnergia: null,
      compatibleNinos: null,
      compatibleOtrosAnimales: null,
    });

    expect(score).toBe(1);
  });
});
