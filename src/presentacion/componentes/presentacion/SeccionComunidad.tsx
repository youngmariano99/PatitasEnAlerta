'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PawPrint, Users, ChevronRight, Search, Download, X } from 'lucide-react';
import { Boton } from '@presentacion/componentes/ui/Boton';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// 1. Tipos
type TipoColaborador = 'persona' | 'organizacion' | 'empresa' | 'veterinario';

export type Colaborador = {
  id: string;
  nombre: string;
  tipo: TipoColaborador;
  ubicacion: string;
  aporte: string;
};

// 2. Mocks
const NOMBRES = [
  'Laura',
  'Martín',
  'Sofía',
  'Diego',
  'Camila',
  'Juan',
  'Valentina',
  'Mateo',
  'Lucía',
  'Agustín',
  'Florencia',
  'Lucas',
  'Ana',
  'Carlos',
  'Julieta',
  'Marcos',
  'Emilia',
  'Tomás',
  'Valeria',
  'Nicolás',
];
const APELLIDOS = [
  'Gómez',
  'Pérez',
  'Álvarez',
  'Rodríguez',
  'Fernández',
  'López',
  'Torres',
  'Soto',
  'Ruiz',
  'Díaz',
  'Silva',
  'Molina',
  'Castro',
  'Romero',
  'Vega',
  'Navarro',
];
const ORGANIZACIONES = [
  'Fundación Huella',
  'Refugio Campito',
  'Red Animal',
  'Zoonosis Mpal',
  'ONG Salvemos',
  'Patitas Unidas',
  'Rescate Sur',
  'Amigos Caninos',
];
const EMPRESAS = [
  'PetShop Amistad',
  'Vet Centro',
  'Alimentos Guau',
  'Clínica Animal',
  'PetStore Sur',
  'Peluquería Canina',
];
const APORTES = [
  'Ayudó en la difusión de mascotas perdidas.',
  'Brindó tránsito temporal a perros rescatados.',
  'Donó insumos veterinarios.',
  'Colaboró en campañas de vacunación.',
  'Diseñó flyers para adopciones.',
  'Aportó ideas para mejorar la plataforma.',
];

function generarColaboradoresMock(cantidad: number): Colaborador[] {
  const resultado: Colaborador[] = [];
  for (let i = 0; i < cantidad; i++) {
    const seed = i * 137;
    const typeRoll = seed % 100;

    let tipo: TipoColaborador = 'persona';
    let nombre = '';

    if (typeRoll < 50) {
      tipo = 'persona';
      nombre = `${NOMBRES[seed % NOMBRES.length]} ${APELLIDOS[(seed * 3) % APELLIDOS.length]}`;
    } else if (typeRoll < 70) {
      tipo = 'organizacion';
      nombre = ORGANIZACIONES[seed % ORGANIZACIONES.length];
    } else if (typeRoll < 85) {
      tipo = 'empresa';
      nombre = EMPRESAS[seed % EMPRESAS.length];
    } else {
      tipo = 'veterinario';
      nombre = `Dr. ${NOMBRES[(seed * 7) % NOMBRES.length]} ${APELLIDOS[(seed * 11) % APELLIDOS.length]}`;
    }

    resultado.push({
      id: `colab-${i}`,
      nombre,
      tipo,
      ubicacion: 'Coronel Pringles',
      aporte: APORTES[seed % APORTES.length],
    });
  }
  return resultado;
}

// 3. Helpers visuales
function getColorByTipo(tipo: TipoColaborador) {
  switch (tipo) {
    case 'persona':
      return { text: '#3b82f6', bg: '#eff6ff' };
    case 'organizacion':
      return { text: '#16a34a', bg: '#dcfce7' };
    case 'empresa':
      return { text: '#9333ea', bg: '#f3e8ff' };
    case 'veterinario':
      return { text: '#f59e0b', bg: '#fef3c7' };
    default:
      return { text: '#64748b', bg: '#f1f5f9' };
  }
}

function getPseudoRandomOffset(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (Math.imul(31, hash) + id.charCodeAt(i)) | 0;
  const randomX = (Math.abs(hash) % 100) / 100;
  return {
    scale: 0.85 + (Math.abs(hash >> 3) % 35) / 100, // Variar tamaño
    rotacion: (randomX - 0.5) * 20, // Rotar apenas
  };
}

// 4. Arquitectura de Cuadrícula "Panal de Abejas" (Honeycomb Layout)
const CLOUD_POSITIONS = (() => {
  const arr = [5, 6, 7, 6, 5];
  const pos: { x: number; y: number }[] = [];

  // Comprimimos un poco verticalmente (usando el 85% del espacio)
  // para que la última fila no quede tan pegada abajo y no la tapen los dibujos
  const ySpacing = 85 / (arr.length + 1);

  arr.forEach((rowCols, r) => {
    const y = 5 + ySpacing * (r + 1); // Bajamos todo un 5% para centrar en el nuevo espacio
    const xSpacing = 13;
    const startX = 50 - ((rowCols - 1) * xSpacing) / 2;
    for (let c = 0; c < rowCols; c++) {
      pos.push({ x: startX + c * xSpacing, y });
    }
  });
  return pos;
})();

const MAX_MOSTRADOS = CLOUD_POSITIONS.length;
const todosLosColaboradores = generarColaboradoresMock(5000);

export function SeccionComunidad() {
  // Inicializamos garantizando que no haya nombres repetidos
  const iniciales = useMemo(() => {
    const unicos: Colaborador[] = [];
    const nombresUsados = new Set<string>();
    for (const c of todosLosColaboradores) {
      if (unicos.length >= MAX_MOSTRADOS) break;
      const primerNombre = c.nombre.split(' ')[0];
      if (!nombresUsados.has(primerNombre)) {
        unicos.push(c);
        nombresUsados.add(primerNombre);
      }
    }
    return unicos;
  }, []);

  const [activos, setActivos] = useState<Colaborador[]>(iniciales);
  const [filtroTipo, setFiltroTipo] = useState<TipoColaborador | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<Colaborador | null>(null);

  // Efecto de rotación suave
  useEffect(() => {
    if (filtroTipo !== 'todos' || busqueda.trim() !== '') return;

    const intervalo = setInterval(() => {
      setActivos((prev) => {
        const nuevos = [...prev];
        // Cambiar 2 patas al azar
        for (let i = 0; i < 2; i++) {
          const indiceCambiar = Math.floor(Math.random() * nuevos.length);
          const candidato =
            todosLosColaboradores[Math.floor(Math.random() * todosLosColaboradores.length)];

          // Evitar que aparezca un nombre que YA está siendo mostrado (ej. dos "Juan")
          const nombreCandidato = candidato.nombre.split(' ')[0];
          const yaExisteNombre = nuevos.some((c) => c.nombre.split(' ')[0] === nombreCandidato);

          if (!yaExisteNombre) {
            nuevos[indiceCambiar] = candidato;
          }
        }
        return nuevos;
      });
    }, 4000);

    return () => clearInterval(intervalo);
  }, [filtroTipo, busqueda]);

  // Filtrado
  const mostrarColaboradores = useMemo(() => {
    let filtrados = todosLosColaboradores;
    if (filtroTipo !== 'todos') {
      filtrados = filtrados.filter((c) => c.tipo === filtroTipo);
    }
    if (busqueda.trim() !== '') {
      filtrados = filtrados.filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    }

    if (filtroTipo === 'todos' && busqueda.trim() === '') {
      return activos;
    }

    // Si buscamos o filtramos, agarramos los primeros únicos para no repetir en búsquedas amplias
    const unicos: Colaborador[] = [];
    const nombresUsados = new Set<string>();
    for (const c of filtrados) {
      if (unicos.length >= MAX_MOSTRADOS) break;
      const primerNombre = c.nombre.split(' ')[0];
      if (!nombresUsados.has(primerNombre)) {
        unicos.push(c);
        nombresUsados.add(primerNombre);
      }
    }
    return unicos;
  }, [activos, filtroTipo, busqueda]);

  // Descargar imagen
  const descargarImagen = (colab: Colaborador) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('¡Dejé mi huella!', 540, 300);

    ctx.font = '60px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('en Patitas en Alerta', 540, 400);

    ctx.font = 'bold 100px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(colab.nombre, 540, 650);

    ctx.font = '40px sans-serif';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(`Rol: ${colab.tipo.toUpperCase()}`, 540, 750);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `huella-${colab.nombre.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  return (
    <section className="w-full pt-16 bg-base overflow-hidden relative min-h-screen flex flex-col">
      {/* 1. Encabezado */}
      <div className="flex flex-col items-center text-center mb-8 max-w-4xl mx-auto px-6 relative z-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface2 text-text-primary font-medium text-sm mb-6 shadow-sm border border-surface3">
          <Users className="w-4 h-4 text-accent" /> Nuestra comunidad
        </div>

        <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-text-primary mb-6 leading-tight tracking-tight">
          Muro de colaboradores
        </h2>

        <p className="text-lg md:text-xl text-text-muted mb-6 max-w-2xl text-balance">
          Cada persona, organización y empresa que aporta deja una huella en Patitas en Alerta.
        </p>

        {/* Contador */}
        <div
          className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl border shadow-sm"
          style={{ backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }}
        >
          <span
            className="text-2xl md:text-3xl font-display font-bold"
            style={{ color: '#0073E6' }}
          >
            {todosLosColaboradores.length.toLocaleString('es-AR')}
          </span>
          <span
            className="text-sm md:text-base font-semibold text-left leading-tight"
            style={{ color: '#1E1E1E' }}
          >
            colaboradores
            <br />
            <span style={{ color: '#5B6470', fontWeight: 'normal' }}>activos</span>
          </span>
        </div>
      </div>

      {/* Controles de Filtrado */}
      <div className="max-w-5xl mx-auto px-6 w-full mb-6 z-20">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface1/80 backdrop-blur-md p-4 rounded-2xl border border-surface2 shadow-sm">
          <div className="flex flex-wrap gap-2 justify-center">
            {(['todos', 'persona', 'organizacion', 'empresa', 'veterinario'] as const).map(
              (tipo) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
                    filtroTipo === tipo
                      ? 'bg-text-primary text-base'
                      : 'bg-surface2 text-text-muted hover:bg-surface3'
                  }`}
                >
                  {tipo}
                </button>
              ),
            )}
          </div>
          <div className="w-full md:w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Buscá tu nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-base border border-surface3 rounded-xl text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 2. Muro con Cuadrícula "Panal" (Honeycomb) */}
      <div
        className="relative w-full overflow-hidden my-4"
        style={{ minHeight: '650px', backgroundColor: '#F8FAFC' }}
      >
        {/* Manchas de color de fondo simulando las nubes de la imagen */}
        <div className="absolute top-[10%] left-[20%] w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute top-[40%] right-[20%] w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-[10%] left-[40%] w-56 h-56 bg-green-100 rounded-full mix-blend-multiply filter blur-3xl opacity-60 pointer-events-none" />

        {CLOUD_POSITIONS.map((pos, i) => {
          const colaborador = mostrarColaboradores[i];

          return (
            /* Contenedor posicionado absolutamente usando las coordenadas del panal */
            <div
              key={i}
              className="absolute z-10 flex items-center justify-center"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: 'translate(-50%, -50%)',
                // En móviles limitamos el ancho para que no desborden
                width: 'clamp(50px, 12vw, 90px)',
              }}
            >
              <AnimatePresence mode="wait">
                {colaborador && (
                  <motion.button
                    key={colaborador.id}
                    onClick={() => setSeleccionado(colaborador)}
                    className="group outline-none w-full flex flex-col items-center"
                    initial={{ opacity: 0, scale: 0.3, filter: 'blur(8px)' }}
                    animate={{
                      opacity: 1,
                      scale: getPseudoRandomOffset(colaborador.id).scale,
                      rotate: getPseudoRandomOffset(colaborador.id).rotacion,
                      filter: 'blur(0px)',
                    }}
                    exit={{ opacity: 0, scale: 0.3, filter: 'blur(8px)' }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    whileHover={{
                      scale: getPseudoRandomOffset(colaborador.id).scale * 1.15,
                      zIndex: 50,
                      transition: { duration: 0.2 },
                    }}
                    aria-label={`Ver detalles de ${colaborador.nombre}`}
                  >
                    <div
                      className="p-3 md:p-4 rounded-full shadow-sm group-hover:shadow-lg transition-shadow duration-300"
                      style={{
                        backgroundColor: getColorByTipo(colaborador.tipo).bg,
                        color: getColorByTipo(colaborador.tipo).text,
                      }}
                    >
                      <PawPrint className="w-5 h-5 md:w-7 md:h-7" strokeWidth={2.5} />
                    </div>
                    {/* Tarjeta de nombre integrada */}
                    <div className="mt-1.5 md:mt-2 bg-white/95 backdrop-blur px-2 py-0.5 md:py-1 rounded-md shadow-sm border border-slate-100/50">
                      <span
                        className="text-[9px] md:text-[11px] font-bold whitespace-nowrap tracking-tight"
                        style={{ color: '#1E1E1E' }}
                      >
                        {colaborador.nombre.split(' ')[0]}
                      </span>
                    </div>
                    {/* Palabra clave concisa del rol */}
                    <span
                      className="text-[7px] md:text-[9px] font-semibold capitalize mt-1 tracking-wide"
                      style={{ color: '#5B6470' }}
                    >
                      {colaborador.tipo}
                    </span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {mostrarColaboradores.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <p className="text-text-muted">No se encontraron colaboradores con esos filtros.</p>
          </div>
        )}

        {/* Decoración Animales (Esquinas Inferiores de la Nube) */}
        {/* Usamos z-0 para que queden POR DETRÁS de las patas si es que se llegan a cruzar */}
        <div className="hidden md:block absolute bottom-0 left-0 lg:left-8 z-0 pointer-events-none translate-y-12">
          <img
            src="/animales/Inicio-Dashboard.png"
            alt="Perrito interactuando"
            className="w-48 lg:w-64 object-contain opacity-95 drop-shadow-xl"
          />
        </div>
        <div className="hidden md:block absolute bottom-0 right-0 lg:right-8 z-0 pointer-events-none translate-y-12">
          <img
            src="/animales/Preguntas-frecuentes.png"
            alt="Gatito saludando"
            className="w-40 lg:w-56 object-contain opacity-95 drop-shadow-xl"
          />
        </div>
      </div>

      {/* Sección Logos Aliados */}
      <div className="py-12 bg-white relative z-30 border-t border-surface2">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] mb-10">
            Impulsado por el apoyo de
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 transition-all duration-500">
            <img
              src="/LogoappyStudio.jpeg"
              alt="AppyStudio"
              className="h-16 md:h-24 object-contain mix-blend-multiply grayscale hover:grayscale-0 transition-all"
            />
            {/* El logo de Nodexa es blanco, le ponemos brightness-0 para hacerlo negro y visible en el fondo blanco */}
            <img
              src="/LogoNodexa.png"
              alt="Nodexa"
              className="h-16 md:h-24 object-contain brightness-0 opacity-70 hover:opacity-100 transition-all"
            />
            <img
              src="/logopatitas.png"
              alt="Patitas en Alerta"
              className="h-16 md:h-24 object-contain grayscale hover:grayscale-0 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 3. Call to Action Inferior */}
      <div className="py-20 flex flex-col items-center text-center px-6 relative z-10 bg-base border-t border-surface2">
        <img
          src="/animales/ONGs y rescatistas.png"
          alt="Comunidad unida"
          className="w-48 md:w-56 mb-8 drop-shadow-lg"
        />
        <h3 className="text-2xl md:text-3xl font-display font-bold text-text-primary mb-4">
          ¿Querés dejar tu huella?
        </h3>
        <p className="text-text-muted max-w-md mx-auto mb-8 text-balance">
          Podés colaborar con tu tiempo, tus ideas, tus conocimientos, recursos o apoyo.
        </p>
        <Link href="/foro">
          <Boton className="h-12 px-8 text-base rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 group">
            Sumate a la comunidad
            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Boton>
        </Link>
      </div>

      {/* Modal / Dialogo de Detalle */}
      <AnimatePresence>
        {seleccionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setSeleccionado(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-base rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSeleccionado(null)}
                className="absolute top-4 right-4 p-2 bg-surface1 hover:bg-surface2 rounded-full text-text-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center mt-4">
                <div
                  className="p-5 rounded-full mb-4 shadow-sm"
                  style={{
                    backgroundColor: getColorByTipo(seleccionado.tipo).bg,
                    color: getColorByTipo(seleccionado.tipo).text,
                  }}
                >
                  <PawPrint className="w-10 h-10" strokeWidth={2} />
                </div>
                <h4 className="text-2xl font-display font-bold text-text-primary leading-tight">
                  {seleccionado.nombre}
                </h4>
                <p className="text-sm font-semibold uppercase tracking-wider text-accent mt-2">
                  {seleccionado.tipo}
                </p>

                <div className="w-12 h-1 bg-surface3 rounded-full my-5" />

                <p className="text-text-muted mb-6 leading-relaxed">
                  &quot;{seleccionado.aporte}&quot;
                </p>

                <Boton
                  variante="primaria"
                  className="w-full rounded-2xl h-12 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  onClick={() => descargarImagen(seleccionado)}
                >
                  <Download className="w-4 h-4" />
                  Descargar mi huella
                </Boton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
