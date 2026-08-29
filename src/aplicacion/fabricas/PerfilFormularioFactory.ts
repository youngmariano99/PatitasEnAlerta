import { z } from 'zod';
import { RegistrarDuenoSchema } from '@aplicacion/dtos/auth/RegistrarDuenoDto';
import { RegistrarVeterinarioSchema } from '@aplicacion/dtos/auth/RegistrarVeterinarioDto';

export type RolFormularioPerfil = 'dueño' | 'veterinario' | 'municipio';

/**
 * Abstract Factory (PLANIFICACION.md Sección 4.2): una fábrica concreta por
 * rol, cada una devolviendo el esquema Zod — el "producto" de la familia —
 * con exactamente los campos que ese rol completa en /auth/registro. Sumar
 * un rol nuevo es agregar una fábrica concreta al registro, nunca ensuciar
 * un único formulario con condicionales por rol.
 */
interface IFabricaFormularioPerfil {
  crearEsquema(): z.ZodTypeAny;
}

class FabricaFormularioDueño implements IFabricaFormularioPerfil {
  crearEsquema(): z.ZodTypeAny {
    return RegistrarDuenoSchema;
  }
}

class FabricaFormularioVeterinario implements IFabricaFormularioPerfil {
  crearEsquema(): z.ZodTypeAny {
    return RegistrarVeterinarioSchema;
  }
}

class FabricaFormularioMunicipio implements IFabricaFormularioPerfil {
  crearEsquema(): z.ZodTypeAny {
    // El municipio no se autoregistra — alta exclusiva del Administrador de
    // Plataforma (docs/ROLES.md, AUTH-03). Este esquema documenta el
    // "producto" que le corresponde a la familia sin exponer un endpoint
    // público que lo use todavía.
    return RegistrarDuenoSchema.extend({
      nombreInstitucional: z
        .string({ required_error: 'Ingresá el nombre de la institución.' })
        .trim()
        .min(1, 'Ingresá el nombre de la institución.')
        .max(150, 'El nombre institucional no puede superar los 150 caracteres.'),
    });
  }
}

export class PerfilFormularioFactory {
  private static readonly fabricas: Record<RolFormularioPerfil, IFabricaFormularioPerfil> = {
    'dueño': new FabricaFormularioDueño(),
    veterinario: new FabricaFormularioVeterinario(),
    municipio: new FabricaFormularioMunicipio(),
  };

  static crear(rol: RolFormularioPerfil): z.ZodTypeAny {
    return PerfilFormularioFactory.fabricas[rol].crearEsquema();
  }
}
