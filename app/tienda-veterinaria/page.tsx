'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';

interface ProductoApi {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
}

interface PaginaProductosApi {
  items: ProductoApi[];
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

/** Catálogo público de productos veterinarios activos (Módulo 6) — no requiere sesión para verse, sí para pedir. */
export default function PaginaTiendaVeterinaria() {
  const [productos, setProductos] = useState<ProductoApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pedidoEnCurso, setPedidoEnCurso] = useState<string | null>(null);
  const [mensajePorProducto, setMensajePorProducto] = useState<Record<string, string>>({});

  const cargarProductos = useCallback(async () => {
    try {
      const respuesta = await fetch('/api/veterinarios/productos');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as PaginaProductosApi;
      setProductos(datos.items.filter((p) => p.stock > 0));
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  async function pedir(producto: ProductoApi) {
    setPedidoEnCurso(producto.id);
    setMensajePorProducto((prev) => ({ ...prev, [producto.id]: '' }));

    try {
      const respuesta = await fetchConSesion(`/api/veterinarios/productos/${producto.id}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidad: 1 }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setMensajePorProducto((prev) => ({ ...prev, [producto.id]: cuerpo.mensaje }));
        setPedidoEnCurso(null);
        return;
      }

      setMensajePorProducto((prev) => ({ ...prev, [producto.id]: '¡Pedido generado!' }));
      setPedidoEnCurso(null);
      await cargarProductos();
    } catch {
      setMensajePorProducto((prev) => ({
        ...prev,
        [producto.id]:
          'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      }));
      setPedidoEnCurso(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota mostrando productos veterinarios"
          titulo="Tienda veterinaria"
          descripcion="Productos publicados por veterinarios de la red."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      {productos === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
      {productos && productos.length === 0 ? (
        <p className="text-sm text-text-muted">No hay productos disponibles por el momento.</p>
      ) : null}

      {productos && productos.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {productos.map((producto) => (
            <li key={producto.id}>
              <Tarjeta className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{producto.nombre}</p>
                    {producto.descripcion ? (
                      <p className="text-sm text-text-muted">{producto.descripcion}</p>
                    ) : null}
                    <p className="text-sm text-text-muted">
                      ${producto.precio} · {producto.stock} disponibles
                    </p>
                  </div>
                  <Boton onClick={() => pedir(producto)} disabled={pedidoEnCurso === producto.id}>
                    {pedidoEnCurso === producto.id ? 'Pidiendo…' : 'Pedir'}
                  </Boton>
                </div>
                {mensajePorProducto[producto.id] ? (
                  <p className="text-sm text-text-muted">{mensajePorProducto[producto.id]}</p>
                ) : null}
              </Tarjeta>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
