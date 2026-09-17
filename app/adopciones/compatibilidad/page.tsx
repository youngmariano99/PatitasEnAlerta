'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';

interface CuestionarioApi {
  horasSoloEstimadas: number | null;
  presenciaNinos: boolean | null;
  espacioDisponible: string | null;
  experienciaPrevia: string | null;
}

interface SugerenciaApi {
  id: string;
  vitrinaAdopcionId: string;
  scoreCompatibilidad: number;
  metodo: string;
}

interface FichaApi {
  id: string;
  nombreAnimal: string;
  especie: string;
  fotoUrl: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const ESPACIOS = [
  { valor: 'departamento', etiqueta: 'Departamento' },
  { valor: 'casa_patio_pequeño', etiqueta: 'Casa con patio pequeño' },
  { valor: 'casa_patio_grande', etiqueta: 'Casa con patio grande' },
] as const;

export default function PaginaCompatibilidadAdopcion() {
  const [cuestionario, setCuestionario] = useState<CuestionarioApi | null>(null);
  const [cargando, setCargando] = useState(true);

  const [horasSoloEstimadas, setHorasSoloEstimadas] = useState('');
  const [presenciaNinos, setPresenciaNinos] = useState('');
  const [espacioDisponible, setEspacioDisponible] = useState('');
  const [experienciaPrevia, setExperienciaPrevia] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);

  const [sugerencias, setSugerencias] = useState<SugerenciaApi[]>([]);
  const [fichas, setFichas] = useState<Record<string, FichaApi>>({});
  const [generando, setGenerando] = useState(false);
  const [errorSugerencias, setErrorSugerencias] = useState<string | null>(null);

  const cargarCuestionario = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/adopcion-compatibilidad/cuestionario');
      if (respuesta.status === 404) {
        setCargando(false);
        return;
      }
      if (!respuesta.ok) {
        setCargando(false);
        return;
      }
      const datos = (await respuesta.json()) as CuestionarioApi;
      setCuestionario(datos);
      setHorasSoloEstimadas(
        datos.horasSoloEstimadas != null ? String(datos.horasSoloEstimadas) : '',
      );
      setPresenciaNinos(datos.presenciaNinos != null ? String(datos.presenciaNinos) : '');
      setEspacioDisponible(datos.espacioDisponible ?? '');
      setExperienciaPrevia(datos.experienciaPrevia ?? '');
      setCargando(false);
    } catch {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarCuestionario();
  }, [cargarCuestionario]);

  async function guardarCuestionario(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGuardando(true);
    setErrorGuardado(null);
    setGuardadoOk(false);

    try {
      const respuesta = await fetchConSesion('/api/adopcion-compatibilidad/cuestionario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horasSoloEstimadas: horasSoloEstimadas ? Number(horasSoloEstimadas) : null,
          presenciaNinos: presenciaNinos ? presenciaNinos === 'true' : null,
          espacioDisponible: espacioDisponible || null,
          experienciaPrevia: experienciaPrevia || null,
        }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorGuardado(cuerpo.mensaje);
        setGuardando(false);
        return;
      }

      setCuestionario(await respuesta.json());
      setGuardadoOk(true);
      setGuardando(false);
    } catch {
      setErrorGuardado(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setGuardando(false);
    }
  }

  async function generarSugerencias() {
    setGenerando(true);
    setErrorSugerencias(null);

    try {
      const [respuestaSugerencias, respuestaFichas] = await Promise.all([
        fetchConSesion('/api/adopcion-compatibilidad/sugerencias', { method: 'POST' }),
        fetch('/api/adopciones?porPagina=50'),
      ]);

      if (!respuestaSugerencias.ok) {
        const cuerpo = (await respuestaSugerencias.json()) as RespuestaError;
        setErrorSugerencias(cuerpo.mensaje);
        setGenerando(false);
        return;
      }

      const datosSugerencias = (await respuestaSugerencias.json()) as SugerenciaApi[];
      const datosFichas = (await respuestaFichas.json()) as { items: FichaApi[] };
      const mapaFichas = Object.fromEntries(datosFichas.items.map((f) => [f.id, f]));

      setSugerencias(
        datosSugerencias.sort((a, b) => b.scoreCompatibilidad - a.scoreCompatibilidad),
      );
      setFichas(mapaFichas);
      setGenerando(false);
    } catch {
      setErrorSugerencias(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setGenerando(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Registro.png"
          alt="Mascota ayudando a completar un cuestionario"
          titulo="Compatibilidad de adopción"
          descripcion="Contanos sobre tu estilo de vida y te sugerimos las mascotas en adopción más compatibles."
        />
      </div>

      {!cargando ? (
        <form onSubmit={guardarCuestionario} noValidate className="mb-8 flex flex-col gap-4">
          <CampoTexto
            id="horasSoloEstimadas"
            label="¿Cuántas horas por día estaría sola la mascota? (opcional)"
            type="number"
            min={0}
            max={24}
            value={horasSoloEstimadas}
            onChange={(e) => setHorasSoloEstimadas(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="presenciaNinos" className="text-sm font-medium text-text-primary">
              ¿Hay niños en casa? (opcional)
            </label>
            <select
              id="presenciaNinos"
              value={presenciaNinos}
              onChange={(e) => setPresenciaNinos(e.target.value)}
              className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Preferís no decir</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="espacioDisponible" className="text-sm font-medium text-text-primary">
              Espacio disponible (opcional)
            </label>
            <select
              id="espacioDisponible"
              value={espacioDisponible}
              onChange={(e) => setEspacioDisponible(e.target.value)}
              className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Elegí una opción</option>
              {ESPACIOS.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <CampoTexto
            id="experienciaPrevia"
            label="Experiencia previa con mascotas (opcional)"
            placeholder="Tuvo un gato durante 5 años…"
            value={experienciaPrevia}
            onChange={(e) => setExperienciaPrevia(e.target.value)}
            error={errorGuardado ?? undefined}
          />

          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cuestionario'}
          </Boton>
          {guardadoOk ? <p className="text-sm text-success">Cuestionario guardado.</p> : null}
        </form>
      ) : (
        <p className="mb-8 text-sm text-text-muted">Cargando…</p>
      )}

      <div className="border-t border-surface2 pt-6">
        <Boton onClick={generarSugerencias} disabled={generando || !cuestionario}>
          {generando ? 'Generando…' : 'Ver sugerencias de compatibilidad'}
        </Boton>
        {!cuestionario && !cargando ? (
          <p className="mt-2 text-sm text-text-muted">
            Completá el cuestionario para poder generar sugerencias.
          </p>
        ) : null}

        {errorSugerencias ? (
          <p className="mt-4 flex items-center gap-1.5 text-sm text-danger">
            <span aria-hidden="true">⚠️</span>
            {errorSugerencias}
          </p>
        ) : null}

        {sugerencias.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2">
            {sugerencias.map((sugerencia) => {
              const ficha = fichas[sugerencia.vitrinaAdopcionId];
              return (
                <li key={sugerencia.id}>
                  <Tarjeta className="flex items-center gap-3">
                    {ficha ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ficha.fotoUrl}
                        alt={ficha.nombreAnimal}
                        className="h-14 w-14 shrink-0 rounded-md object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="font-medium text-text-primary">
                        {ficha ? ficha.nombreAnimal : 'Ficha'}
                      </p>
                      <p className="font-mono text-sm text-text-muted">
                        {Math.round(sugerencia.scoreCompatibilidad * 100)}% de compatibilidad
                      </p>
                    </div>
                  </Tarjeta>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
