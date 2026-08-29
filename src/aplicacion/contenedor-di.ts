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
import { PrismaUsuarioRepositorio } from '@infraestructura/adaptadores/PrismaUsuarioRepositorio';
import { SupabaseAuthAdapter } from '@infraestructura/adaptadores/SupabaseAuthAdapter';
import { PrismaMascotaRepositorio } from '@infraestructura/adaptadores/PrismaMascotaRepositorio';
import { CloudinaryStorageAdapter } from '@infraestructura/adaptadores/CloudinaryStorageAdapter';
import { PrismaVeterinarioRepositorio } from '@infraestructura/adaptadores/PrismaVeterinarioRepositorio';
import { PrismaPerfilRepositorio } from '@infraestructura/adaptadores/PrismaPerfilRepositorio';
import { PrismaMunicipioRepositorio } from '@infraestructura/adaptadores/PrismaMunicipioRepositorio';
import { PrismaVerificacionesRepositorio } from '@infraestructura/adaptadores/PrismaVerificacionesRepositorio';
import { PrismaNotificacionesRepositorio } from '@infraestructura/adaptadores/PrismaNotificacionesRepositorio';

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

export { container };
