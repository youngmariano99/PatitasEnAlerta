import 'reflect-metadata';
import '@testing-library/jest-dom';

// tsyringe (@injectable()/@inject()) necesita el polyfill de reflect-metadata
// ya activo ANTES de que se evalúe cualquier clase decorada. Cada archivo de
// test tiene su propio registro de módulos aislado en Jest, así que importar
// reflect-metadata solo en contenedor-di.ts no alcanza para un test que
// importe un adaptador (@injectable()) de forma aislada — de ahí que viva acá,
// en el único punto que corre antes de cada archivo de test.

// Punto único para mocks globales (ej. matchMedia, IntersectionObserver)
// que Next.js/JSDOM no implementan por defecto. Agregar acá, no en cada test.

// jsdom no expone `setImmediate` (es un global de Node), y `pino` lo usa
// internamente (thread-stream) para el logger estructurado de todo caso de
// uso (CasoDeUsoBase). Sin este polyfill, cualquier test bajo el entorno
// jsdom por defecto que ejecute un caso de uso real revienta con
// "setImmediate is not defined" al loguear.
if (typeof globalThis.setImmediate === 'undefined') {
  // @ts-expect-error -- polyfill mínimo, no necesita el tipo completo de Node
  globalThis.setImmediate = (fn: (...args: unknown[]) => void, ...args: unknown[]) =>
    setTimeout(fn, 0, ...args);
}
