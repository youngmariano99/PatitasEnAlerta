import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';

interface EstadisticasComunidadProps {
  reportesActivos: number | null;
  operativosProximos: number | null;
  animalesAdopcion: number | null;
}

function formatearNumero(valor: number | null): string {
  return valor === null ? '—' : valor.toLocaleString('es-AR');
}

/**
 * Strip de 3 métricas de la home pública — reutiliza el campo `.total` que
 * ya devuelven los 3 endpoints públicos que la home consulta (`/api/reportes`,
 * `/api/municipio/eventos`, `/api/adopciones`), sin ningún fetch nuevo.
 */
export function EstadisticasComunidad({
  reportesActivos,
  operativosProximos,
  animalesAdopcion,
}: EstadisticasComunidadProps) {
  const stats = [
    { etiqueta: 'Reportes activos', valor: reportesActivos },
    { etiqueta: 'Próximos operativos', valor: operativosProximos },
    { etiqueta: 'Animales en adopción', valor: animalesAdopcion },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <Tarjeta key={stat.etiqueta} className="text-center sm:text-left">
          <p className="font-mono text-2xl font-semibold text-text-primary">
            {formatearNumero(stat.valor)}
          </p>
          <p className="text-sm text-text-muted">{stat.etiqueta}</p>
        </Tarjeta>
      ))}
    </div>
  );
}
