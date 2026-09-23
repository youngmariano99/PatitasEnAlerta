import {
  BarChart3,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Contact,
  FileText,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Home,
  Megaphone,
  MessagesSquare,
  Package,
  PawPrint,
  Search,
  Stethoscope,
  Store,
  type LucideIcon,
} from 'lucide-react';

export interface EnlaceRapido {
  href: string;
  etiqueta: string;
}

export interface EnlacePrincipal extends EnlaceRapido {
  /** Ícono del ítem (Lucide — ver docs/DISENO.md). */
  icono: LucideIcon;
}

/**
 * Único punto de verdad de "a dónde puede ir cada rol" — usado tanto por
 * `/panel` (lista completa) como por el sidebar de escritorio del shell de
 * navegación (`BarraNavegacion.tsx`), que también tiene espacio para
 * mostrarla entera. La barra inferior de mobile usa el subconjunto curado
 * de `ENLACES_PRINCIPALES_POR_ROL` más abajo.
 */
export const ENLACES_POR_ROL: Record<string, EnlacePrincipal[]> = {
  dueño: [
    { href: '/mascotas', etiqueta: 'Mis mascotas', icono: PawPrint },
    { href: '/reportes/nuevo', etiqueta: 'Reportar una mascota', icono: Megaphone },
    { href: '/turnos/reservar', etiqueta: 'Reservar un turno', icono: CalendarPlus },
    { href: '/turnos/mis-turnos', etiqueta: 'Mis turnos', icono: Calendar },
    { href: '/adopciones', etiqueta: 'Vitrina de adopción', icono: Home },
    {
      href: '/adopciones/compatibilidad',
      etiqueta: 'Compatibilidad de adopción',
      icono: HeartHandshake,
    },
    { href: '/tienda-veterinaria', etiqueta: 'Tienda veterinaria', icono: Store },
    { href: '/mis-pedidos', etiqueta: 'Mis pedidos', icono: Package },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable', icono: GraduationCap },
    { href: '/foro', etiqueta: 'Foro de bienestar animal', icono: MessagesSquare },
  ],
  veterinario: [
    { href: '/veterinario/agenda', etiqueta: 'Mi agenda', icono: Calendar },
    { href: '/veterinario/turnos', etiqueta: 'Mis turnos', icono: Stethoscope },
    { href: '/veterinario/pacientes', etiqueta: 'Mis pacientes', icono: PawPrint },
    { href: '/veterinario/productos', etiqueta: 'Mi catálogo de productos', icono: Store },
    { href: '/veterinario/pedidos', etiqueta: 'Pedidos recibidos', icono: Package },
    {
      href: '/veterinario/historiales-compartidos',
      etiqueta: 'Historiales compartidos',
      icono: FileText,
    },
    { href: '/reportes', etiqueta: 'Reportes de la comunidad', icono: Megaphone },
    {
      href: '/red-colaboracion/solicitudes',
      etiqueta: 'Solicitudes de la Red de Colaboración',
      icono: Handshake,
    },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable', icono: GraduationCap },
    { href: '/foro', etiqueta: 'Foro de bienestar animal', icono: MessagesSquare },
  ],
  municipio: [
    { href: '/municipio/dashboard', etiqueta: 'Panel de reportes', icono: BarChart3 },
    { href: '/municipio/eventos', etiqueta: 'Calendario de operativos', icono: Calendar },
    { href: '/municipio/eventos/nuevo', etiqueta: 'Publicar operativo', icono: CalendarPlus },
    { href: '/municipio/turnera', etiqueta: 'Turnera municipal', icono: Stethoscope },
    { href: '/municipio/adopciones', etiqueta: 'Vitrina de adopción', icono: Home },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable', icono: GraduationCap },
    { href: '/foro', etiqueta: 'Foro de bienestar animal', icono: MessagesSquare },
  ],
  administrador: [
    { href: '/admin/verificaciones', etiqueta: 'Cola de verificaciones', icono: CheckCircle2 },
    { href: '/admin/auditoria', etiqueta: 'Historial de auditoría', icono: ClipboardList },
    { href: '/foro', etiqueta: 'Foro de bienestar animal', icono: MessagesSquare },
  ],
  comerciante: [
    { href: '/comercios/panel', etiqueta: 'Mi comercio', icono: Store },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable', icono: GraduationCap },
    { href: '/foro', etiqueta: 'Foro de bienestar animal', icono: MessagesSquare },
  ],
  organizacion: [
    { href: '/red-colaboracion/solicitudes', etiqueta: 'Solicitudes de recurso', icono: Handshake },
    { href: '/red-colaboracion/directorio', etiqueta: 'Directorio de aliados', icono: Contact },
    { href: '/red-colaboracion/buscar', etiqueta: 'Buscar reportes similares', icono: Search },
    { href: '/red-colaboracion/metricas', etiqueta: 'Mis métricas', icono: BarChart3 },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable', icono: GraduationCap },
    { href: '/foro', etiqueta: 'Foro de bienestar animal', icono: MessagesSquare },
  ],
  rescatista: [
    { href: '/red-colaboracion/solicitudes', etiqueta: 'Solicitudes de recurso', icono: Handshake },
    { href: '/red-colaboracion/directorio', etiqueta: 'Directorio de aliados', icono: Contact },
    { href: '/red-colaboracion/metricas', etiqueta: 'Mis métricas', icono: BarChart3 },
    { href: '/cursos', etiqueta: 'Cursos de tenencia responsable', icono: GraduationCap },
    { href: '/foro', etiqueta: 'Foro de bienestar animal', icono: MessagesSquare },
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
