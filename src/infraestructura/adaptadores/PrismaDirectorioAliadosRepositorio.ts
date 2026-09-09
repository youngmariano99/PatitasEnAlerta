import { injectable } from 'tsyringe';
import { prisma } from '@infraestructura/adaptadores/prisma-client';
import type { FiltroZona } from '@dominio/puertos/IRepositorioReportes';
import {
  ROLES_DIRECTORIO_ALIADOS,
  type AliadoDirectorio,
  type FiltrosDirectorioAliados,
  type IRepositorioDirectorioAliados,
  type PaginaDirectorioAliados,
  type RolAliadoDirectorio,
} from '@dominio/puertos/IRepositorioDirectorioAliados';
import { ROL_VETERINARIO_ID } from '@dominio/entidades/PerfilVeterinario';

// Catálogo de roles (docs/SCHEMA.md, Módulo 1 + Módulo 5): 5=rescatista, 7=organizacion.
// 2=veterinario se reutiliza de PerfilVeterinario.ts (ROL_VETERINARIO_ID) en vez de
// redeclararlo acá.
const ID_POR_ROL_ALIADO: Record<RolAliadoDirectorio, number> = {
  organizacion: 7,
  veterinario: ROL_VETERINARIO_ID,
  rescatista: 5,
};

// `rescatista` no tiene flujo de verificación propio (docs/ROLES.md: alta por
// autoregistro sin verificación; docs/SEED.md siembra sus usuarios siempre en
// estado_verificacion='no_requerido') — se lista igual, sin exigirle
// estado_verificacion='verificado' como sí se le exige a organizacion/veterinario.
const ROL_SIN_FLUJO_DE_VERIFICACION: RolAliadoDirectorio = 'rescatista';

// Misma aproximación de "km por grado de latitud" que
// PrismaReporteRepositorio.calcularRangoGeografico (docs/SCHEMA.md no define
// PostGIS/Haversine exacto para este alcance single-tenant). No se extrae a
// un módulo compartido para no modificar ese archivo fuera del alcance de
// esta actividad — ver docs/DECISIONES.md.
const KM_POR_GRADO_LATITUD = 111;

function calcularRangoGeografico(zona: FiltroZona) {
  const deltaLatitud = zona.radioKm / KM_POR_GRADO_LATITUD;
  const kmPorGradoLongitud = KM_POR_GRADO_LATITUD * Math.cos((zona.latitud * Math.PI) / 180);
  const deltaLongitud = kmPorGradoLongitud > 0.001 ? zona.radioKm / kmPorGradoLongitud : 1;

  return {
    latitud: { gte: zona.latitud - deltaLatitud, lte: zona.latitud + deltaLatitud },
    longitud: { gte: zona.longitud - deltaLongitud, lte: zona.longitud + deltaLongitud },
  };
}

@injectable()
export class PrismaDirectorioAliadosRepositorio implements IRepositorioDirectorioAliados {
  async listar(filtros: FiltrosDirectorioAliados, pagina: number, porPagina: number): Promise<PaginaDirectorioAliados> {
    const where = {
      deletedAt: null,
      rolId: filtros.rol ? ID_POR_ROL_ALIADO[filtros.rol] : { in: ROLES_DIRECTORIO_ALIADOS.map((rol) => ID_POR_ROL_ALIADO[rol]) },
      OR: [{ rolId: ID_POR_ROL_ALIADO[ROL_SIN_FLUJO_DE_VERIFICACION] }, { estadoVerificacion: 'verificado' }],
      ...(filtros.zona ? calcularRangoGeografico(filtros.zona) : {}),
    };

    const [filas, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * porPagina,
        take: porPagina,
        select: {
          id: true,
          email: true,
          estadoVerificacion: true,
          latitud: true,
          longitud: true,
          createdAt: true,
          rol: { select: { nombre: true } },
          perfilVeterinario: { select: { matricula: true, colegioEmisor: true } },
        },
      }),
      prisma.usuario.count({ where }),
    ]);

    const items: AliadoDirectorio[] = filas.map((fila) => ({
      id: fila.id,
      rol: fila.rol.nombre,
      email: fila.email,
      estadoVerificacion: fila.estadoVerificacion,
      matricula: fila.perfilVeterinario?.matricula ?? null,
      colegioEmisor: fila.perfilVeterinario?.colegioEmisor ?? null,
      latitud: fila.latitud,
      longitud: fila.longitud,
      createdAt: fila.createdAt,
    }));

    return { items, total, pagina, porPagina };
  }
}
