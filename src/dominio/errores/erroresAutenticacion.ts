import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Códigos y mensajes copiados textualmente de docs/ERRORS.md — Módulo 1.
 * No modificar el mensaje acá sin actualizar primero el catálogo.
 */
export class EmailYaRegistradoError extends ErrorDominio {
  constructor() {
    super(
      'PEA-AUTH-001',
      'Ya existe una cuenta con ese email. ¿Querés iniciar sesión o recuperar tu contraseña?',
      409,
    );
  }
}

export class PayloadInvalidoError extends ErrorDominio {
  constructor(detalle?: string) {
    super('PEA-SIS-005', detalle ?? 'Revisá los datos ingresados, algo no tiene el formato esperado.', 400);
  }
}

export class MatriculaYaRegistradaError extends ErrorDominio {
  constructor() {
    super(
      'PEA-AUTH-006',
      'Ya existe una matrícula registrada con esos datos para este colegio. Verificá el número ingresado.',
      409,
    );
  }
}

export class AltaInstitucionalNoAutorizadaError extends ErrorDominio {
  constructor() {
    super(
      'PEA-AUTH-011',
      'Este tipo de cuenta institucional se habilita desde la administración de la plataforma.',
      403,
    );
  }
}

export class SesionExpiradaError extends ErrorDominio {
  constructor() {
    super('PEA-AUTH-005', 'Tu sesión expiró por seguridad. Iniciá sesión de nuevo para continuar.', 401);
  }
}
