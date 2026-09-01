import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import type { IRepositorioTurnos, TurnoGenerado } from '@dominio/puertos/IRepositorioTurnos';
import type { FuenteDisponibilidadEvento, ProveedorTurnera } from '@dominio/estrategias/ProveedorTurnera';

export interface DatosEventoParaTurnos {
  id: string;
  municipioId: string;
  fecha: Date;
  cuposTotales: number;
}

/**
 * Generación (y sincronización) de los turnos 'disponible' de un operativo
 * municipal — Historia "Configuración de cupos por tipo de operativo".
 * Delega en `TurneraMunicipio` (Strategy, ProveedorTurnera<FuenteDisponibilidadEvento>)
 * el CÁLCULO de qué franjas tendrían que existir según `cupos_totales`; acá
 * vive únicamente la RECONCILIACIÓN contra lo ya persistido — la parte
 * genérica del Motor de Turnera que un futuro GenerarTurnosVeterinario
 * (Módulo 4) reutilizaría igual, cambiando solo qué `ProveedorTurnera` se
 * inyecta.
 *
 * No es un `CasoDeUsoBase`: no es un punto de entrada HTTP propio (la
 * autorización de rol ya la resolvió `CrearEvento.autorizar()`, que es
 * quien invoca esto), sino una operación de dominio interna reutilizable
 * tanto al crear un evento (Paso 1) como al editarle `cupos_totales` (Paso 3).
 *
 * Solo AGREGA turnos 'disponible' cuando el objetivo (`cupos_totales`) supera
 * lo ya persistido — nunca actualiza ni borra una fila existente, así que
 * los turnos ya `reservado`/`cancelado` (y los `disponible` previos) quedan
 * intactos sin importar cuántas veces se vuelva a ejecutar para el mismo
 * evento. Si `cupos_totales` bajó, no hace nada (reducir cupos por debajo de
 * lo ya generado queda fuera del alcance de esta actividad).
 */
@injectable()
export class GenerarTurnosEvento {
  constructor(
    @inject('IRepositorioTurnos') private readonly repositorioTurnos: IRepositorioTurnos,
    @inject('ProveedorTurneraMunicipio') private readonly turneraMunicipio: ProveedorTurnera<FuenteDisponibilidadEvento>,
  ) {}

  async ejecutar(evento: DatosEventoParaTurnos): Promise<TurnoGenerado[]> {
    const franjasObjetivo = this.turneraMunicipio.calcularFranjasObjetivo({
      fecha: evento.fecha,
      cuposTotales: evento.cuposTotales,
    });

    const yaDisponibles = await this.repositorioTurnos.contarDisponiblesPorEvento(evento.id);
    const franjasFaltantes = franjasObjetivo.slice(yaDisponibles);
    if (franjasFaltantes.length === 0) return [];

    const nuevosTurnos = franjasFaltantes.map((franja) => ({
      proveedorTipo: this.turneraMunicipio.proveedorTipo,
      proveedorId: evento.municipioId,
      eventoId: evento.id,
      franjaInicio: franja.franjaInicio,
      franjaFin: franja.franjaFin,
    }));

    return this.repositorioTurnos.crearLote(nuevosTurnos);
  }
}
