import {
  esCuestionarioCompleto,
  type DatosCuestionarioAdoptante,
} from '@dominio/entidades/CuestionarioAdoptante';

const cuestionarioCompleto: DatosCuestionarioAdoptante = {
  horasSoloEstimadas: 4,
  presenciaNinos: false,
  espacioDisponible: 'departamento',
  experienciaPrevia: 'Tuvo un gato',
};

describe('esCuestionarioCompleto', () => {
  it('AC / Paso 3: es completo cuando los 4 campos de estilo de vida están declarados', () => {
    expect(esCuestionarioCompleto(cuestionarioCompleto)).toBe(true);
  });

  it.each([
    'horasSoloEstimadas',
    'presenciaNinos',
    'espacioDisponible',
    'experienciaPrevia',
  ] as const)(
    'AC / Paso 3: es incompleto si falta "%s" (dispararía PEA-ADOP-001 al solicitar sugerencias)',
    (campo) => {
      const incompleto = { ...cuestionarioCompleto, [campo]: null };
      expect(esCuestionarioCompleto(incompleto)).toBe(false);
    },
  );

  it('un cuestionario recién creado (todos los campos null) es incompleto', () => {
    expect(
      esCuestionarioCompleto({
        horasSoloEstimadas: null,
        presenciaNinos: null,
        espacioDisponible: null,
        experienciaPrevia: null,
      }),
    ).toBe(false);
  });
});
