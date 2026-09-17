'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { EstadoIlustrado } from '@presentacion/componentes/estado/EstadoIlustrado';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';

interface PacienteApi {
  mascotaId: string;
  nombre: string;
  especie: string;
  fotoUrl: string;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const TIPOS_ENTRADA = [
  { valor: 'vacuna', etiqueta: 'Vacuna' },
  { valor: 'visita', etiqueta: 'Visita' },
  { valor: 'observacion', etiqueta: 'Observación' },
] as const;

export default function PaginaPacientesVeterinario() {
  const [pacientes, setPacientes] = useState<PacienteApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mascotaSeleccionada, setMascotaSeleccionada] = useState<string | null>(null);

  const [tipo, setTipo] = useState<(typeof TIPOS_ENTRADA)[number]['valor']>('visita');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  const cargarPacientes = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/veterinarios/pacientes');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as PacienteApi[];
      setPacientes(datos);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarPacientes();
  }, [cargarPacientes]);

  function abrirFormulario(mascotaId: string) {
    setMascotaSeleccionada(mascotaId);
    setDescripcion('');
    setErrorGuardado(null);
    setExito(false);
  }

  async function registrarEntrada(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!mascotaSeleccionada) return;
    setGuardando(true);
    setErrorGuardado(null);

    try {
      const respuesta = await fetchConSesion('/api/veterinarios/libreta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mascotaId: mascotaSeleccionada, tipo, descripcion, fecha }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorGuardado(cuerpo.mensaje);
        setGuardando(false);
        return;
      }

      setExito(true);
      setGuardando(false);
    } catch {
      setErrorGuardado(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setGuardando(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota con estetoscopio revisando una ficha clínica"
          titulo="Mis pacientes"
          descripcion="Mascotas que te autorizaron a escribir en su libreta sanitaria."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {pacientes === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}

      {pacientes && pacientes.length === 0 ? (
        <EstadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota esperando su primera autorización"
          titulo="Todavía no tenés pacientes"
          descripcion="Cuando un dueño te autorice desde la libreta sanitaria de su mascota, va a aparecer acá."
        />
      ) : null}

      {pacientes && pacientes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {pacientes.map((paciente) => (
            <li key={paciente.mascotaId}>
              <Tarjeta className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paciente.fotoUrl}
                      alt={`Foto de ${paciente.nombre}`}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                    <div>
                      <p className="font-medium text-text-primary">{paciente.nombre}</p>
                      <p className="text-sm text-text-muted">{paciente.especie}</p>
                    </div>
                  </div>
                  <Boton
                    variante="secundaria"
                    onClick={() =>
                      mascotaSeleccionada === paciente.mascotaId
                        ? setMascotaSeleccionada(null)
                        : abrirFormulario(paciente.mascotaId)
                    }
                  >
                    {mascotaSeleccionada === paciente.mascotaId ? 'Cerrar' : 'Registrar entrada'}
                  </Boton>
                </div>

                {mascotaSeleccionada === paciente.mascotaId ? (
                  exito ? (
                    <p className="text-sm text-success">
                      Entrada registrada en la libreta sanitaria.
                    </p>
                  ) : (
                    <form
                      onSubmit={registrarEntrada}
                      noValidate
                      className="flex flex-col gap-3 border-t border-surface2 pt-3"
                    >
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="tipo" className="text-sm font-medium text-text-primary">
                          Tipo
                        </label>
                        <select
                          id="tipo"
                          value={tipo}
                          onChange={(e) => setTipo(e.target.value as typeof tipo)}
                          className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                          {TIPOS_ENTRADA.map((t) => (
                            <option key={t.valor} value={t.valor}>
                              {t.etiqueta}
                            </option>
                          ))}
                        </select>
                      </div>

                      <CampoTexto
                        id="fecha"
                        label="Fecha"
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        required
                      />

                      <CampoTexto
                        id="descripcion"
                        label="Descripción"
                        placeholder="Vacuna antirrábica aplicada, sin reacciones adversas."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        error={errorGuardado ?? undefined}
                        required
                      />

                      <Boton type="submit" disabled={guardando || !descripcion.trim()}>
                        {guardando ? 'Guardando…' : 'Guardar entrada'}
                      </Boton>
                    </form>
                  )
                ) : null}
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
