'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';

interface PedidoApi {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  estado: string;
  createdAt: string;
}

interface PaginaPedidosApi {
  items: PedidoApi[];
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

const ETIQUETA_ESTADO: Record<string, { texto: string; tono: 'exito' | 'neutro' | 'peligro' }> = {
  pendiente: { texto: 'Pendiente', tono: 'neutro' },
  confirmado: { texto: 'Confirmado', tono: 'exito' },
  cancelado: { texto: 'Cancelado', tono: 'peligro' },
};

export default function PaginaMisPedidos() {
  const [pedidos, setPedidos] = useState<PedidoApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarPedidos = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/veterinarios/productos/mis-pedidos');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as PaginaPedidosApi;
      setPedidos(datos.items);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota revisando una lista de pedidos"
          titulo="Mis pedidos"
          descripcion="Pedidos que hiciste en la tienda veterinaria."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {pedidos === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
      {pedidos && pedidos.length === 0 ? (
        <p className="text-sm text-text-muted">Todavía no hiciste ningún pedido.</p>
      ) : null}

      {pedidos && pedidos.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {pedidos.map((pedido) => {
            const estadoInfo = ETIQUETA_ESTADO[pedido.estado] ?? {
              texto: pedido.estado,
              tono: 'neutro' as const,
            };
            return (
              <li key={pedido.id}>
                <Tarjeta className="flex items-center justify-between gap-3">
                  <p className="text-sm text-text-primary">
                    {pedido.cantidad} unidad{pedido.cantidad === 1 ? '' : 'es'} · $
                    {pedido.precioUnitario} c/u
                  </p>
                  <Badge tono={estadoInfo.tono}>{estadoInfo.texto}</Badge>
                </Tarjeta>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
