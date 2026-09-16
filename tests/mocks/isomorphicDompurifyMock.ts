/**
 * Mock de `isomorphic-dompurify` para el entorno de test (ver jest.config.ts).
 * Cubre el único uso real de este proyecto (`SanitizadorHtml.ts`:
 * `ALLOWED_TAGS: []`, texto plano) despojando cualquier etiqueta HTML y su
 * contenido no textual (`<script>...</script>`) vía regex — no reemplaza a
 * DOMPurify real, que sigue corriendo sin cambios en runtime.
 */
interface OpcionesSanitizar {
  ALLOWED_TAGS?: string[];
}

function sanitize(html: string, opciones?: OpcionesSanitizar): string {
  if (opciones?.ALLOWED_TAGS?.length === 0) {
    return html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<[^>]*>/g, '');
  }
  return html;
}

const isomorphicDompurifyMock = { sanitize };

export default isomorphicDompurifyMock;
