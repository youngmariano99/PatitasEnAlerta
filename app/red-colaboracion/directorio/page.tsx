'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';
import { ROLES_DIRECTORIO_ALIADOS } from '@dominio/puertos/IRepositorioDirectorioAliados';

const ETIQUETAS_ROL: Record<(typeof ROLES_DIRECTORIO_ALIADOS)[number], string> = {
  organizacion: 'Organización/ONG',
  veterinario: 'Veterinario/a',
  rescatista: 'Rescatista',
};

interface AliadoApi {
  id: string;
  rol: string;
  email: string;
  estadoVerificacion: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

export default function PaginaDirectorioAliados() {
  const [aliados, setAliados] = useState<AliadoApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtroRol, setFiltroRol] = useState<(typeof ROLES_DIRECTORIO_ALIADOS)[number] | ''>('');

  const cargarDirectorio = useCallback(async (rol: string) => {
    try {
      const params = new URLSearchParams({ porPagina: '50' });
      if (rol) params.set('rol', rol);
      const respuesta = await fetchConSesion(
        `/api/red-colaboracion/directorio?${params.toString()}`,
      );
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as { items: AliadoApi[] };
      setAliados(datos.items);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarDirectorio(filtroRol);
  }, [filtroRol, cargarDirectorio]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/ONGs y rescatistas.png"
          alt="Mascotas abrazadas representando a la red de colaboración"
          titulo="Directorio de aliados"
          descripcion="Organizaciones, veterinarios y rescatistas verificados de la Red de Colaboración."
        />
      </div>

      <div className="mb-6 flex flex-col gap-1.5">
        <label htmlFor="filtroRol" className="text-sm font-medium text-text-primary">
          Rol
        </label>
        <select
          id="filtroRol"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value as typeof filtroRol)}
          className="h-11 min-h-[44px] w-fit rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="">Todos</option>
          {ROLES_DIRECTORIO_ALIADOS.map((rol) => (
            <option key={rol} value={rol}>
              {ETIQUETAS_ROL[rol]}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {aliados === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
      {aliados && aliados.length === 0 ? (
        <p className="text-sm text-text-muted">No hay aliados que coincidan con este filtro.</p>
      ) : null}

      {aliados && aliados.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {aliados.map((aliado) => (
            <li key={aliado.id}>
              <Tarjeta>
                <p className="font-medium text-text-primary">{aliado.email}</p>
                <Badge tono="neutro">
                  {ETIQUETAS_ROL[aliado.rol as (typeof ROLES_DIRECTORIO_ALIADOS)[number]] ??
                    aliado.rol}
                </Badge>
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
