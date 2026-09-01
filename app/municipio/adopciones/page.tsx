'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { TAMANOS_FICHA_ADOPCION_SOPORTADOS, type TamanoFichaAdopcion } from '@aplicacion/dtos/municipio/FichaAdopcionDto';
import { ESTADOS_FICHA_ADOPCION_SOPORTADOS, type EstadoFichaAdopcion } from '@dominio/entidades/FichaAdopcion';

const POR_PAGINA = 50;

const ETIQUETAS_ESTADO: Record<EstadoFichaAdopcion, { texto: string; icono: string }> = {
  disponible: { texto: 'Disponible', icono: '🐾' },
  adoptado: { texto: 'Adoptado', icono: '✅' },
  baja: { texto: 'De baja', icono: '⏹️' },
};

interface FichaApi {
  id: string;
  municipioId: string;
  nombreAnimal: string;
  especie: string;
  edadAproximada: number | null;
  tamano: string | null;
  temperamento: string | null;
  estadoSalud: string | null;
  requisitosAdopcion: string | null;
  fotoUrl: string;
  estado: string;
  createdAt: string;
}

interface RespuestaListado {
  items: FichaApi[];
  total: number;
  pagina: number;
  porPagina: number;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function badgeEstado(estado: string) {
  const info = ETIQUETAS_ESTADO[estado as EstadoFichaAdopcion] ?? { texto: estado, icono: '•' };
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden="true">{info.icono}</span>
      {info.texto}
    </span>
  );
}

interface DatosFormularioFicha {
  nombreAnimal: string;
  especie: string;
  fotoUrl: string;
  edadAproximada: string;
  tamano: TamanoFichaAdopcion | '';
  temperamento: string;
  estadoSalud: string;
  requisitosAdopcion: string;
}

const FORMULARIO_VACIO: DatosFormularioFicha = {
  nombreAnimal: '',
  especie: '',
  fotoUrl: '',
  edadAproximada: '',
  tamano: '',
  temperamento: '',
  estadoSalud: '',
  requisitosAdopcion: '',
};

function cuerpoDesdeFormulario(datos: DatosFormularioFicha) {
  return {
    nombreAnimal: datos.nombreAnimal,
    especie: datos.especie,
    fotoUrl: datos.fotoUrl,
    edadAproximada: datos.edadAproximada ? Number(datos.edadAproximada) : undefined,
    tamano: datos.tamano || undefined,
    temperamento: datos.temperamento.trim() || undefined,
    estadoSalud: datos.estadoSalud.trim() || undefined,
    requisitosAdopcion: datos.requisitosAdopcion.trim() || undefined,
  };
}

interface CamposFichaProps {
  datos: DatosFormularioFicha;
  onCambiar: (datos: DatosFormularioFicha) => void;
  prefijoId: string;
}

/** Campos compartidos por "Publicar ficha" y la edición inline de una fila. */
function CamposFicha({ datos, onCambiar, prefijoId }: CamposFichaProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CampoTexto
        id={`${prefijoId}-nombreAnimal`}
        label="Nombre del animal"
        placeholder="Luna"
        value={datos.nombreAnimal}
        onChange={(evento) => onCambiar({ ...datos, nombreAnimal: evento.target.value })}
        required
      />
      <CampoTexto
        id={`${prefijoId}-especie`}
        label="Especie"
        placeholder="Perro, gato…"
        value={datos.especie}
        onChange={(evento) => onCambiar({ ...datos, especie: evento.target.value })}
        required
      />
      <CampoTexto
        id={`${prefijoId}-fotoUrl`}
        label="URL de la foto"
        placeholder="https://res.cloudinary.com/…"
        value={datos.fotoUrl}
        onChange={(evento) => onCambiar({ ...datos, fotoUrl: evento.target.value })}
        required
      />
      <CampoTexto
        id={`${prefijoId}-edadAproximada`}
        label="Edad aproximada en años (opcional)"
        type="number"
        min={0}
        placeholder="3"
        value={datos.edadAproximada}
        onChange={(evento) => onCambiar({ ...datos, edadAproximada: evento.target.value })}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${prefijoId}-tamano`} className="text-sm font-medium text-slate-50">
          Tamaño (opcional)
        </label>
        <select
          id={`${prefijoId}-tamano`}
          value={datos.tamano}
          onChange={(evento) => onCambiar({ ...datos, tamano: evento.target.value as TamanoFichaAdopcion | '' })}
          className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sin especificar</option>
          {TAMANOS_FICHA_ADOPCION_SOPORTADOS.map((valor) => (
            <option key={valor} value={valor}>
              {valor[0]!.toUpperCase() + valor.slice(1)}
            </option>
          ))}
        </select>
      </div>
      <CampoTexto
        id={`${prefijoId}-temperamento`}
        label="Temperamento (opcional)"
        placeholder="Sociable, tranquilo…"
        value={datos.temperamento}
        onChange={(evento) => onCambiar({ ...datos, temperamento: evento.target.value })}
      />
      <CampoTexto
        id={`${prefijoId}-estadoSalud`}
        label="Estado de salud (opcional)"
        placeholder="Castrado, vacunas al día"
        value={datos.estadoSalud}
        onChange={(evento) => onCambiar({ ...datos, estadoSalud: evento.target.value })}
      />
      <CampoTexto
        id={`${prefijoId}-requisitosAdopcion`}
        label="Requisitos de adopción (opcional)"
        placeholder="Vivienda con patio, visita previa"
        value={datos.requisitosAdopcion}
        onChange={(evento) => onCambiar({ ...datos, requisitosAdopcion: evento.target.value })}
      />
    </div>
  );
}

/**
 * Panel municipal de la vitrina de adopción (Módulo 3, "Gestión de la
 * vitrina de adopción institucional"). middleware.ts ya exige rol
 * municipio/administrador para llegar a esta ruta (prefijo `/municipio`).
 * Publica, edita y da de baja fichas contra
 * POST/PATCH/DELETE /api/municipio/adopciones — la baja es siempre soft
 * (`estado='baja'`), nunca elimina la fila (Paso 3).
 */
export default function PaginaAdopcionesMunicipio() {
  const [items, setItems] = useState<FichaApi[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState<EstadoFichaAdopcion | ''>('');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [formularioNuevo, setFormularioNuevo] = useState<DatosFormularioFicha>(FORMULARIO_VACIO);
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);

  const [idEnEdicion, setIdEnEdicion] = useState<string | null>(null);
  const [formularioEdicion, setFormularioEdicion] = useState<DatosFormularioFicha>(FORMULARIO_VACIO);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  const [idDandoBaja, setIdDandoBaja] = useState<string | null>(null);
  const [errorBaja, setErrorBaja] = useState<string | null>(null);

  const cargarPagina = useCallback(
    async (paginaSolicitada: number) => {
      setCargando(true);
      setErrorCarga(null);
      try {
        const params = new URLSearchParams({ pagina: String(paginaSolicitada), porPagina: String(POR_PAGINA) });
        if (filtroEstado) params.set('estado', filtroEstado);

        const respuesta = await fetch(`/api/municipio/adopciones?${params.toString()}`);
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json()) as RespuestaError;
          setErrorCarga(cuerpo.mensaje);
          return;
        }
        const datos = (await respuesta.json()) as RespuestaListado;
        setItems(datos.items);
        setTotal(datos.total);
        setPagina(datos.pagina);
      } catch {
        setErrorCarga('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
      } finally {
        setCargando(false);
      }
    },
    [filtroEstado],
  );

  useEffect(() => {
    cargarPagina(1);
  }, [cargarPagina]);

  async function manejarPublicar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErrorPublicar(null);
    setPublicando(true);
    try {
      const respuesta = await fetch('/api/municipio/adopciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoDesdeFormulario(formularioNuevo)),
      });
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorPublicar(cuerpo.mensaje);
        return;
      }
      setFormularioNuevo(FORMULARIO_VACIO);
      await cargarPagina(1);
    } catch {
      setErrorPublicar('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setPublicando(false);
    }
  }

  function iniciarEdicion(ficha: FichaApi) {
    setIdEnEdicion(ficha.id);
    setErrorEdicion(null);
    setFormularioEdicion({
      nombreAnimal: ficha.nombreAnimal,
      especie: ficha.especie,
      fotoUrl: ficha.fotoUrl,
      edadAproximada: ficha.edadAproximada?.toString() ?? '',
      tamano: (ficha.tamano as TamanoFichaAdopcion | null) ?? '',
      temperamento: ficha.temperamento ?? '',
      estadoSalud: ficha.estadoSalud ?? '',
      requisitosAdopcion: ficha.requisitosAdopcion ?? '',
    });
  }

  async function guardarEdicion(id: string) {
    setGuardandoEdicion(true);
    setErrorEdicion(null);
    try {
      const respuesta = await fetch(`/api/municipio/adopciones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoDesdeFormulario(formularioEdicion)),
      });
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorEdicion(cuerpo.mensaje);
        return;
      }
      const actualizada = (await respuesta.json()) as FichaApi;
      setItems((actuales) => actuales.map((item) => (item.id === id ? actualizada : item)));
      setIdEnEdicion(null);
    } catch {
      setErrorEdicion('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function darDeBaja(id: string) {
    setIdDandoBaja(id);
    setErrorBaja(null);
    try {
      const respuesta = await fetch(`/api/municipio/adopciones/${id}`, { method: 'DELETE' });
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorBaja(cuerpo.mensaje);
        return;
      }
      const actualizada = (await respuesta.json()) as FichaApi;
      setItems((actuales) => actuales.map((item) => (item.id === id ? actualizada : item)));
    } catch {
      setErrorBaja('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setIdDandoBaja(null);
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-slate-50">
      <h1 className="mb-1 text-xl font-semibold">Vitrina de adopción</h1>
      <p className="mb-6 text-sm text-slate-400">Publicá, editá y dá de baja fichas de animales en adopción.</p>

      <form
        onSubmit={manejarPublicar}
        className="mb-10 flex flex-col gap-4 rounded-md border border-slate-700 bg-slate-800/50 p-5"
      >
        <h2 className="text-base font-semibold">Publicar nueva ficha</h2>
        <CamposFicha datos={formularioNuevo} onCambiar={setFormularioNuevo} prefijoId="nueva" />

        {errorPublicar ? (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <span aria-hidden="true">⚠️</span>
            {errorPublicar}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={publicando || !formularioNuevo.nombreAnimal.trim() || !formularioNuevo.especie.trim() || !formularioNuevo.fotoUrl.trim()}
          className="h-11 min-h-[44px] self-start rounded-md bg-blue-500 px-4 text-[15px] font-medium text-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {publicando ? 'Publicando…' : 'Publicar ficha'}
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filtro-estado" className="text-xs font-medium text-slate-400">
            Estado
          </label>
          <select
            id="filtro-estado"
            value={filtroEstado}
            onChange={(evento) => setFiltroEstado(evento.target.value as EstadoFichaAdopcion | '')}
            className="h-11 min-h-[44px] rounded-md border border-slate-700 bg-slate-800 px-3 text-[15px] text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {ESTADOS_FICHA_ADOPCION_SOPORTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {ETIQUETAS_ESTADO[valor].texto}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorCarga ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {errorCarga}
        </p>
      ) : null}

      {errorBaja ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-red-500">
          <span aria-hidden="true">⚠️</span>
          {errorBaja}
        </p>
      ) : null}

      {cargando ? <p className="text-sm text-slate-400">Cargando…</p> : null}

      {!cargando && !errorCarga && items.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-700 p-8 text-center">
          <p className="text-sm font-medium text-slate-50">No hay fichas para estos filtros.</p>
        </div>
      ) : null}

      {!cargando && !errorCarga && items.length > 0 ? (
        <div className="flex flex-col gap-4">
          {items.map((ficha) =>
            idEnEdicion === ficha.id ? (
              <div key={ficha.id} className="rounded-md border border-blue-500 bg-slate-800/50 p-5">
                <p className="mb-3 font-mono text-xs text-slate-400">{ficha.id}</p>
                <CamposFicha datos={formularioEdicion} onCambiar={setFormularioEdicion} prefijoId={`editar-${ficha.id}`} />
                {errorEdicion ? (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-red-500">
                    <span aria-hidden="true">⚠️</span>
                    {errorEdicion}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => guardarEdicion(ficha.id)}
                    disabled={guardandoEdicion}
                    className="h-11 min-h-[44px] rounded-md bg-blue-500 px-4 text-[15px] font-medium text-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdEnEdicion(null)}
                    disabled={guardandoEdicion}
                    className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 text-[15px] font-medium text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={ficha.id}
                data-testid={`fila-ficha-${ficha.id}`}
                className="flex items-center gap-4 rounded-md border border-slate-700 p-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ficha.fotoUrl} alt={ficha.nombreAnimal} className="h-16 w-16 rounded-md object-cover" />
                <div className="flex-1">
                  <p className="font-medium text-slate-50">
                    {ficha.nombreAnimal} <span className="text-slate-400">· {ficha.especie}</span>
                  </p>
                  <p className="text-sm text-slate-300">{badgeEstado(ficha.estado)}</p>
                  <p className="font-mono text-xs text-slate-500">{ficha.id}</p>
                  <p className="font-mono text-xs text-slate-500">{formatearFecha(ficha.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => iniciarEdicion(ficha)}
                    className="h-9 min-h-[36px] rounded-md border border-slate-600 px-3 text-xs font-medium text-slate-300"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => darDeBaja(ficha.id)}
                    disabled={ficha.estado === 'baja' || idDandoBaja === ficha.id}
                    className="h-9 min-h-[36px] rounded-md border border-red-500 px-3 text-xs font-medium text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {idDandoBaja === ficha.id ? 'Dando de baja…' : 'Dar de baja'}
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      ) : null}

      {total > POR_PAGINA ? (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
          <button
            type="button"
            onClick={() => cargarPagina(pagina - 1)}
            disabled={pagina <= 1 || cargando}
            className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="font-mono">
            Página {pagina} de {totalPaginas}
          </span>
          <button
            type="button"
            onClick={() => cargarPagina(pagina + 1)}
            disabled={pagina >= totalPaginas || cargando}
            className="h-11 min-h-[44px] rounded-md border border-slate-600 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </main>
  );
}
