import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import type { IRepositorioTurnos, TurnoGenerado } from '@dominio/puertos/IRepositorioTurnos';
import type { IRepositorioDisponibilidad } from '@dominio/puertos/IRepositorioDisponibilidad';
import type { FuenteDisponibilidadVeterinario, ProveedorTurnera } from '@dominio/estrategias/ProveedorTurnera';

/** Horizonte de generación: 2 semanas corridas desde hoy — agenda visible razonable para que un paciente reserve con antelación, sin acumular turnos 'disponible' indefinidamente hacia el futuro. */
const HORIZONTE_DIAS = 14;
const MS_POR_DIA = 24 * 60 * 60_000;

/**
 * Generación (y sincronización) de los turnos 'disponible' de la agenda
 * propia de un veterinario — Historia "Configuración de agenda del
 * veterinario" (Módulo 4). Delega en `TurneraVeterinario` (Strategy,
 * `ProveedorTurnera<FuenteDisponibilidadVeterinario>`) el CÁLCULO de qué
 * franjas concretas tendrían que existir según los bloques semanales
 * activos; acá vive únicamente la RECONCILIACIÓN contra lo ya persistido —
 * misma separación de responsabilidades que `GenerarTurnosEvento.ts`.
 *
 * A diferencia de un evento (reconciliado por CONTEO frente a
 * `cupos_totales`, porque todas sus franjas cuelgan de un mismo
 * `evento_id`), acá no hay una referencia externa por la que contar: la
 * franja horaria (`franja_inicio`) es la propia identidad de reconciliación,
 * de ahí `IRepositorioTurnos.listarFranjasExistentes`. Solo AGREGA turnos
 * 'disponible' que todavía no existen — nunca actualiza ni borra uno ya
 * persistido, así que los `reservado`/`cancelado` (y los `disponible`
 * previos) quedan intactos sin importar cuántas veces se vuelva a ejecutar
 * para el mismo veterinario (ej. cada vez que reconfigura un día de su
 * agenda).
 *
 * No es un `CasoDeUsoBase`: no es un punto de entrada HTTP propio (la
 * autorización de rol/verificación ya la resolvió
 * `ConfigurarDisponibilidad.autorizar()`, que es quien invoca esto), sino
 * una operación de dominio interna reutilizable desde ahí.
 */
@injectable()
export class GenerarTurnosVeterinario {
  constructor(
    @inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos,
    @inject('IRepositorioDisponibilidad') private readonly repositorioDisponibilidad: IRepositorioDisponibilidad,
    @inject('ProveedorTurneraVeterinario') private readonly turneraVeterinario: ProveedorTurnera<FuenteDisponibilidadVeterinario>,
  ) {}

  async ejecutar(veterinarioId: string): Promise<TurnoGenerado[]> {
    const bloquesActivos = await this.repositorioDisponibilidad.listarActivas(veterinarioId);
    if (bloquesActivos.length === 0) return [];

    const desde = new Date();
    desde.setUTCHours(0, 0, 0, 0);
    const hasta = new Date(desde.getTime() + HORIZONTE_DIAS * MS_POR_DIA);

    const franjasObjetivo = this.turneraVeterinario.calcularFranjasObjetivo({
      bloquesActivos,
      desde,
      horizonteDias: HORIZONTE_DIAS,
    });

    const existentes = await this.repositorioTurnos.listarFranjasExistentes(veterinarioId, desde, hasta);
    const existentesMs = new Set(existentes.map((franjaInicio) => franjaInicio.getTime()));

    const franjasFaltantes = franjasObjetivo.filter((franja) => !existentesMs.has(franja.franjaInicio.getTime()));
    if (franjasFaltantes.length === 0) return [];

    const nuevosTurnos = franjasFaltantes.map((franja) => ({
      proveedorTipo: this.turneraVeterinario.proveedorTipo,
      proveedorId: veterinarioId,
      eventoId: null,
      franjaInicio: franja.franjaInicio,
      franjaFin: franja.franjaFin,
    }));

    return this.repositorioTurnos.crearLote(nuevosTurnos);
  }
}
