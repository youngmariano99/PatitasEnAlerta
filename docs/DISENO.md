# Sistema de diseño — "Patitas en Alerta UI SYSTEM" (Brandbook)

Fuente de verdad versionada del sistema de diseño vigente, derivada de `Bibliografia/Informes/Nuevos/Brandbook para "Patitas en Alerta".pdf` y `DISEÑO INCLUSIVO (TERCERA EDAD Y BAJA ALFABETIZACIÓN DIGITAL).pdf`. Reemplaza al sistema anterior ("Dark Utility Premium", tema oscuro), migrado el 2026-09-16.

## Paleta de color

Tokens definidos en `tailwind.config.ts` — usar siempre el nombre del token, nunca hex directo en componentes.

| Token          | Valor HEX | Nombre          | Uso                                                                                          |
| -------------- | --------- | --------------- | -------------------------------------------------------------------------------------------- |
| `base`         | `#F8F9FA` | Blanco Clínico  | Fondo general de toda la PWA                                                                 |
| `surface1`     | `#EEF1F4` | —               | Tarjetas, inputs, superficies elevadas                                                       |
| `surface2`     | `#E2E8EE` | —               | Bordes, divisores, hover                                                                     |
| `text-primary` | `#1E1E1E` | Carbón Óptico   | Texto principal (nunca negro puro `#000`)                                                    |
| `text-muted`   | `#5B6470` | —               | Texto secundario/metadatos, ≥4.5:1 sobre `base`                                              |
| `primary`      | `#008080` | Verde Sanitario | Navegación, CTA primaria (`<Boton variante="primaria">`)                                     |
| `accent`       | `#0073E6` | Azul Cívico     | Enlaces, focus states, CTA secundaria                                                        |
| `alert`        | `#C44601` | Naranja Alerta  | **Reservado**: FAB de emergencia y estados críticos reales — nunca error de formulario común |
| `success`      | `#0F7B4D` | —               | Confirmaciones                                                                               |
| `danger`       | `#B3261E` | —               | Errores de validación                                                                        |

**Texto sobre color saturado** (botones primarios/secundarios/alerta): usar `text-base` (el Blanco Clínico funciona como "texto sobre color" con buen contraste), nunca blanco puro.

**Regla no negociable**: ningún estado se comunica solo por color — siempre ícono + texto explícito (ver `Badge.tsx`).

## Tipografías

Cargadas vía `next/font/google` en `app/layout.tsx`, expuestas como CSS vars consumidas por `tailwind.config.ts`.

| Familia               | Token Tailwind                  | Uso                                                                   |
| --------------------- | ------------------------------- | --------------------------------------------------------------------- |
| Lexend                | `font-display`                  | Títulos, encabezados (H1-H3)                                          |
| Atkinson Hyperlegible | `font-sans` (default de `body`) | Cuerpo de texto — elegida por legibilidad en baja visión/tercera edad |
| Roboto Mono           | `font-mono`                     | Cifras, dashboards, coordenadas, IDs                                  |

Piso mínimo: 14px (`text-sm`). Nunca forzar tamaños menores ni bloquear el zoom del navegador/SO.

## Componentes compartidos

- `src/presentacion/componentes/ui/Boton.tsx` — variantes `primaria`/`secundaria`/`alerta`/`texto`, `min-h-touch`/`min-w-touch` (44px) incorporado.
- `src/presentacion/componentes/ui/Tarjeta.tsx` — contenedor estándar.
- `src/presentacion/componentes/ui/Badge.tsx` — estado con ícono + texto, tonos `neutro`/`exito`/`alerta`/`peligro`.
- `src/presentacion/componentes/estado/EstadoIlustrado.tsx` — estado vacío/error/éxito a tamaño completo, con mascota de `public/animales/`.
- `src/presentacion/componentes/estado/EncabezadoIlustrado.tsx` — versión compacta para encabezar pantallas operativas (dashboards, wizards) sin competir con los datos reales.

## Mascotas ilustradas (`public/animales/`)

Uso decidido explícitamente por el equipo: **ampliamente por toda la interfaz**, en tono informal — aceptando que esto se aparta de la recomendación "sin ilustraciones caricaturescas" del propio Brandbook, en favor de calidez y cercanía con la esencia de "Patitas en Alerta".

Regla de aplicación:

- Pantallas operativas con datos reales (wizard de reporte, dashboards, libreta sanitaria) → `EncabezadoIlustrado` (compacto).
- Estados vacíos, de error, de éxito y onboarding → `EstadoIlustrado` (tamaño completo).

| Imagen                                           | Uso                                                           |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `Login-Bienvenida.png`                           | Login (a construir), bienvenida                               |
| `Registro.png`                                   | `/auth/registro`                                              |
| `Inicio-Dashboard.png`                           | `/municipio/dashboard`                                        |
| `Crear-alerta.png`                               | Reporte tipo "encontrado" en `/reportes/nuevo`                |
| `Animal sueltoRiesgoSanitario.png`               | Reporte tipo "problemática" en `/reportes/nuevo`              |
| `Reportar-mascota -perdida.png`                  | Reporte tipo "perdido" en `/reportes/nuevo`                   |
| `Mapa-Animales-encontrados.png`                  | `/reportes`                                                   |
| `Datos y turnos del municipio.png`               | `/municipio/eventos(/nuevo)`, `/turnos/mis-turnos`            |
| `ONGs y rescatistas.png`                         | `/red-colaboracion/metricas` y futuras pantallas del Módulo 5 |
| `Veterinarias  gestión y registros clínicos.png` | Futuras páginas `/veterinario/*`                              |
| `Error-Problema.png`                             | `app/not-found.tsx`, `app/error.tsx`, estados de error inline |
| `Éxito-Confirmación.png`                         | Estados de éxito/confirmación                                 |
| `Preguntas-frecuentes.png`                       | Reservada — sin página FAQ todavía                            |

## Shell de navegación persistente (`src/presentacion/componentes/shell/`)

Montado una vez en `app/layout.tsx` (`ShellNavegacion`), envuelve toda la app salvo `/auth/*` (login, registro, recuperar contraseña — pantallas de flujo propio, sin barra ni footer). Resuelve sesión, volver, menú por rol y footer en un único punto, sin que cada pantalla lo reimplemente.

- **`BarraSuperior.tsx`** (cabecera, `sticky top-0`): botón "Volver" a la izquierda (oculto en `/` y `/panel`, donde no hay a dónde volver dentro de la app) + marca. A la derecha: con sesión, campana de notificaciones (`CampanaNotificaciones`) + email + "Cerrar sesión"; sin sesión, "Iniciar sesión". "Volver" usa `router.back()` por defecto, salvo un override explícito por patrón de ruta (`OVERRIDES_VOLVER`) para pantallas donde el historial del navegador no es un "volver" confiable — ej. `/mascotas/[id]/libreta` siempre vuelve a `/mascotas/[id]`, nunca a lo que haya en el historial (se puede llegar ahí por un link compartido o al refrescar).
- **`NavegacionPrincipal.tsx`**: un único componente adaptativo — bottom tab bar fija en mobile (`≤md`, patrón de mejor alcance con el pulgar, sin menú hamburguesa escondido, el más accesible para el público objetivo de tercera edad) que se convierte en sidebar fijo a la izquierda en desktop (`md:`). Mismo dataset en ambos breakpoints: el subconjunto curado `ENLACES_PRINCIPALES_POR_ROL` (máx. 4 accesos por rol, `src/presentacion/config/enlacesPorRol.ts`) más un último ítem fijo "Menú" → `/panel`, donde vive la lista completa `ENLACES_POR_ROL`. Sin sesión, muestra `ENLACES_PUBLICOS` (Inicio, Reportes, Adopción, Comercios). Cada ítem cumple `min-h-touch`/`min-w-touch` (44px) e iconografía emoji (mismo criterio que `Badge.tsx`, sin librería de íconos nueva).
- **`PieDePagina.tsx`**: footer simple y persistente, mismo criterio de ocultarse en `/auth/*`.
- **Detección de sesión**: `ShellNavegacion` hace `fetch('/api/perfil')` directo — nunca `fetchConSesion` (que fuerza un hard-redirect a `/auth/login` en un 401). Un 401 acá es "modo invitado", no una sesión que haya que redirigir; distinción central del diseño del shell, ya que la mayoría de las pantallas (reportes, adopción, comercios, calendario de operativos) son de lectura pública.
- **Alcance de cada pantalla dentro del menú por rol** (`ENLACES_POR_ROL`/`ENLACES_PRINCIPALES_POR_ROL`): toda pantalla nueva bajo `app/` debe sumarse ahí (o quedar enlazada desde otra pantalla ya alcanzable) antes de darse por terminada — una pantalla sin entrada de menú ni link entrante es una pantalla huérfana.

### Enlazado de pantallas de detalle (evitar huérfanas)

Las pantallas de detalle por ID (`/reportes/[id]`, `/red-colaboracion/colaboraciones/[id]`) no van en el menú por rol (necesitan un ID concreto) — se alcanzan desde:

- El listado/mapa correspondiente (`/reportes` → link "Ver historial" por fila y en el popup del mapa; `MapaReportes.tsx` es compartido por `/reportes` y la home pública).
- La acción que las crea (ofrecerse como colaborador en `/red-colaboracion/solicitudes` deja un link directo a la colaboración recién creada).
- La campana de notificaciones (`CampanaNotificaciones.tsx`, `rutaDeNotificacion()`): cada notificación cuya `referenciaTabla` mapea a una pantalla existente es clickeable y navega ahí (reportes, colaboraciones; `turnos` enlaza al listado `/turnos/mis-turnos` porque no hay vista de detalle por ID; `verificaciones` no tiene pantalla propia del lado del solicitante, así que queda sin enlace).

## Prohibiciones activas (código y revisión de PR)

- Negro puro (`#000`) y blanco puro (`#FFF`) en cualquier forma.
- `alert` (Naranja Alerta) fuera de emergencias reales.
- Tamaño de fuente por debajo del piso de 14px, o bloqueo del zoom nativo.
- Superficie interactiva por debajo de 44×44px.
- Cualquier estado comunicado solo por color, sin ícono + texto.
