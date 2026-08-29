import { PerfilFormularioFactory } from '@aplicacion/fabricas/PerfilFormularioFactory';

describe('PerfilFormularioFactory (Abstract Factory)', () => {
  it('crea un esquema distinto por cada rol — no es un único formulario con condicionales', () => {
    const esquemaDueño = PerfilFormularioFactory.crear('dueño');
    const esquemaVeterinario = PerfilFormularioFactory.crear('veterinario');
    const esquemaMunicipio = PerfilFormularioFactory.crear('municipio');

    expect(esquemaDueño).not.toBe(esquemaVeterinario);
    expect(esquemaVeterinario).not.toBe(esquemaMunicipio);
    expect(esquemaDueño).not.toBe(esquemaMunicipio);
  });

  it('el esquema de dueño solo exige email y password', () => {
    const esquema = PerfilFormularioFactory.crear('dueño');

    expect(esquema.safeParse({ email: 'ana@ejemplo.test', password: 'contraseñaSegura123' }).success).toBe(true);
    expect(esquema.safeParse({ email: 'ana@ejemplo.test' }).success).toBe(false);
  });

  it('el esquema de veterinario expone matricula y colegioEmisor como obligatorios, además de email y password', () => {
    const esquema = PerfilFormularioFactory.crear('veterinario');

    const datosCompletos = {
      email: 'vet@ejemplo.test',
      password: 'contraseñaSegura123',
      matricula: 'MP-1001',
      colegioEmisor: 'Colegio de Veterinarios de la Provincia de Buenos Aires',
    };
    expect(esquema.safeParse(datosCompletos).success).toBe(true);

    const sinMatricula = esquema.safeParse({ ...datosCompletos, matricula: undefined });
    expect(sinMatricula.success).toBe(false);

    const sinColegio = esquema.safeParse({ ...datosCompletos, colegioEmisor: undefined });
    expect(sinColegio.success).toBe(false);
  });

  it('el esquema de municipio expone nombreInstitucional como obligatorio, distinto del de veterinario', () => {
    const esquema = PerfilFormularioFactory.crear('municipio');

    expect(
      esquema.safeParse({
        email: 'municipio@ejemplo.test',
        password: 'contraseñaSegura123',
        nombreInstitucional: 'Municipalidad de Coronel Pringles',
      }).success,
    ).toBe(true);

    expect(
      esquema.safeParse({ email: 'municipio@ejemplo.test', password: 'contraseñaSegura123' }).success,
    ).toBe(false);
  });
});
