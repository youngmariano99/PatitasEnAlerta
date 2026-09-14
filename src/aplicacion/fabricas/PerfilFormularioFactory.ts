import type { z } from 'zod';
import { RegistrarDuenoSchema } from '@aplicacion/dtos/auth/RegistrarDuenoDto';
import { RegistrarVeterinarioSchema } from '@aplicacion/dtos/auth/RegistrarVeterinarioDto';
import { CrearCuentaMunicipioSchema } from '@aplicacion/dtos/auth/CrearCuentaMunicipioDto';
import { RegistrarRescatistaSchema } from '@aplicacion/dtos/auth/RegistrarRescatistaDto';

export type RolFormularioPerfil = 'dueño' | 'veterinario' | 'municipio' | 'rescatista';

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
    // Plataforma vía POST /api/admin/municipio (docs/ROLES.md, AUTH-03).
    // Mismo esquema que usa ese endpoint (CrearCuentaMunicipioDto.ts), nunca
    // el formulario público de /auth/registro.
    return CrearCuentaMunicipioSchema;
  }
}

class FabricaFormularioRescatista implements IFabricaFormularioPerfil {
  crearEsquema(): z.ZodTypeAny {
    // Rescatista/Activista (docs/ROLES.md, Módulo 5): autoregistro sin
    // perfil adicional y sin verificación profesional obligatoria — el
    // esquema más simple de los cuatro, mismos campos que dueño
    // (email + password), sin matrícula/colegioEmisor ni nombreInstitucional.
    return RegistrarRescatistaSchema;
  }
}

export class PerfilFormularioFactory {
  private static readonly fabricas: Record<RolFormularioPerfil, IFabricaFormularioPerfil> = {
    'dueño': new FabricaFormularioDueño(),
    veterinario: new FabricaFormularioVeterinario(),
    municipio: new FabricaFormularioMunicipio(),
    rescatista: new FabricaFormularioRescatista(),
  };

  static crear(rol: RolFormularioPerfil): z.ZodTypeAny {
    return PerfilFormularioFactory.fabricas[rol].crearEsquema();
  }
}
