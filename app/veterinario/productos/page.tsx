'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
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

export default function PaginaProductosVeterinario() {
  const [productos, setProductos] = useState<ProductoApi[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);

  const cargarProductos = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/veterinarios/productos/mis-productos');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as PaginaProductosApi;
      setProductos(datos.items);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  async function publicarProducto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPublicando(true);
    setErrorPublicar(null);

    try {
      const respuesta = await fetchConSesion('/api/veterinarios/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          descripcion: descripcion || undefined,
          precio: Number(precio),
          stock: Number(stock),
        }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorPublicar(cuerpo.mensaje);
        setPublicando(false);
        return;
      }

      setNombre('');
      setDescripcion('');
      setPrecio('');
      setStock('');
      setPublicando(false);
      await cargarProductos();
    } catch {
      setErrorPublicar(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setPublicando(false);
    }
  }

  async function darDeBaja(id: string) {
    const respuesta = await fetchConSesion(`/api/veterinarios/productos/${id}`, {
      method: 'DELETE',
    });
    if (respuesta.ok) {
      await cargarProductos();
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <EncabezadoIlustrado
          imagenSrc="/animales/Veterinarias  gestión y registros clínicos.png"
          alt="Mascota junto a un mostrador de productos"
          titulo="Mi catálogo de productos"
          descripcion="Publicá los productos que vendés — los dueños los van a poder pedir desde su panel."
        />
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      ) : null}

      <form onSubmit={publicarProducto} noValidate className="flex flex-col gap-3">
        <CampoTexto
          id="nombre"
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
        />
        <CampoTexto
          id="descripcion"
          label="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <CampoTexto
          id="precio"
          label="Precio"
          type="number"
          min={0}
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          required
        />
        <CampoTexto
          id="stock"
          label="Stock"
          type="number"
          min={0}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          error={errorPublicar ?? undefined}
          required
        />
        <Boton type="submit" disabled={publicando || !nombre.trim() || !precio || !stock}>
          {publicando ? 'Publicando…' : 'Publicar producto'}
        </Boton>
      </form>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Mis productos</h2>
        {productos === null && !error ? <p className="text-sm text-text-muted">Cargando…</p> : null}
        {productos && productos.length === 0 ? (
          <p className="text-sm text-text-muted">Todavía no publicaste ningún producto.</p>
        ) : null}
        {productos && productos.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {productos.map((producto) => (
              <li key={producto.id}>
                <Tarjeta className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{producto.nombre}</p>
                    <p className="text-sm text-text-muted">
                      ${producto.precio} · Stock: {producto.stock}
                    </p>
                  </div>
                  <Boton variante="texto" onClick={() => darDeBaja(producto.id)}>
                    Dar de baja
                  </Boton>
                </Tarjeta>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
