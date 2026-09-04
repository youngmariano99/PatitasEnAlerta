import 'reflect-metadata';
import { container } from 'tsyringe';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import type { IRepositorioMascotas } from '@dominio/puertos/IRepositorioMascotas';
import type { IAlmacenamientoImagenes } from '@dominio/puertos/IAlmacenamientoImagenes';
import type { IRepositorioVeterinarios } from '@dominio/puertos/IRepositorioVeterinarios';
import type { IRepositorioPerfil } from '@dominio/puertos/IRepositorioPerfil';
import type { IRepositorioMunicipios } from '@dominio/puertos/IRepositorioMunicipios';
import type { IRepositorioVerificaciones } from '@dominio/puertos/IRepositorioVerificaciones';
import type { INotificacionesRepositorio } from '@dominio/puertos/INotificacionesRepositorio';
import type { IRepositorioReportes } from '@dominio/puertos/IRepositorioReportes';
import type { IRepositorioEventos } from '@dominio/puertos/IRepositorioEventos';
import type { IRepositorioTurnos } from '@dominio/puertos/IRepositorioTurnos';
import type { IRepositorioFichasAdopcion } from '@dominio/puertos/IRepositorioFichasAdopcion';
import type { IRepositorioDashboardMunicipal } from '@dominio/puertos/IRepositorioDashboardMunicipal';
import type { IRepositorioDisponibilidad } from '@dominio/puertos/IRepositorioDisponibilidad';
import type { FuenteDisponibilidadEvento, FuenteDisponibilidadVeterinario, ProveedorTurnera } from '@dominio/estrategias/ProveedorTurnera';
import type { IControlDeTasa } from '@dominio/puertos/IControlDeTasa';
import type { IControlDeTasaConReintento } from '@dominio/puertos/IControlDeTasaConReintento';
import { PrismaUsuarioRepositorio } from '@infraestructura/adaptadores/PrismaUsuarioRepositorio';
import { SupabaseAuthAdapter } from '@infraestructura/adaptadores/SupabaseAuthAdapter';
import { PrismaMascotaRepositorio } from '@infraestructura/adaptadores/PrismaMascotaRepositorio';
import { CloudinaryStorageAdapter } from '@infraestructura/adaptadores/CloudinaryStorageAdapter';
import { PrismaVeterinarioRepositorio } from '@infraestructura/adaptadores/PrismaVeterinarioRepositorio';
import { PrismaPerfilRepositorio } from '@infraestructura/adaptadores/PrismaPerfilRepositorio';
import { PrismaMunicipioRepositorio } from '@infraestructura/adaptadores/PrismaMunicipioRepositorio';
import { PrismaVerificacionesRepositorio } from '@infraestructura/adaptadores/PrismaVerificacionesRepositorio';
import { PrismaNotificacionesRepositorio } from '@infraestructura/adaptadores/PrismaNotificacionesRepositorio';
import { PrismaReporteRepositorio } from '@infraestructura/adaptadores/PrismaReporteRepositorio';
import { PrismaEventoRepositorio } from '@infraestructura/adaptadores/PrismaEventoRepositorio';
import { PrismaTurnoRepositorio } from '@infraestructura/adaptadores/PrismaTurnoRepositorio';
import { PrismaFichaAdopcionRepositorio } from '@infraestructura/adaptadores/PrismaFichaAdopcionRepositorio';
import { PrismaDashboardMunicipalRepositorio } from '@infraestructura/adaptadores/PrismaDashboardMunicipalRepositorio';
import { PrismaDisponibilidadRepositorio } from '@infraestructura/adaptadores/PrismaDisponibilidadRepositorio';
import { TurneraMunicipio, TurneraVeterinario } from '@dominio/estrategias/ProveedorTurnera';
import { UpstashControlDeTasa } from '@infraestructura/adaptadores/UpstashControlDeTasa';
import { UpstashControlDeTasaAntiSaturacion } from '@infraestructura/adaptadores/UpstashControlDeTasaAntiSaturacion';

/**
 * Punto único de registro de dependencias (patrón Singleton para el propio
 * contenedor, más registro de implementaciones concretas detrás de sus
 * interfaces — ver src/dominio/puertos/).
 *
 * Regla de este proyecto: los casos de uso SOLO dependen de interfaces
 * (IRepositorioX, IProveedorAutenticacion, IAlmacenamientoImagenes...),
 * nunca de una clase concreta de infraestructura. Esto es lo que permite
 * que, por ejemplo, EstrategiaMatchAdopcion pase de reglas → semántico → LLM
 * cambiando solo esta configuración, sin tocar el caso de uso.
 */
container.registerSingleton<IRepositorioUsuarios>('IRepositorioUsuarios', PrismaUsuarioRepositorio);
container.registerSingleton<IProveedorAutenticacion>('IProveedorAutenticacion', SupabaseAuthAdapter);
container.registerSingleton<IRepositorioMascotas>('IRepositorioMascotas', PrismaMascotaRepositorio);
container.registerSingleton<IAlmacenamientoImagenes>('IAlmacenamientoImagenes', CloudinaryStorageAdapter);
container.registerSingleton<IRepositorioVeterinarios>('IRepositorioVeterinarios', PrismaVeterinarioRepositorio);
container.registerSingleton<IRepositorioPerfil>('IRepositorioPerfil', PrismaPerfilRepositorio);
container.registerSingleton<IRepositorioMunicipios>('IRepositorioMunicipios', PrismaMunicipioRepositorio);
container.registerSingleton<IRepositorioVerificaciones>('IRepositorioVerificaciones', PrismaVerificacionesRepositorio);
container.registerSingleton<INotificacionesRepositorio>('INotificacionesRepositorio', PrismaNotificacionesRepositorio);
container.registerSingleton<IRepositorioReportes>('IRepositorioReportes', PrismaReporteRepositorio);
container.registerSingleton<IRepositorioEventos>('IRepositorioEventos', PrismaEventoRepositorio);
container.registerSingleton<IRepositorioTurnos>('IRepositorioTurnos', PrismaTurnoRepositorio);
container.registerSingleton<IRepositorioFichasAdopcion>('IRepositorioFichasAdopcion', PrismaFichaAdopcionRepositorio);
container.registerSingleton<IRepositorioDashboardMunicipal>('IRepositorioDashboardMunicipal', PrismaDashboardMunicipalRepositorio);
container.registerSingleton<IRepositorioDisponibilidad>('IRepositorioDisponibilidad', PrismaDisponibilidadRepositorio);
container.registerSingleton<ProveedorTurnera<FuenteDisponibilidadEvento>>('ProveedorTurneraMunicipio', TurneraMunicipio);
container.registerSingleton<ProveedorTurnera<FuenteDisponibilidadVeterinario>>('ProveedorTurneraVeterinario', TurneraVeterinario);
container.registerSingleton<IControlDeTasa>('IControlDeTasa', UpstashControlDeTasa);
container.registerSingleton<IControlDeTasaConReintento>('IControlDeTasaConReintento', UpstashControlDeTasaAntiSaturacion);

export { container };
