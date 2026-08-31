import 'reflect-metadata';
import { injectable, inject } from 'tsyringe';
import { CrearReporte, type EntradaCrearReporte } from '@aplicacion/casos-de-uso/reportes/CrearReporte';
import type { ReporteCreado } from '@aplicacion/dtos/reportes/CrearReporteDto';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import type { IControlDeTasaConReintento } from '@dominio/puertos/IControlDeTasaConReintento';
import { LimiteDeReportesExcedidoError } from '@dominio/errores/erroresReportes';

const ESTADO_VERIFICADO = 'verificado';

/**
 * Decorator (GoF) — Historia "Rate limiting anti-saturación en la creación
 * de reportes" (Módulo 2). Envuelve a CrearReporte SIN tocar una sola línea
 * de su lógica interna (verificación técnica de este ticket): compone una
 * instancia real de CrearReporte por referencia y, antes de delegarle
 * `ejecutar()`, evalúa un límite ADICIONAL — 5 reportes/hora, ventana
 * deslizante (@upstash/ratelimit vía UpstashControlDeTasaAntiSaturacion) —
 * exclusivo de usuarios cuyo `estado_verificacion` (docs/SCHEMA.md,
 * `usuarios.estado_verificacion`) sea distinto de 'verificado'.
 *
 * Un usuario ya verificado (ej. veterinario con matrícula aprobada, o
 * cualquier rol que en el futuro llegue a ese estado) queda exento de ESTE
 * límite puntual — la lectura de docs/ERRORS.md/PEA-REP-004 sigue
 * aplicándose igual para todos vía el eslabón ValidadorRateLimit del
 * pipeline de ValidacionReporte.ts (3 reportes/10 min, sin distinción de
 * verificación), que este decorador no reemplaza ni duplica: son dos
 * controles independientes, con ventanas y públicos distintos, que se
 * suman en vez de competir entre sí.
 *
 * Expone el mismo contrato público que CrearReporte (`ejecutar(input):
 * Promise<ReporteCreado>`) — composición, no herencia — para que
 * `app/api/reportes/route.ts` resuelva esta clase del contenedor de DI en
 * vez de CrearReporte directamente, sin que el caso de uso envuelto se
 * entere de que existe.
 */
@injectable()
export class ConRateLimitDecorator {
  constructor(
    private readonly casoDeUsoEnvuelto: CrearReporte,
    @inject('IRepositorioPerfil') private readonly repositorioPerfil: IRepositorioPerfil,
    @inject('IControlDeTasaConReintento') private readonly controlDeTasaAntiSaturacion: IControlDeTasaConReintento,
  ) {}

  async ejecutar(input: EntradaCrearReporte): Promise<ReporteCreado> {
    const perfil = await this.repositorioPerfil.obtenerPerfilPropio(input.reportadoPor);
    const requiereLimiteAntiSaturacion = perfil?.estadoVerificacion !== ESTADO_VERIFICADO;

    if (requiereLimiteAntiSaturacion) {
      const { permitido, reintentarEnSegundos } = await this.controlDeTasaAntiSaturacion.evaluar(input.reportadoPor);
      if (!permitido) {
        throw new LimiteDeReportesExcedidoError(reintentarEnSegundos);
      }
    }

    return this.casoDeUsoEnvuelto.ejecutar(input);
  }
}
