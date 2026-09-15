/**
 * @jest-environment node
 */
import { sanitizarDescripcion } from '@infraestructura/seguridad/SanitizadorHtml';

describe('sanitizarDescripcion (Paso 3, anti-XSS DOMPurify)', () => {
  it('despoja etiquetas <script> y su contenido ejecutable', () => {
    expect(sanitizarDescripcion('<script>alert("xss")</script>Balanceado premium')).toBe('Balanceado premium');
  });

  it('despoja cualquier etiqueta HTML, dejando solo el texto', () => {
    expect(sanitizarDescripcion('<b>Resistente</b> y <i>liviana</i>')).toBe('Resistente y liviana');
  });

  it('deja pasar texto plano sin cambios (más allá del trim)', () => {
    expect(sanitizarDescripcion('Pipeta mensual antipulgas')).toBe('Pipeta mensual antipulgas');
  });

  it('preserva null', () => {
    expect(sanitizarDescripcion(null)).toBeNull();
  });
});
