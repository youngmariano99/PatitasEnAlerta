import { NextResponse } from 'next/server';
import { generarDocumentoOpenApi } from '@aplicacion/dtos/openapi-registry';
// Importar cada módulo de DTOs registra sus esquemas y rutas como efecto
// secundario (ver src/aplicacion/dtos/openapi-registry.ts).
import '@aplicacion/dtos/auth/RegistrarDuenoDto';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(generarDocumentoOpenApi());
}
