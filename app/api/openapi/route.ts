import { NextResponse } from 'next/server';
import { generarDocumentoOpenApi } from '@aplicacion/dtos/openapi-registry';
// Importar cada módulo de DTOs registra sus esquemas y rutas como efecto
// secundario (ver src/aplicacion/dtos/openapi-registry.ts) — sin importarlo
// acá, sus registroOpenApi.register()/registerPath() nunca se ejecutan y el
// documento generado queda incompleto aunque el archivo "exista".
import '@aplicacion/dtos/auth/RegistrarDuenoDto';
import '@aplicacion/dtos/auth/RegistrarVeterinarioDto';
import '@aplicacion/dtos/auth/CrearCuentaMunicipioDto';
import '@aplicacion/dtos/auth/RecuperarPasswordDto';
import '@aplicacion/dtos/auth/VerificacionesDto';
import '@aplicacion/dtos/mascotas/RegistrarMascotaDto';
import '@aplicacion/dtos/mascotas/ActualizarMascotaDto';
import '@aplicacion/dtos/reportes/CrearReporteDto';
import '@aplicacion/dtos/reportes/ListarReportesDto';
import '@aplicacion/dtos/notificaciones/NotificacionesDto';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(generarDocumentoOpenApi());
}
