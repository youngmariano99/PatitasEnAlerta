import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShellNavegacion } from '@presentacion/componentes/shell/ShellNavegacion';

const backMock = jest.fn();
const signOutMock = jest.fn().mockResolvedValue({ error: null });
let pathnameActual = '/panel';

jest.mock('next/navigation', () => ({
  usePathname: () => pathnameActual,
  useRouter: () => ({ back: backMock }),
}));

jest.mock('@infraestructura/adaptadores/ClienteSupabaseNavegador', () => ({
  crearClienteSupabaseNavegador: () => ({ auth: { signOut: signOutMock } }),
}));

// CampanaNotificaciones hace su propia carga de red (GET /api/notificaciones) y
// suscripción Realtime — se reemplaza acá porque no es lo que este test cubre.
jest.mock('@presentacion/componentes/notificaciones/CampanaNotificaciones', () => ({
  CampanaNotificaciones: () => <div data-testid="campana-notificaciones" />,
}));

function mockFetchPerfil(body: unknown, ok = true) {
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok, status: ok ? 200 : 401, json: async () => body }) as jest.Mock;
}

describe('ShellNavegacion', () => {
  beforeEach(() => {
    backMock.mockReset();
    signOutMock.mockClear();
    pathnameActual = '/panel';
    delete (window as unknown as { location?: unknown }).location;
    (window as unknown as { location: unknown }).location = { assign: jest.fn() };
  });

  it('se oculta por completo en /auth/*, sin pedir el perfil', async () => {
    pathnameActual = '/auth/login';
    global.fetch = jest.fn();

    render(
      <ShellNavegacion>
        <p>Formulario de login</p>
      </ShellNavegacion>,
    );

    expect(screen.getByText('Formulario de login')).toBeInTheDocument();
    expect(screen.queryByText('Iniciar sesión')).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('modo invitado (401 en /api/perfil): muestra "Iniciar sesión" y los accesos públicos', async () => {
    mockFetchPerfil({}, false);

    render(
      <ShellNavegacion>
        <p>Contenido público</p>
      </ShellNavegacion>,
    );

    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Reportes' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
    expect(screen.getByText('Contenido público')).toBeInTheDocument();
  });

  it('con sesión de dueño: muestra email, campana de notificaciones y sus accesos principales', async () => {
    mockFetchPerfil({ id: 'user-1', email: 'dueno@ejemplo.test', rol: 'dueño' });

    render(<ShellNavegacion>{'contenido'}</ShellNavegacion>);

    expect(await screen.findByText('dueno@ejemplo.test')).toBeInTheDocument();
    expect(screen.getByTestId('campana-notificaciones')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Mascotas' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Menú' }).length).toBeGreaterThan(0);
  });

  it('con sesión de veterinario: muestra sus propios accesos principales, distintos de los de dueño', async () => {
    mockFetchPerfil({ id: 'vet-1', email: 'vet@ejemplo.test', rol: 'veterinario' });

    render(<ShellNavegacion>{'contenido'}</ShellNavegacion>);

    expect(await screen.findByText('vet@ejemplo.test')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Agenda' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Mascotas' })).not.toBeInTheDocument();
  });

  it('cerrar sesión llama signOut y hace un hard redirect a /', async () => {
    const usuario = userEvent.setup();
    mockFetchPerfil({ id: 'user-1', email: 'dueno@ejemplo.test', rol: 'dueño' });

    render(<ShellNavegacion>{'contenido'}</ShellNavegacion>);
    await usuario.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(signOutMock).toHaveBeenCalled();
    expect(window.location.assign).toHaveBeenCalledWith('/');
  });

  it('el botón "Volver" no aparece en / ni en /panel, pero sí en el resto', async () => {
    mockFetchPerfil({ id: 'user-1', email: 'dueno@ejemplo.test', rol: 'dueño' });
    pathnameActual = '/panel';
    const { rerender } = render(<ShellNavegacion>{'contenido'}</ShellNavegacion>);
    await screen.findByText('dueno@ejemplo.test');
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument();

    pathnameActual = '/mascotas';
    rerender(<ShellNavegacion>{'contenido'}</ShellNavegacion>);
    expect(await screen.findByRole('button', { name: 'Volver' })).toBeInTheDocument();
  });
});
