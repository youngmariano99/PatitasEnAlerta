import type { FiltroZona } from '@dominio/puertos/IRepositorioReportes';

/** Roles considerados "aliados" del directorio (docs/REQUISITOS.md, Módulo 5: "otras ONGs, veterinarios, rescatistas"). */
export const ROLES_DIRECTORIO_ALIADOS = ['organizacion', 'veterinario', 'rescatista'] as const;
export type RolAliadoDirectorio = (typeof ROLES_DIRECTORIO_ALIADOS)[number];

/**
 * Filtros del directorio (ListarDirectorioAliados). "Verificados" no es un
 * filtro más entre otros: se aplica siempre del lado del repositorio (ver
 * PrismaDirectorioAliadosRepositorio) — la Historia es explícitamente
 * "directorio de aliados VERIFICADOS", no un listado general de usuarios.
 */
export interface FiltrosDirectorioAliados {
  rol?: RolAliadoDirectorio;
  zona?: FiltroZona;
}

/**
 * Proyección de una fila de `usuarios` para el directorio. `matricula`/
 * `colegioEmisor` solo se completan para `rol === 'veterinario'` (join con
 * `perfiles_veterinario`): `organizacion` y `rescatista` no tienen tabla de
 * perfil propia hoy (ver docs/DECISIONES.md), así que `email` queda como
 * único identificador visible disponible para esos dos roles.
 */
export interface AliadoDirectorio {
  id: string;
  rol: string;
  email: string;
  estadoVerificacion: string;
  matricula: string | null;
  colegioEmisor: string | null;
  latitud: number | null;
  longitud: number | null;
  createdAt: Date;
}

export interface PaginaDirectorioAliados {
  items: AliadoDirectorio[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * Puerto hacia el directorio de aliados (Módulo 5 — Red de Colaboración,
 * Post-MVP). ListarDirectorioAliados depende únicamente de esta abstracción,
 * nunca de Prisma directamente — mismo criterio que IRepositorioReportes.
 */
export interface IRepositorioDirectorioAliados {
  /** Listado paginado (tope 50) de aliados verificados, filtrable por rol y zona. */
  listar(filtros: FiltrosDirectorioAliados, pagina: number, porPagina: number): Promise<PaginaDirectorioAliados>;
}
