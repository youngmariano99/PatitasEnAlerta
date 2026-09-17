'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { fetchConSesion } from '@presentacion/lib/fetchConSesion';
import { CampoTexto } from '@presentacion/componentes/formularios/CampoTexto';
import { Boton } from '@presentacion/componentes/ui/Boton';
import { Tarjeta } from '@presentacion/componentes/ui/Tarjeta';
import { Badge } from '@presentacion/componentes/ui/Badge';
import { EncabezadoIlustrado } from '@presentacion/componentes/estado/EncabezadoIlustrado';
import { TIPOS_COMERCIO_SOPORTADOS } from '@aplicacion/dtos/comercios/RegistrarComercioDto';

// Leaflet toca `window` al inicializarse — dynamic import con ssr:false,
// mismo criterio que app/municipio/eventos/nuevo (SelectorUbicacionMapa).
const SelectorUbicacionMapa = dynamic(
  () =>
    import('@presentacion/componentes/mapas/SelectorUbicacionMapa').then(
      (mod) => mod.SelectorUbicacionMapa,
    ),
  { ssr: false, loading: () => <p className="text-sm text-text-muted">Cargando mapa…</p> },
);

const CENTRO_POR_DEFECTO: [number, number] = [-37.9989, -61.3565];

const ETIQUETAS_TIPO: Record<(typeof TIPOS_COMERCIO_SOPORTADOS)[number], string> = {
  pet_shop: 'Pet shop',
  forrajeria: 'Forrajería',
  peluqueria: 'Peluquería canina',
  farmacia_veterinaria: 'Farmacia veterinaria',
  otro: 'Otro',
};

const ETIQUETA_ESTADO: Record<string, { texto: string; tono: 'exito' | 'neutro' | 'peligro' }> = {
  pendiente: { texto: 'En revisión', tono: 'neutro' },
  verificado: { texto: 'Verificado', tono: 'exito' },
  rechazado: { texto: 'Rechazado', tono: 'peligro' },
};

interface ComercioApi {
  id: string;
  estadoVerificacion: string;
}

interface ProductoApi {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
  precio: number | null;
}

interface RespuestaError {
  codigo: string;
  mensaje: string;
}

export default function PaginaPanelComercio() {
  const [comercio, setComercio] = useState<ComercioApi | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [nombreComercio, setNombreComercio] = useState('');
  const [tipoComercio, setTipoComercio] = useState<(typeof TIPOS_COMERCIO_SOPORTADOS)[number] | ''>(
    '',
  );
  const [direccion, setDireccion] = useState('');
  const [posicion, setPosicion] = useState<[number, number] | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);

  const [productos, setProductos] = useState<ProductoApi[] | null>(null);
  const [nombreProducto, setNombreProducto] = useState('');
  const [descripcionProducto, setDescripcionProducto] = useState('');
  const [categoriaProducto, setCategoriaProducto] = useState('');
  const [precioProducto, setPrecioProducto] = useState('');
  const [publicando, setPublicando] = useState(false);
  const [errorProducto, setErrorProducto] = useState<string | null>(null);

  const cargarComercio = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/comercios/mi-comercio');
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setError(cuerpo.mensaje);
        return;
      }
      const datos = (await respuesta.json()) as ComercioApi | null;
      setComercio(datos);
    } catch {
      setError('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.');
    }
  }, []);

  const cargarProductos = useCallback(async () => {
    try {
      const respuesta = await fetchConSesion('/api/comercios/productos');
      if (respuesta.ok) {
        setProductos((await respuesta.json()) as ProductoApi[]);
      }
    } catch {
      // El catálogo es secundario a la carga del comercio — un error acá no bloquea la pantalla.
    }
  }, []);

  useEffect(() => {
    cargarComercio();
  }, [cargarComercio]);

  useEffect(() => {
    if (comercio) cargarProductos();
  }, [comercio, cargarProductos]);

  async function registrarComercio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!posicion) {
      setErrorRegistro('Marcá la ubicación de tu comercio en el mapa.');
      return;
    }
    setRegistrando(true);
    setErrorRegistro(null);

    try {
      const respuesta = await fetchConSesion('/api/comercios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreComercio,
          tipoComercio,
          direccion,
          latitud: posicion[0],
          longitud: posicion[1],
        }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorRegistro(cuerpo.mensaje);
        setRegistrando(false);
        return;
      }

      const creado = (await respuesta.json()) as ComercioApi;
      setComercio(creado);
      setRegistrando(false);
    } catch {
      setErrorRegistro(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setRegistrando(false);
    }
  }

  async function publicarProducto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setPublicando(true);
    setErrorProducto(null);

    try {
      const respuesta = await fetchConSesion('/api/comercios/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreProducto,
          descripcion: descripcionProducto || undefined,
          categoria: categoriaProducto || undefined,
          precio: precioProducto ? Number(precioProducto) : undefined,
        }),
      });

      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json()) as RespuestaError;
        setErrorProducto(cuerpo.mensaje);
        setPublicando(false);
        return;
      }

      setNombreProducto('');
      setDescripcionProducto('');
      setCategoriaProducto('');
      setPrecioProducto('');
      setPublicando(false);
      await cargarProductos();
    } catch {
      setErrorProducto(
        'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
      );
      setPublicando(false);
    }
  }

  async function darDeBajaProducto(id: string) {
    const respuesta = await fetchConSesion(`/api/comercios/productos/${id}`, { method: 'DELETE' });
    if (respuesta.ok) {
      await cargarProductos();
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <span aria-hidden="true">⚠️</span>
          {error}
        </p>
      </main>
    );
  }

  if (comercio === undefined) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <p className="text-sm text-text-muted">Cargando…</p>
      </main>
    );
  }

  if (!comercio) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <EncabezadoIlustrado
          imagenSrc="/animales/Registro.png"
          alt="Mascota ayudando a registrar un comercio"
          titulo="Registrá tu comercio"
          descripcion="Una vez verificado, vas a poder publicar tu catálogo de productos."
        />
        <div className="mt-6" />

        <form onSubmit={registrarComercio} noValidate className="flex flex-col gap-4">
          <CampoTexto
            id="nombreComercio"
            label="Nombre del comercio"
            value={nombreComercio}
            onChange={(e) => setNombreComercio(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tipoComercio" className="text-sm font-medium text-text-primary">
              Tipo de comercio
            </label>
            <select
              id="tipoComercio"
              value={tipoComercio}
              onChange={(e) => setTipoComercio(e.target.value as typeof tipoComercio)}
              className="h-11 min-h-[44px] rounded-md border border-surface2 bg-surface1 px-3 text-[15px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              required
            >
              <option value="">Elegí una opción</option>
              {TIPOS_COMERCIO_SOPORTADOS.map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETAS_TIPO[valor]}
                </option>
              ))}
            </select>
          </div>

          <CampoTexto
            id="direccion"
            label="Dirección"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">Ubicación</span>
            <div className="h-64 overflow-hidden rounded-md border border-surface2">
              <SelectorUbicacionMapa
                centro={posicion ?? CENTRO_POR_DEFECTO}
                posicion={posicion}
                onSeleccionar={(lat, lon) => setPosicion([lat, lon])}
              />
            </div>
          </div>

          {errorRegistro ? (
            <p className="flex items-center gap-1.5 text-sm text-danger">
              <span aria-hidden="true">⚠️</span>
              {errorRegistro}
            </p>
          ) : null}

          <Boton
            type="submit"
            disabled={registrando || !nombreComercio.trim() || !tipoComercio || !direccion.trim()}
          >
            {registrando ? 'Registrando…' : 'Registrar comercio'}
          </Boton>
        </form>
      </main>
    );
  }

  const estadoInfo = ETIQUETA_ESTADO[comercio.estadoVerificacion] ?? {
    texto: comercio.estadoVerificacion,
    tono: 'neutro' as const,
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-2">
        <EncabezadoIlustrado
          imagenSrc="/animales/Registro.png"
          alt="Mascota mostrando un catálogo de productos"
          titulo="Mi comercio"
        />
      </div>
      <Badge tono={estadoInfo.tono}>{estadoInfo.texto}</Badge>

      {comercio.estadoVerificacion !== 'verificado' ? (
        <p className="mt-4 text-sm text-text-muted">
          Tu comercio está en revisión. Vas a poder publicar productos una vez que el municipio lo
          verifique.
        </p>
      ) : (
        <>
          <form
            onSubmit={publicarProducto}
            noValidate
            className="mt-6 flex flex-col gap-3 border-t border-surface2 pt-6"
          >
            <h2 className="font-display text-lg font-semibold text-text-primary">
              Publicar producto
            </h2>
            <CampoTexto
              id="nombreProducto"
              label="Nombre"
              value={nombreProducto}
              onChange={(e) => setNombreProducto(e.target.value)}
              required
            />
            <CampoTexto
              id="descripcionProducto"
              label="Descripción (opcional)"
              value={descripcionProducto}
              onChange={(e) => setDescripcionProducto(e.target.value)}
            />
            <CampoTexto
              id="categoriaProducto"
              label="Categoría (opcional)"
              placeholder="alimento, higiene, accesorios…"
              value={categoriaProducto}
              onChange={(e) => setCategoriaProducto(e.target.value)}
            />
            <CampoTexto
              id="precioProducto"
              label="Precio (opcional)"
              type="number"
              min={0}
              value={precioProducto}
              onChange={(e) => setPrecioProducto(e.target.value)}
              error={errorProducto ?? undefined}
            />
            <Boton type="submit" disabled={publicando || !nombreProducto.trim()}>
              {publicando ? 'Publicando…' : 'Publicar producto'}
            </Boton>
          </form>

          <div className="mt-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">
              Mis productos
            </h2>
            {productos === null ? <p className="text-sm text-text-muted">Cargando…</p> : null}
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
                          {producto.categoria ?? 'Sin categoría'}
                          {producto.precio != null ? ` · $${producto.precio}` : ''}
                        </p>
                      </div>
                      <Boton variante="texto" onClick={() => darDeBajaProducto(producto.id)}>
                        Dar de baja
                      </Boton>
                    </Tarjeta>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      )}
    </main>
  );
}
