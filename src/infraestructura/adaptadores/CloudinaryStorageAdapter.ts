import { injectable } from 'tsyringe';
import { v2 as cloudinary } from 'cloudinary';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';

/** Segmento `v<versión>/` opcional que Cloudinary antepone al public_id dentro de la URL. */
const PATRON_VERSION = /^v\d+\//;
/** Extensión final (`.jpg`, `.png`, etc.) — no forma parte del public_id real. */
const PATRON_EXTENSION = /\.[^/.]+$/;

/**
 * Adapter (patrón Adapter) sobre Cloudinary. La subida del archivo ocurre
 * desde el cliente antes del submit, con un upload preset unsigned (ver
 * docs/SETUP.md) — este adaptador NO sube nada; valida server-side que la
 * `fotoUrl` recibida efectivamente apunta a nuestra propia cuenta de
 * Cloudinary (`CLOUDINARY_CLOUD_NAME`), para no persistir a ciegas una URL
 * arbitraria armada a mano por un cliente que se salteó la subida real.
 *
 * `fueSubidaPor()` (Módulo 2, ValidadorContenidoImagen) va un paso más
 * allá: usa el Admin API de Cloudinary (autenticado con
 * `CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET`, nunca expuestas al cliente)
 * para leer la metadata `context.custom.usuario_id` que
 * FormularioReporteWizard.tsx adjunta en el momento de la subida —así se
 * detecta una `fotoUrl` que en los hechos subió OTRA persona, aunque
 * pertenezca a nuestra cuenta de Cloudinary (ej. reutilizar la URL de la
 * foto de un reporte ajeno).
 */
@injectable()
export class CloudinaryStorageAdapter implements IAlmacenamientoImagenes {
  private readonly origenEsperado: string;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Faltan las variables de entorno CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.');
    }
    this.origenEsperado = `https://res.cloudinary.com/${cloudName}/image/upload/`;

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  }

  esUrlDeImagenValida(url: string): boolean {
    return url.startsWith(this.origenEsperado);
  }

  async fueSubidaPor(url: string, usuarioId: string): Promise<boolean> {
    const publicId = this.extraerPublicId(url);
    if (!publicId) return false;

    try {
      const recurso = await cloudinary.api.resource(publicId, { context: true });
      return recurso?.context?.custom?.usuario_id === usuarioId;
    } catch {
      // Recurso inexistente, eliminado o Cloudinary no responde: nunca se
      // asume válido por defecto (fail-closed) — PEA-REP-002.
      return false;
    }
  }

  private extraerPublicId(url: string): string | null {
    if (!this.esUrlDeImagenValida(url)) return null;

    const restoSinOrigen = url.slice(this.origenEsperado.length);
    const restoSinVersion = restoSinOrigen.replace(PATRON_VERSION, '');
    const publicId = restoSinVersion.replace(PATRON_EXTENSION, '');
    return publicId.length > 0 ? publicId : null;
  }
}
