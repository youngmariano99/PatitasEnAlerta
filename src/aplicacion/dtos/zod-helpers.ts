import { z } from 'zod';

/**
 * Convierte '' (campo de texto opcional vacío) a `undefined`, para no
 * persistir cadenas vacías como si fueran un dato real. Compartido por
 * cualquier DTO con campos de texto opcionales (alta y edición de mascota).
 */
export const opcionalDeTexto = (maximo: number) =>
  z.preprocess((valor) => (valor === '' ? undefined : valor), z.string().trim().max(maximo).optional());
