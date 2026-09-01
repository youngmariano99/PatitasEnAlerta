# Presentación ilustrativa — Patitas en Alerta

Página estática de una sola pieza (`index.html`), pensada para grabar un video explicando la plataforma a los stakeholders (municipio, dueños de mascotas, veterinarios).

**No forma parte de la aplicación Next.js** — es autocontenida (HTML + CSS + JS inline, sin build) y usa las imágenes de `public/animales/` por ruta relativa.

## Cómo verla

Abrí `index.html` directamente en el navegador, o servila con cualquier servidor estático, por ejemplo:

```bash
npx serve presentacion-stakeholders
```

## Contenido

1. Hero con el lema del proyecto.
2. El problema actual, por actor.
3. Cómo un solo reporte alimenta a todo el sistema.
4. Beneficio real por stakeholder (dueño, municipio, veterinario).
5. Storyboard del flujo de uso (registro → reporte → mapa en vivo → cierre).
6. Funcionalidades, cada una atada a un problema concreto.
7. Diseño pensado para el momento de crisis (errores empáticos, datos sensibles).
8. Visión del ecosistema completo (ONGs, comerciantes, matching de adopción).
