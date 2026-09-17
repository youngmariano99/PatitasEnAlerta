'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';

interface HistorialApi {
  id: string;
  mascotaId: string;
  veterinarioDestinoId: string;
  autorizadoEn: string;
  revocadoEn: string | null;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

/**
 * Detrás de `FEATURE_HISTORIALES_COMPARTIDOS` (`.env.example`, hoy `false`
 * por defecto): mientras el marco de responsabilidad profesional no esté
 * aprobado, tanto `GET` como `POST` devuelven 403 (PEA-SIS-002) — se trata
 * como "función deshabilitada", no como un error de sesión o de permisos.
 */
export default function PaginaHistorialesCompartidos() {
  const [historiales, setHistoriales] = useState<HistorialApi[] | null>(null);
  const [deshabilitada, setDeshabilitada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mascotaId, setMascotaId] = useState('');
  const [veterinarioDestinoId, setVeterinarioDestinoId] = useState('');
  const [compartiendo, setCompartiendo] = useState(false);
  const [errorCompartir, setErrorCompartir] = useState<string | null>(null);

  const cargarHistoriales = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/veterinarios/historiales-compartidos');
      if (respuesta.status === 403) {
        setDeshabilitada(true);
        return;
      }
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      setHistoriales((await respuesta.json()) as HistorialApi[]);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarHistoriales();
  }, [cargarHistoriales]);

  async function compartirHistorial(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCompartiendo(true);
    setErrorCompartir(null);

    try {
      const respuesta = await fetchConSesion('/api/veterinarios/historiales-compartidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mascotaId, veterinarioDestinoId }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorCompartir(cuerpo.mensaje);
        setCompartiendo(false);
        return;
      }

      setMascotaId('');
      setVeterinarioDestinoId('');
      setCompartiendo(false);
      await cargarHistoriales();
    } catch {
      setErrorCompartir(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setCompartiendo(false);
    }
  }

  async function revocar(id: string) {
    const respuesta = await fetchConSesion(
      `/api/veterinarios/historiales-compartidos/${id}/revocar`,
      {
        method: 'PATCH',
      },
    );
    if (respuesta.ok) {
      await cargarHistoriales();
    }
  }

  if (deshabilitada) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <EstadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota esperando a que se habilite la función"
          titulo="Todavía no está disponible"
          descripcion="Compartir historiales entre veterinarios va a habilitarse una vez que se apruebe el marco de responsabilidad profesional correspondiente."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota compartiendo su historial clínico"
          titulo="Historiales compartidos"
          descripcion="Compartí el historial clínico de una mascota con otro veterinario, con autorización explícita y revocable en cualquier momento."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      <form onSubmit={compartirHistorial} noValidate className="flex flex-col gap-3">
        <CampoTexto
          id="mascotaId"
          label="Id de la mascota"
          value={mascotaId}
          onChange={(e) => setMascotaId(e.target.value)}
          required
        />
        <CampoTexto
          id="veterinarioDestinoId"
          label="Id del veterinario/a destino"
          value={veterinarioDestinoId}
          onChange={(e) => setVeterinarioDestinoId(e.target.value)}
          error={errorCompartir ?? undefined}
          required
        />
        <Boton
          type="submit"
          disabled={compartiendo || !mascotaId.trim() || !veterinarioDestinoId.trim()}
        >
          {compartiendo ? 'Compartiendo…' : 'Compartir historial'}
        </Boton>
      </form>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">
          Compartidos por mí
        </h2>
        {historiales === null && !error ? (
          <p className="text-sm text-text-muted">Cargando…</p>
        ) : null}
        {historiales && historiales.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no compartiste ningún historial.</p>
        ) : null}
        {historiales && historiales.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {historiales.map((historial) => (
              <li key={historial.id}>
                <Tarjeta className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-text-primary">Mascota: {historial.mascotaId}</p>
                    <p className="text-sm text-text-muted">
                      Destino: {historial.veterinarioDestinoId}
                    </p>
                  </div>
                  {historial.revocadoEn ? (
                    <Badge tono="peligro">Revocado</Badge>
                  ) : (
                    <Boton variante="texto" onClick={() => revocar(historial.id)}>
                      Revocar
                    </Boton>
                  )}
                </Tarjeta>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
