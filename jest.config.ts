import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

// Umbral mínimo de cobertura acorde al NFR de Calidad (80%).
// Ajustar por carpeta si un módulo recién iniciado todavía no lo alcanza,
// pero nunca bajar el umbral global sin registrar la excepción en docs/ERRORS.md o un ADR.
const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/tests/e2e/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
    '^@dominio/(.*)$': '<rootDir>/src/dominio/$1',
    '^@aplicacion/(.*)$': '<rootDir>/src/aplicacion/$1',
    '^@infraestructura/(.*)$': '<rootDir>/src/infraestructura/$1',
    '^@presentacion/(.*)$': '<rootDir>/src/presentacion/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
};

export default createJestConfig(config);
