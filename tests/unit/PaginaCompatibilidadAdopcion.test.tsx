import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaginaCompatibilidadAdopcion from '@app/adopciones/compatibilidad/page';

function mockFetch(
  handler: (url: string, init?: RequestInit) => { ok: boolean; status: number; body: unknown },
) {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const r = handler(url, init);
    return { ok: r.ok, status: r.status, json: async () => r.body } as Response;
  }) as unknown as typeof fetch;
}

describe('PaginaCompatibilidadAdopcion (app/adopciones/compatibilidad)', () => {
  it('sin cuestionario previo (404): muestra el formulario vacío y deshabilita "Ver sugerencias"', async () => {
    mockFetch((url) => {
      if (url.includes('/cuestionario')) return { ok: false, status: 404, body: {} };
      return { ok: true, status: 200, body: {} };
    });
    render(<PaginaCompatibilidadAdopcion />);

    expect(await screen.findByRole('button', { name: 'Guardar cuestionario' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ver sugerencias de compatibilidad' }),
    ).toBeDisabled();
  });

  it('guarda el cuestionario y habilita generar sugerencias', async () => {
    const usuario = userEvent.setup();
    let guardado: unknown = null;
    mockFetch((url, init) => {
      if (url.includes('/cuestionario') && init?.method === 'POST') {
        guardado = {
          horasSoloEstimadas: 4,
          presenciaNinos: null,
          espacioDisponible: null,
          experienciaPrevia: null,
        };
        return { ok: true, status: 201, body: guardado };
      }
      if (url.includes('/cuestionario')) return { ok: false, status: 404, body: {} };
      return { ok: true, status: 200, body: {} };
    });
    render(<PaginaCompatibilidadAdopcion />);
    await screen.findByRole('button', { name: 'Guardar cuestionario' });

    await usuario.type(screen.getByLabelText(/horas por día/), '4');
    await usuario.click(screen.getByRole('button', { name: 'Guardar cuestionario' }));

    expect(await screen.findByText('Cuestionario guardado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver sugerencias de compatibilidad' })).toBeEnabled();
  });

  it('con cuestionario existente: genera sugerencias y las cruza con los datos de la ficha', async () => {
    const usuario = userEvent.setup();
    mockFetch((url, init) => {
      if (url.includes('/adopcion-compatibilidad/cuestionario')) {
        return {
          ok: true,
          status: 200,
          body: {
            horasSoloEstimadas: 4,
            presenciaNinos: false,
            espacioDisponible: 'departamento',
            experienciaPrevia: null,
          },
        };
      }
      if (url.includes('/adopcion-compatibilidad/sugerencias') && init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          body: [
            { id: 's1', vitrinaAdopcionId: 'ficha-1', scoreCompatibilidad: 0.8, metodo: 'reglas' },
          ],
        };
      }
      if (url.includes('/api/adopciones')) {
        return {
          ok: true,
          status: 200,
          body: {
            items: [
              {
                id: 'ficha-1',
                nombreAnimal: 'Luna',
                especie: 'gata',
                fotoUrl: 'https://example.test/luna.jpg',
              },
            ],
          },
        };
      }
      return { ok: true, status: 200, body: {} };
    });
    render(<PaginaCompatibilidadAdopcion />);
    await screen.findByDisplayValue('4');
    const boton = screen.getByRole('button', { name: 'Ver sugerencias de compatibilidad' });
    expect(boton).toBeEnabled();

    await usuario.click(boton);

    expect(await screen.findByText('Luna')).toBeInTheDocument();
    expect(screen.getByText('80% de compatibilidad')).toBeInTheDocument();
  });
});
