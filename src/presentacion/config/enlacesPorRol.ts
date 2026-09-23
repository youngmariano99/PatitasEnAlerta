import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Contact,
  Handshake,
  Home,
  Megaphone,
  Package,
  PawPrint,
  Stethoscope,
  Store,
  type LucideIcon,
} from 'lucide-react';

export interface EnlaceRapido {
  href: string;
  etiqueta: string;
}

/**
 * Único punto de verdad de "a dónde puede ir cada rol" — usado tanto por
 * `/panel` (lista completa) como por el sidebar de escritorio del shell de
 * navegación (`BarraNavegacion.tsx`), que también tiene espacio para
 * mostrarla entera. La barra inferior de mobile usa el subconjunto curado
 * de `ENLACES_PRINCIPALES_POR_ROL` más abajo.
 */
export const ENLACES_POR_ROL: Record<string, EnlaceRapido[]> = {
  dueño: [
    { href: '/mascotas', etiqueta: 'Mis mascotas' },
    { href: '/reportes/nuevo', etiqueta: 'Reportar una mascota' },
    { href: '/turnos/reservar', etiqueta: 'Reservar un turno' },
    { href: '/turnos/mis-turnos', etiqueta: 'Mis turnos' },
    { href: '/adopciones', etiqueta: 'Vitrina de adopción' },
    { href: '/adopciones/compatibilidad', etiqueta: 'Compatibilidad de adopción' },
    { href: '/tienda-veterinaria', etiqueta: 'Tienda veterinaria' },
    { href: '/mis-pedidos', etiqueta: 'Mis pedidos' },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable' },
    { href: '/foro', etiqueta: 'Foro de bienestar animal' },
  ],
  veterinario: [
    { href: '/veterinario/agenda', etiqueta: 'Mi agenda' },
    { href: '/veterinario/turnos', etiqueta: 'Mis turnos' },
    { href: '/veterinario/pacientes', etiqueta: 'Mis pacientes' },
    { href: '/veterinario/productos', etiqueta: 'Mi catálogo de productos' },
    { href: '/veterinario/pedidos', etiqueta: 'Pedidos recibidos' },
    { href: '/veterinario/historiales-compartidos', etiqueta: 'Historiales compartidos' },
    { href: '/reportes', etiqueta: 'Reportes de la comunidad' },
    { href: '/red-colaboracion/solicitudes', etiqueta: 'Solicitudes de la Red de Colaboración' },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable' },
    { href: '/foro', etiqueta: 'Foro de bienestar animal' },
  ],
  municipio: [
    { href: '/municipio/dashboard', etiqueta: 'Panel de reportes' },
    { href: '/municipio/eventos', etiqueta: 'Calendario de operativos' },
    { href: '/municipio/eventos/nuevo', etiqueta: 'Publicar operativo' },
    { href: '/municipio/turnera', etiqueta: 'Turnera municipal' },
    { href: '/municipio/adopciones', etiqueta: 'Vitrina de adopción' },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable' },
    { href: '/foro', etiqueta: 'Foro de bienestar animal' },
  ],
  administrador: [
    { href: '/admin/verificaciones', etiqueta: 'Cola de verificaciones' },
    { href: '/admin/auditoria', etiqueta: 'Historial de auditoría' },
    { href: '/foro', etiqueta: 'Foro de bienestar animal' },
  ],
  comerciante: [
    { href: '/comercios/panel', etiqueta: 'Mi comercio' },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable' },
    { href: '/foro', etiqueta: 'Foro de bienestar animal' },
  ],
  organizacion: [
    { href: '/red-colaboracion/solicitudes', etiqueta: 'Solicitudes de recurso' },
    { href: '/red-colaboracion/directorio', etiqueta: 'Directorio de aliados' },
    { href: '/red-colaboracion/buscar', etiqueta: 'Buscar reportes similares' },
    { href: '/red-colaboracion/metricas', etiqueta: 'Mis métricas' },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable' },
    { href: '/foro', etiqueta: 'Foro de bienestar animal' },
  ],
  rescatista: [
    { href: '/red-colaboracion/solicitudes', etiqueta: 'Solicitudes de recurso' },
    { href: '/red-colaboracion/directorio', etiqueta: 'Directorio de aliados' },
    { href: '/red-colaboracion/metricas', etiqueta: 'Mis métricas' },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable' },
    { href: '/foro', etiqueta: 'Foro de bienestar animal' },
  ],
};

export const ETIQUETA_ROL: Record<string, string> = {
  dueño: 'Dueño de mascota',
  veterinario: 'Veterinario/a',
  municipio: 'Cuenta municipal',
  administrador: 'Administrador de plataforma',
  comerciante: 'Comerciante',
  organizacion: 'Organización/ONG',
  rescatista: 'Rescatista',
};

export interface EnlacePrincipal extends EnlaceRapido {
  /** Ícono del ítem en la barra inferior/sidebar (Lucide — ver docs/DISENO.md, migración acotada al shell). */
  icono: LucideIcon;
}

/**
 * Subconjunto curado (máx. 4) para la barra inferior de mobile y el
 * sidebar de escritorio del shell — los destinos de uso más frecuente por
 * rol. El resto de `ENLACES_POR_ROL` sigue disponible desde "Menú" (→ `/panel`).
 */
export const ENLACES_PRINCIPALES_POR_ROL: Record<string, EnlacePrincipal[]> = {
  dueño: [
    { href: '/mascotas', etiqueta: 'Mascotas', icono: PawPrint },
    { href: '/reportes/nuevo', etiqueta: 'Reportar', icono: Megaphone },
    { href: '/turnos/mis-turnos', etiqueta: 'Turnos', icono: Calendar },
    { href: '/adopciones', etiqueta: 'Adopción', icono: Home },
  ],
  veterinario: [
    { href: '/veterinario/agenda', etiqueta: 'Agenda', icono: Calendar },
    { href: '/veterinario/turnos', etiqueta: 'Turnos', icono: Stethoscope },
    { href: '/veterinario/pacientes', etiqueta: 'Pacientes', icono: PawPrint },
    { href: '/veterinario/pedidos', etiqueta: 'Pedidos', icono: Package },
  ],
  municipio: [
    { href: '/municipio/dashboard', etiqueta: 'Reportes', icono: BarChart3 },
    { href: '/municipio/eventos', etiqueta: 'Operativos', icono: Calendar },
    { href: '/municipio/turnera', etiqueta: 'Turnera', icono: Stethoscope },
    { href: '/municipio/adopciones', etiqueta: 'Adopción', icono: Home },
  ],
  administrador: [
    { href: '/admin/verificaciones', etiqueta: 'Verificaciones', icono: CheckCircle2 },
    { href: '/admin/auditoria', etiqueta: 'Auditoría', icono: ClipboardList },
  ],
  comerciante: [{ href: '/comercios/panel', etiqueta: 'Mi comercio', icono: Store }],
  organizacion: [
    { href: '/red-colaboracion/solicitudes', etiqueta: 'Solicitudes', icono: Handshake },
    { href: '/red-colaboracion/directorio', etiqueta: 'Directorio', icono: Contact },
    { href: '/red-colaboracion/metricas', etiqueta: 'Métricas', icono: BarChart3 },
  ],
  rescatista: [
    { href: '/red-colaboracion/solicitudes', etiqueta: 'Solicitudes', icono: Handshake },
    { href: '/red-colaboracion/directorio', etiqueta: 'Directorio', icono: Contact },
    { href: '/red-colaboracion/metricas', etiqueta: 'Métricas', icono: BarChart3 },
  ],
};

/** Accesos públicos mostrados en la barra/sidebar cuando no hay sesión (modo invitado). */
export const ENLACES_PUBLICOS: EnlacePrincipal[] = [
  { href: '/', etiqueta: 'Inicio', icono: Home },
  { href: '/reportes', etiqueta: 'Reportes', icono: Megaphone },
  { href: '/adopciones', etiqueta: 'Adopción', icono: PawPrint },
  { href: '/comercios', etiqueta: 'Comercios', icono: Store },
];
