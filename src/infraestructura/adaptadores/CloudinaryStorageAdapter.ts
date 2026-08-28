import { injectable } from 'tsyringe';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';

/**
 * Adapter (patrón Adapter) sobre Cloudinary. La subida del archivo ocurre
 * desde el cliente antes del submit, con un upload preset unsigned (ver
 * docs/SETUP.md) — este adaptador NO sube nada; valida server-side que la
 * `fotoUrl` recibida efectivamente apunta a nuestra propia cuenta de
 * Cloudinary (`CLOUDINARY_CLOUD_NAME`), para no persistir a ciegas una URL
 * arbitraria armada a mano por un cliente que se salteó la subida real.
 */
@injectable()
export class CloudinaryStorageAdapter implements IAlmacenamientoImagenes {
  private readonly origenEsperado: string;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      throw new Error('Falta la variable de entorno CLOUDINARY_CLOUD_NAME.');
    }
    this.origenEsperado = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  }

  esUrlDeImagenValida(url: string): boolean {
    return url.startsWith(this.origenEsperado);
  }
}
