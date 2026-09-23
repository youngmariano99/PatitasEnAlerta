/**
 * @jest-environment jsdom
 */
import L from 'leaflet';
import { obtenerIconoReporte } from '@presentacion/componentes/mapas/iconosReporteFlyweight';

describe('iconosReporteFlyweight', () => {
  it('reutiliza la misma instancia de ícono (Flyweight) para la misma combinación tipo+estado+especie', () => {
    const primero = obtenerIconoReporte('perdido', 'reportado', 'perro');
    const segundo = obtenerIconoReporte('perdido', 'reportado', 'perro');

    expect(primero).toBe(segundo);
  });

  it('genera instancias distintas para especies distintas del mismo tipo', () => {
    const perro = obtenerIconoReporte('perdido', 'reportado', 'perro');
    const gato = obtenerIconoReporte('perdido', 'reportado', 'gato');

    expect(perro).not.toBe(gato);
  });

  it('colapsa cualquier especie que no sea perro/gato a un único bucket, sin hacer crecer el caché sin límite', () => {
    const sinEspecie = obtenerIconoReporte('encontrado', 'reportado', null);
    const especieLibre1 = obtenerIconoReporte('encontrado', 'reportado', 'iguana');
    const especieLibre2 = obtenerIconoReporte('encontrado', 'reportado', 'loro');
    const especieVacia = obtenerIconoReporte('encontrado', 'reportado', '');
    const especieUndefined = obtenerIconoReporte('encontrado', 'reportado', undefined);

    expect(sinEspecie).toBe(especieLibre1);
    expect(especieLibre1).toBe(especieLibre2);
    expect(especieLibre2).toBe(especieVacia);
    expect(especieVacia).toBe(especieUndefined);
  });

  it('normaliza mayúsculas/espacios antes de resolver la especie', () => {
    const normal = obtenerIconoReporte('perdido', 'reportado', 'perro');
    const conEspaciosYMayuscula = obtenerIconoReporte('perdido', 'reportado', '  Perro  ');

    expect(normal).toBe(conEspaciosYMayuscula);
  });

  it('siempre usa el mismo ícono para "problematica" sin importar la especie', () => {
    const conPerro = obtenerIconoReporte('problematica', 'reportado', 'perro');
    const sinEspecie = obtenerIconoReporte('problematica', 'reportado', null);

    expect(conPerro.options.html).toEqual(sinEspecie.options.html);
  });

  it('devuelve una instancia de L.DivIcon con tamaño de ícono consistente', () => {
    const icono = obtenerIconoReporte('encontrado', 'reportado', 'gato');

    expect(icono).toBeInstanceOf(L.DivIcon);
    expect(icono.options.iconSize).toEqual([28, 28]);
  });
});
