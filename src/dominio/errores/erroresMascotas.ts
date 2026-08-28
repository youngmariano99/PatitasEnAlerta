import { ErrorDominio } from '@dominio/errores/ErrorDominio';

/**
 * Código y mensaje copiados textualmente de docs/ERRORS.md — Módulo 1.
 * Se reutiliza tanto para "sin foto" (Zod, campo obligatorio) como para una
 * fotoUrl que no pertenece a nuestra cuenta de Cloudinary: en ambos casos,
 * desde la perspectiva del dueño, "no tenemos una foto válida de tu mascota".
 */
export class FotoObligatoriaError extends ErrorDominio {
  constructor() {
    super(
      'PEA-AUTH-010',
      'Necesitamos al menos una foto de tu mascota para completar el registro.',
      400,
    );
  }
}

export class MascotaNoEncontradaError extends ErrorDominio {
  constructor() {
    super('PEA-AUTH-009', 'No encontramos esa mascota o ya no está disponible.', 404);
  }
}
