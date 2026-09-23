import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ResultadosCercanosTrasPublicar,
  type ResultadoCercano,
} from '@presentacion/componentes/reportes/ResultadosCercanosTrasPublicar';

describe('ResultadosCercanosTrasPublicar', () => {
  it('muestra el estado de carga mientras se buscan resultados', () => {
    render(
      <ResultadosCercanosTrasPublicar
        tipoOpuesto="encontrado"
        resultados={[]}
        cargando
        onIrAlListado={jest.fn()}
      />,
    );

    expect(screen.getByText('Buscando…')).toBeInTheDocument();
  });

  it('muestra un estado vacío cuando no hay resultados cerca', () => {
    render(
      <ResultadosCercanosTrasPublicar
        tipoOpuesto="perdido"
        resultados={[]}
        cargando={false}
        onIrAlListado={jest.fn()}
      />,
    );

    expect(
      screen.getByText(/No encontramos mascotas perdidas cerca todavía\./),
    ).toBeInTheDocument();
  });

  it('lista los reportes cercanos del tipo opuesto, cada uno con su tono de Badge', () => {
    const resultados: ResultadoCercano[] = [
      {
        id: 'r1',
        tipo: 'encontrado',
        descripcion: 'Encontrado cerca de la plaza',
        especie: 'perro',
      },
      { id: 'r2', tipo: 'encontrado', descripcion: 'Encontrado en el centro', especie: null },
    ];
    render(
      <ResultadosCercanosTrasPublicar
        tipoOpuesto="encontrado"
        resultados={resultados}
        cargando={false}
        onIrAlListado={jest.fn()}
      />,
    );

    expect(screen.getByText('Encontrado cerca de la plaza')).toBeInTheDocument();
    expect(screen.getByText('Encontrado en el centro')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '/reportes/r1');
  });

  it('dispara onIrAlListado al hacer click en "Ir al listado de reportes"', async () => {
    const usuario = userEvent.setup();
    const onIrAlListado = jest.fn();
    render(
      <ResultadosCercanosTrasPublicar
        tipoOpuesto="perdido"
        resultados={[]}
        cargando={false}
        onIrAlListado={onIrAlListado}
      />,
    );

    await usuario.click(screen.getByRole('button', { name: 'Ir al listado de reportes' }));

    expect(onIrAlListado).toHaveBeenCalledTimes(1);
  });
});
