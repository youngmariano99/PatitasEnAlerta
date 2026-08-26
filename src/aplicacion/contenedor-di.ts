import 'reflect-metadata';
import { container } from 'tsyringe';
import type { IRepositorioUsuarios } from '@dominio/puertos/IRepositorioUsuarios';
import type { IProveedorAutenticacion } from '@dominio/puertos/IProveedorAutenticacion';
import { PrismaUsuarioRepositorio } from '@infraestructura/adaptadores/PrismaUsuarioRepositorio';
import { SupabaseAuthAdapter } from '@infraestructura/adaptadores/SupabaseAuthAdapter';

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

export { container };
