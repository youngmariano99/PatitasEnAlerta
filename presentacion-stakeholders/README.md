# Presentación ilustrativa — Patitas en Alerta

Página estática de una sola pieza (`index.html`), pensada para grabar un video explicando la propuesta a los stakeholders (municipio, dueños de mascotas, veterinarios, ONGs, comerciantes).

**No forma parte de la aplicación Next.js** — es autocontenida (HTML + CSS + JS inline, sin build) y usa las imágenes de `public/animales/` por ruta relativa.

Sigue la identidad visual del **Brandbook oficial de Patitas en Alerta**: paleta Verde Sanitario `#008080` / Azul Cívico `#0073E6` / Naranja Alerta `#C44601` (reservado a emergencias sanitarias reales), fondo Blanco Clínico, tipografías Lexend (títulos) + Atkinson Hyperlegible (cuerpo) + Roboto Mono (datos), contraste WCAG AAA y tono de voz en "vos".

## Cómo verla

Abrí `index.html` directamente en el navegador, o servila con cualquier servidor estático, por ejemplo:

```bash
npx serve presentacion-stakeholders
```

## Contenido

1. **Hero** — lema del proyecto y aclaración de que la propuesta está en construcción.
2. **Problemas** — preguntas abiertas (no diagnósticos confirmados) sobre lo que puede estar pasando hoy con la fauna urbana local, incluyendo eventos de riesgo (animales sueltos, con signos de rabia, mordeduras).
3. **Idea central** — diagrama radial con todos los stakeholders (Municipio, Veterinarios, Dueños de mascotas en el MVP; ONGs/Rescatistas y Comerciantes en etapas siguientes) conectados a Patitas en Alerta.
4. **Soluciones** — cada tarjeta responde a una pregunta de la sección 2, etiquetada como MVP o "Después del MVP"; incluye un mapa esquemático de categorías de reporte y el storyboard ilustrado del flujo real (login → registro → reporte → mapa en vivo → cierre).
5. **Conclusión** — síntesis y lista explícita de lo que queda para después del MVP (red de colaboración ONGs, funcionalidades avanzadas de veterinarios, marketplace, foros/cursos, algoritmo de compatibilidad de adopción).

## Fuentes de diseño

Basado en cuatro documentos de investigación del proyecto (paleta, tipografía, accesibilidad para adultos mayores/baja alfabetización digital y tono de voz institucional) — no están versionados en el repo por ser insumos de trabajo personales.
