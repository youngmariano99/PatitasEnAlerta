import { injectable } from 'tsyringe';
import type { IGeneradorEmbeddings } from '@dominio/puertos/IGeneradorEmbeddings';
import { ServicioExternoNoDisponibleError } from '@dominio/errores/erroresTransversales';
import { logger } from '@infraestructura/logging/logger';

const URL_EMBEDDINGS = 'https://api.openai.com/v1/embeddings';
// 1536 dimensiones por defecto — coincide con `descripcion_embedding VECTOR(1536)`
// (docs/SCHEMA.md). Cambiar de modelo exige migrar esa columna primero.
const MODELO_EMBEDDINGS = 'text-embedding-3-small';
const DIMENSIONES_ESPERADAS = 1536;

type RespuestaEmbeddingsOpenAI = {
  data?: Array<{ embedding?: unknown }>;
};

/**
 * Adapter (GoF) sobre la API de embeddings de OpenAI. Elegido por ser la
 * opción de integración mínima (una única llamada HTTPS con `fetch` nativo,
 * sin agregar un SDK nuevo a package.json) cuya dimensión de salida por
 * defecto (1536) ya coincide con la columna fijada desde el modelado inicial
 * (docs/SCHEMA.md) — ningún documento del proyecto fija un proveedor de
 * embeddings puntual, ver docs/DECISIONES.md. `BuscarReportesSimilares.ts`
 * solo conoce `IGeneradorEmbeddings`; cambiar de proveedor es reemplazar
 * este archivo.
 */
@injectable()
export class OpenAIGeneradorEmbeddings implements IGeneradorEmbeddings {
  private readonly apiKey: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Falta la variable de entorno OPENAI_API_KEY.');
    }
    this.apiKey = apiKey;
  }

  async generarEmbedding(texto: string): Promise<number[]> {
    let respuesta: Response;
    try {
      respuesta = await fetch(URL_EMBEDDINGS, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: MODELO_EMBEDDINGS, input: texto }),
      });
    } catch (error) {
      logger.error({ err: error }, 'Fallo de red generando embedding de búsqueda semántica');
      throw new ServicioExternoNoDisponibleError();
    }

    if (!respuesta.ok) {
      logger.error({ statusHttp: respuesta.status }, 'El proveedor de embeddings respondió con error');
      throw new ServicioExternoNoDisponibleError();
    }

    const cuerpo = (await respuesta.json()) as RespuestaEmbeddingsOpenAI;
    const vector = cuerpo.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length !== DIMENSIONES_ESPERADAS || !vector.every((valor) => typeof valor === 'number')) {
      logger.error({ longitudRecibida: Array.isArray(vector) ? vector.length : null }, 'Embedding recibido con formato inesperado');
      throw new ServicioExternoNoDisponibleError();
    }

    return vector;
  }
}
