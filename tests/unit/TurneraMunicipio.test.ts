import { TurneraMunicipio } from '@dominio/estrategias/ProveedorTurnera';

describe('TurneraMunicipio (Strategy — ProveedorTurnera)', () => {
  it('declara proveedorTipo="municipio"', () => {
    const turnera = new TurneraMunicipio();
    expect(turnera.proveedorTipo).toBe('municipio');
  });

  it('genera exactamente cuposTotales franjas', () => {
    const turnera = new TurneraMunicipio();
    const fecha = new Date('2026-10-01T09:00:00.000Z');

    const franjas = turnera.calcularFranjasObjetivo({ fecha, cuposTotales: 10 });

    expect(franjas).toHaveLength(10);
  });

  it('la primera franja arranca exactamente en la fecha del evento', () => {
    const turnera = new TurneraMunicipio();
    const fecha = new Date('2026-10-01T09:00:00.000Z');

    const [primera] = turnera.calcularFranjasObjetivo({ fecha, cuposTotales: 3 });

    expect(primera!.franjaInicio).toEqual(fecha);
    expect(primera!.franjaFin).toEqual(new Date('2026-10-01T09:20:00.000Z'));
  });

  it('cada franja siguiente arranca 20 minutos después de la anterior, sin solaparse', () => {
    const turnera = new TurneraMunicipio();
    const fecha = new Date('2026-10-01T09:00:00.000Z');

    const franjas = turnera.calcularFranjasObjetivo({ fecha, cuposTotales: 3 });

    expect(franjas[1]!.franjaInicio).toEqual(franjas[0]!.franjaFin);
    expect(franjas[2]!.franjaInicio).toEqual(franjas[1]!.franjaFin);
  });

  it('cuposTotales=0 devuelve un arreglo vacío', () => {
    const turnera = new TurneraMunicipio();

    expect(turnera.calcularFranjasObjetivo({ fecha: new Date(), cuposTotales: 0 })).toEqual([]);
  });
});
