/**
 * @jest-environment node
 */
import { GET } from '@app/api/openapi/route';

describe('GET /api/openapi', () => {
  it('genera un documento OpenAPI 3.0 que incluye el DTO y la ruta de registro documentados', async () => {
    const respuesta = await GET();
    const documento = await respuesta.json();

    expect(documento.openapi).toBe('3.0.0');
    expect(documento.paths['/auth/registro']).toBeDefined();
    expect(documento.paths['/auth/registro'].post.responses['409']).toBeDefined();
    expect(documento.components.schemas.RegistrarDuenoDto).toBeDefined();
  });
});
