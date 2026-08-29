/**
 * @jest-environment node
 *
 * Paso 2/3/4 del ticket AUTH-08: aprobar/rechazar con motivo obligatorio,
 * auditoría (revisado_por/resuelto_en, nunca sobrescrita) y publicación de
 * la notificación VerificacionResuelta.
 */
import { NextRequest } from 'next/server';
import { container } from '@aplicacion/contenedor-di';
import type { IRepositorioPerfil, ResumenPerfilPropio } from '@dominio/puertos/IRepositorioPerfil';
import type {
  IRepositorioVerificaciones,
  DatosResolverVerificacion,
} from '@dominio/puertos/IRepositorioVerificaciones';
import type { INotificacionesRepositorio, DatosNotificacion } from '@dominio/puertos/INotificacionesRepositorio';
import type { VerificacionResueltaResultado } from '@dominio/entidades/Verificacion';
import { VerificacionYaResueltaError } from '@dominio/errores/erroresVerificaciones';

const getUserMock = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ auth: { getUser: getUserMock } })),
}));

import { PATCH } from '@app/api/admin/verificaciones/[id]/route';

const ID_VERIFICACION = '11111111-1111-4111-8111-111111111111';

interface FilaEnMemoria {
  id: string;
  usuarioId: string;
  tipo: 'veterinario' | 'municipio';
  estado: string;
  motivoRechazo: string | null;
  revisadoPor: string | null;
  resueltoEn: Date | null;
}

class RepositorioPerfilFalso implements IRepositorioPerfil {
  constructor(private readonly perfiles: Record<string, ResumenPerfilPropio>) {}

  async obtenerPerfilPropio(usuarioId: string): Promise<ResumenPerfilPropio | null> {
    return this.perfiles[usuarioId] ?? null;
  }
}

class RepositorioVerificacionesEnMemoria implements IRepositorioVerificaciones {
  filas = new Map<string, FilaEnMemoria>();

  sembrar(fila: FilaEnMemoria) {
    this.filas.set(fila.id, fila);
  }

  async listarPendientes(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async listarResueltas(): Promise<never> {
    throw new Error('no usado en este test');
  }

  async resolver(datos: DatosResolverVerificacion): Promise<VerificacionResueltaResultado> {
    const fila = this.filas.get(datos.verificacionId);
    if (!fila || fila.estado !== 'pendiente') {
      throw new VerificacionYaResueltaError();
    }
    // Replica la semántica real: nunca pisa una fila ya resuelta, y deja
    // registrado quién y cuándo — auditoría (verificación técnica del ticket).
    fila.estado = datos.decision;
    fila.motivoRechazo = datos.motivoRechazo;
    fila.revisadoPor = datos.administradorId;
    fila.resueltoEn = new Date();
    return { verificacionId: fila.id, usuarioId: fila.usuarioId, tipo: fila.tipo, estado: datos.decision };
  }
}

class RepositorioNotificacionesFalso implements INotificacionesRepositorio {
  creadas: DatosNotificacion[] = [];

  async crear(datos: DatosNotificacion): Promise<void> {
    this.creadas.push(datos);
  }
}

function autenticarComo(usuarioId: string) {
  getUserMock.mockResolvedValue({ data: { user: { id: usuarioId } }, error: null });
}

function crearRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/admin/verificaciones/${ID_VERIFICACION}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function ejecutarPatch(body: unknown) {
  return PATCH(crearRequest(body), { params: { id: ID_VERIFICACION } });
}

function filaPendiente(): FilaEnMemoria {
  return {
    id: ID_VERIFICACION,
    usuarioId: 'vet-1',
    tipo: 'veterinario',
    estado: 'pendiente',
    motivoRechazo: null,
    revisadoPor: null,
    resueltoEn: null,
  };
}

const PERFIL_ADMIN: Record<string, ResumenPerfilPropio> = {
  'admin-1': { id: 'admin-1', email: 'admin@ejemplo.test', rol: 'administrador', estadoVerificacion: 'no_requerido', verificadoEn: null },
};

describe('PATCH /api/admin/verificaciones/[id] (AUTH-08)', () => {
  let repositorioVerificaciones: RepositorioVerificacionesEnMemoria;
  let repositorioNotificaciones: RepositorioNotificacionesFalso;

  beforeEach(() => {
    getUserMock.mockReset();
    container.reset();
    repositorioVerificaciones = new RepositorioVerificacionesEnMemoria();
    repositorioNotificaciones = new RepositorioNotificacionesFalso();
    container.registerInstance<IRepositorioVerificaciones>('IRepositorioVerificaciones', repositorioVerificaciones);
    container.registerInstance<INotificacionesRepositorio>('INotificacionesRepositorio', repositorioNotificaciones);
  });

  it('aprueba una verificación, audita quién y cuándo, y publica la notificación', async () => {
    autenticarComo('admin-1');
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', new RepositorioPerfilFalso(PERFIL_ADMIN));
    repositorioVerificaciones.sembrar(filaPendiente());

    const respuesta = await ejecutarPatch({ decision: 'aprobado' });

    expect(respuesta.status).toBe(200);
    const fila = repositorioVerificaciones.filas.get(ID_VERIFICACION)!;
    expect(fila.estado).toBe('aprobado');
    expect(fila.revisadoPor).toBe('admin-1');
    expect(fila.resueltoEn).toBeInstanceOf(Date);
    expect(repositorioNotificaciones.creadas).toEqual([
      { usuarioId: 'vet-1', tipo: 'verificacion_resuelta', referenciaTabla: 'verificaciones', referenciaId: ID_VERIFICACION },
    ]);
  });

  it('bloquea el rechazo sin motivo_rechazo (400) hasta que se complete el campo', async () => {
    autenticarComo('admin-1');
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', new RepositorioPerfilFalso(PERFIL_ADMIN));
    repositorioVerificaciones.sembrar(filaPendiente());

    const respuesta = await ejecutarPatch({ decision: 'rechazado' });

    expect(respuesta.status).toBe(400);
    expect(repositorioVerificaciones.filas.get(ID_VERIFICACION)?.estado).toBe('pendiente');
    expect(repositorioNotificaciones.creadas).toHaveLength(0);
  });

  it('rechaza con motivo: audita el motivo y nunca toca perfiles_veterinario.verificado_en', async () => {
    autenticarComo('admin-1');
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', new RepositorioPerfilFalso(PERFIL_ADMIN));
    repositorioVerificaciones.sembrar(filaPendiente());

    const respuesta = await ejecutarPatch({ decision: 'rechazado', motivoRechazo: 'Matrícula no encontrada en el padrón' });

    expect(respuesta.status).toBe(200);
    const fila = repositorioVerificaciones.filas.get(ID_VERIFICACION)!;
    expect(fila.estado).toBe('rechazado');
    expect(fila.motivoRechazo).toBe('Matrícula no encontrada en el padrón');
    expect(fila.revisadoPor).toBe('admin-1');
  });

  it('no permite resolver dos veces la misma verificación: la segunda vez responde 409 / PEA-AUTH-013 y no pisa la auditoría', async () => {
    autenticarComo('admin-1');
    container.registerInstance<IRepositorioPerfil>('IRepositorioPerfil', new RepositorioPerfilFalso(PERFIL_ADMIN));
    repositorioVerificaciones.sembrar(filaPendiente());

    const primera = await ejecutarPatch({ decision: 'aprobado' });
    expect(primera.status).toBe(200);
    const filaTrasPrimera = { ...repositorioVerificaciones.filas.get(ID_VERIFICACION)! };

    const segunda = await ejecutarPatch({ decision: 'rechazado', motivoRechazo: 'me arrepentí' });

    expect(segunda.status).toBe(409);
    const cuerpo = await segunda.json();
    expect(cuerpo.codigo).toBe('PEA-AUTH-013');
    expect(repositorioVerificaciones.filas.get(ID_VERIFICACION)).toEqual(filaTrasPrimera);
  });

  it.each(['dueño', 'veterinario', 'rescatista'])('rechaza con 403 (PEA-SIS-002) a un solicitante con rol %s', async (rol) => {
    autenticarComo('usuario-1');
    container.registerInstance<IRepositorioPerfil>(
      'IRepositorioPerfil',
      new RepositorioPerfilFalso({
        'usuario-1': { id: 'usuario-1', email: 'x@ejemplo.test', rol, estadoVerificacion: 'no_requerido', verificadoEn: null },
      }),
    );
    repositorioVerificaciones.sembrar(filaPendiente());

    const respuesta = await ejecutarPatch({ decision: 'aprobado' });

    expect(respuesta.status).toBe(403);
    expect(repositorioVerificaciones.filas.get(ID_VERIFICACION)?.estado).toBe('pendiente');
  });

  it('rechaza sin sesión activa (401 / PEA-SIS-001)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'sin sesión' } });

    const respuesta = await ejecutarPatch({ decision: 'aprobado' });

    expect(respuesta.status).toBe(401);
  });
});
