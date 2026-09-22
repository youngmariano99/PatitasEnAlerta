'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';

interface PedidoApi {
  id: string;
  productoId: string;
  compradorId: string;
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

export default function PaginaPedidosRecibidos() {
  const [pedidos, setPedidos] = useState<PedidoApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargarPedidos = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/veterinarios/pedidos-recibidos');
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

  async function actualizarEstado(id: string, estado: 'confirmado' | 'cancelado') {
    setErrorAccion(null);
    try {
      const respuesta = await fetchConSesion(`/api/veterinarios/pedidos-recibidos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorAccion(cuerpo.mensaje);
        return;
      }
      await cargarPedidos();
    } catch {
      setErrorAccion(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota revisando un pedido"
          titulo="Pedidos recibidos"
          descripcion="Pedidos que hicieron dueños sobre tu catálogo de productos."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}
      {errorAccion ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {errorAccion}
        </p>
      ) : null}

      {pedidos === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
      {pedidos && pedidos.length === 0 ? (
        <p className="text-sm text-text-muted">Todavía no recibiste ningún pedido.</p>
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
                <Tarjeta className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-text-primary">
                      {pedido.cantidad} unidad{pedido.cantidad === 1 ? '' : 'es'} · $
                      {pedido.precioUnitario} c/u
                    </p>
                    <Badge tono={estadoInfo.tono}>{estadoInfo.texto}</Badge>
                  </div>
                  {pedido.estado === 'pendiente' ? (
                    <div className="flex gap-2">
                      <Boton
                        variante="secundaria"
                        onClick={() => actualizarEstado(pedido.id, 'confirmado')}
                      >
                        Confirmar
                      </Boton>
                      <Boton
                        variante="texto"
                        onClick={() => actualizarEstado(pedido.id, 'cancelado')}
                      >
                        Cancelar
                      </Boton>
                    </div>
                  ) : null}
                </Tarjeta>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
