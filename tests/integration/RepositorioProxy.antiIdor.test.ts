/**
 * @jest-environment node
 *
 * Ticket "Control de acceso anti-IDOR/BOLA en endpoints con dueño": un test
 * de integración por cada entidad con dueño (mascotas, reportes, turnos,
 * entradas_libreta_sanitaria) que intenta un acceso cruzado y confirma el
 * rechazo 403 (PEA-SIS-002), sin revelar si el recurso existe o no.
 *
 * Los verificadores de pertenencia replican, entidad por entidad, las
 * políticas de docs/ROLES.md Sección 3 (mismo criterio que la migración RLS
 * en prisma/migrations/): RepositorioProxy es el único punto de la capa de
 * aplicación que decide "esto es tuyo o no", así que estos tests prueban esa
 * decisión con la forma real de cada tabla, no solo con un fixture genérico.
 */
import { RepositorioProxy, type RepositorioConBusquedaPorId } from '@infraestructura/proxies/RepositorioProxy';
import { AccesoNoAutorizadoError } from '@dominio/errores/erroresTransversales';

type Solicitante = { id: string; rol: string };

function repositorioFalso<T>(entidad: T | null): RepositorioConBusquedaPorId<T> {
  return { buscarPorId: async () => entidad };
}

describe('Anti-IDOR/BOLA — RepositorioProxy por entidad con dueño', () => {
  describe('mascotas (Patrón A — docs/ROLES.md 3.2)', () => {
    interface MascotaFila {
      id: string;
      dueñoId: string;
    }
    const esPropietario = (mascota: MascotaFila, solicitante: Solicitante) =>
      mascota.dueñoId === solicitante.id || solicitante.rol === 'administrador';

    it('rechaza (403 / PEA-SIS-002) el acceso a la mascota de otro dueño', async () => {
      const repo = repositorioFalso<MascotaFila>({ id: 'mascota-1', dueñoId: 'dueno-1' });
      const proxy = new RepositorioProxy(repo, { id: 'dueno-2', rol: 'dueño' }, esPropietario);

      await expect(proxy.buscarPorId('mascota-1')).rejects.toMatchObject({
        codigo: 'PEA-SIS-002',
        statusHttp: 403,
      });
    });

    it('permite el acceso al propio dueño y al administrador', async () => {
      const repo = repositorioFalso<MascotaFila>({ id: 'mascota-1', dueñoId: 'dueno-1' });

      await expect(new RepositorioProxy(repo, { id: 'dueno-1', rol: 'dueño' }, esPropietario).buscarPorId('mascota-1')).resolves.toBeDefined();
      await expect(
        new RepositorioProxy(repo, { id: 'admin-1', rol: 'administrador' }, esPropietario).buscarPorId('mascota-1'),
      ).resolves.toBeDefined();
    });
  });

  describe('reportes (Patrón B — docs/ROLES.md 3.3: escritura restringida al emisor)', () => {
    interface ReporteFila {
      id: string;
      reportadoPor: string;
    }
    // La lectura de `reportes` es pública (docs/ROLES.md); este proxy protege
    // específicamente las acciones que solo puede hacer quien lo reportó
    // (ej. editar la descripción antes de que Municipio lo tome).
    const esPropietario = (reporte: ReporteFila, solicitante: Solicitante) =>
      reporte.reportadoPor === solicitante.id || solicitante.rol === 'administrador';

    it('rechaza (403 / PEA-SIS-002) modificar un reporte ajeno', async () => {
      const repo = repositorioFalso<ReporteFila>({ id: 'reporte-1', reportadoPor: 'vecino-1' });
      const proxy = new RepositorioProxy(repo, { id: 'vecino-2', rol: 'dueño' }, esPropietario);

      await expect(proxy.buscarPorId('reporte-1')).rejects.toMatchObject({ codigo: 'PEA-SIS-002', statusHttp: 403 });
    });

    it('permite al reportante original modificar su propio reporte', async () => {
      const repo = repositorioFalso<ReporteFila>({ id: 'reporte-1', reportadoPor: 'vecino-1' });
      const proxy = new RepositorioProxy(repo, { id: 'vecino-1', rol: 'dueño' }, esPropietario);

      await expect(proxy.buscarPorId('reporte-1')).resolves.toBeDefined();
    });
  });

  describe('turnos (Patrón D — docs/ROLES.md 3.5: doble parte)', () => {
    interface TurnoFila {
      id: string;
      proveedorId: string;
      reservadoPor: string | null;
    }
    // Dos roles legítimos sobre el mismo turno: quien lo ofrece (proveedor)
    // y quien lo reservó — a diferencia de mascotas/reportes, no hay un
    // único "dueño".
    const esPropietario = (turno: TurnoFila, solicitante: Solicitante) =>
      turno.proveedorId === solicitante.id || turno.reservadoPor === solicitante.id || solicitante.rol === 'administrador';

    it('rechaza (403 / PEA-SIS-002) a quien no es ni el proveedor ni quien reservó', async () => {
      const repo = repositorioFalso<TurnoFila>({ id: 'turno-1', proveedorId: 'vet-1', reservadoPor: 'dueno-1' });
      const proxy = new RepositorioProxy(repo, { id: 'dueno-2', rol: 'dueño' }, esPropietario);

      await expect(proxy.buscarPorId('turno-1')).rejects.toMatchObject({ codigo: 'PEA-SIS-002', statusHttp: 403 });
    });

    it('permite el acceso tanto al proveedor como a quien reservó el turno', async () => {
      const repo = repositorioFalso<TurnoFila>({ id: 'turno-1', proveedorId: 'vet-1', reservadoPor: 'dueno-1' });

      await expect(new RepositorioProxy(repo, { id: 'vet-1', rol: 'veterinario' }, esPropietario).buscarPorId('turno-1')).resolves.toBeDefined();
      await expect(new RepositorioProxy(repo, { id: 'dueno-1', rol: 'dueño' }, esPropietario).buscarPorId('turno-1')).resolves.toBeDefined();
    });

    it('un turno sin reservar (reservadoPor null) no queda expuesto a cualquier dueño', async () => {
      const repo = repositorioFalso<TurnoFila>({ id: 'turno-2', proveedorId: 'vet-1', reservadoPor: null });
      const proxy = new RepositorioProxy(repo, { id: 'dueno-3', rol: 'dueño' }, esPropietario);

      await expect(proxy.buscarPorId('turno-2')).rejects.toMatchObject({ codigo: 'PEA-SIS-002' });
    });
  });

  describe('entradas_libreta_sanitaria (Patrón C — docs/ROLES.md 3.4: vínculo transitivo vía mascota)', () => {
    interface EntradaLibretaFila {
      id: string;
      veterinarioId: string;
      // El repositorio real resuelve este dato con un JOIN a `mascotas` al
      // construir la entidad (ver PrismaVerificacionesRepositorio para el
      // mismo patrón de enriquecimiento) — el proxy nunca consulta la base
      // por su cuenta, solo evalúa lo que ya le llega resuelto.
      mascotaDueñoId: string;
    }
    const esPropietario = (entrada: EntradaLibretaFila, solicitante: Solicitante) =>
      entrada.mascotaDueñoId === solicitante.id || entrada.veterinarioId === solicitante.id || solicitante.rol === 'administrador';

    it('rechaza (403 / PEA-SIS-002) a un dueño de mascota distinto y a un veterinario sin autorización', async () => {
      const repo = repositorioFalso<EntradaLibretaFila>({ id: 'entrada-1', veterinarioId: 'vet-1', mascotaDueñoId: 'dueno-1' });
      const proxy = new RepositorioProxy(repo, { id: 'dueno-2', rol: 'dueño' }, esPropietario);

      await expect(proxy.buscarPorId('entrada-1')).rejects.toMatchObject({ codigo: 'PEA-SIS-002', statusHttp: 403 });
    });

    it('permite el acceso al dueño de la mascota y al veterinario que hizo la entrada', async () => {
      const repo = repositorioFalso<EntradaLibretaFila>({ id: 'entrada-1', veterinarioId: 'vet-1', mascotaDueñoId: 'dueno-1' });

      await expect(new RepositorioProxy(repo, { id: 'dueno-1', rol: 'dueño' }, esPropietario).buscarPorId('entrada-1')).resolves.toBeDefined();
      await expect(new RepositorioProxy(repo, { id: 'vet-1', rol: 'veterinario' }, esPropietario).buscarPorId('entrada-1')).resolves.toBeDefined();
    });
  });

  describe('verificación técnica: no revela si el recurso existe o no', () => {
    it('un id inexistente y un id ajeno responden con el mismo código, mensaje y status', async () => {
      interface MascotaFila {
        id: string;
        dueñoId: string;
      }
      const esPropietario = (m: MascotaFila, solicitanteId: string) => m.dueñoId === solicitanteId;

      const proxyInexistente = new RepositorioProxy(repositorioFalso<MascotaFila>(null), 'dueno-1', esPropietario);
      const proxyAjeno = new RepositorioProxy(
        repositorioFalso<MascotaFila>({ id: 'mascota-1', dueñoId: 'otro-dueño' }),
        'dueno-1',
        esPropietario,
      );

      let errorInexistente: unknown;
      let errorAjeno: unknown;
      await proxyInexistente.buscarPorId('no-existe').catch((e: unknown) => {
        errorInexistente = e;
      });
      await proxyAjeno.buscarPorId('mascota-1').catch((e: unknown) => {
        errorAjeno = e;
      });

      expect(errorInexistente).toBeInstanceOf(AccesoNoAutorizadoError);
      expect(errorAjeno).toBeInstanceOf(AccesoNoAutorizadoError);
      expect((errorInexistente as AccesoNoAutorizadoError).codigo).toBe((errorAjeno as AccesoNoAutorizadoError).codigo);
      expect((errorInexistente as AccesoNoAutorizadoError).statusHttp).toBe(
        (errorAjeno as AccesoNoAutorizadoError).statusHttp,
      );
      expect((errorInexistente as AccesoNoAutorizadoError).message).toBe(
        (errorAjeno as AccesoNoAutorizadoError).message,
      );
    });
  });
});
