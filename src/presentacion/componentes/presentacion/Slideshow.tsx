'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  FileText,
  Heart,
  Activity,
  MapPin,
  ShieldAlert,
  Users,
  Target,
  BrainCircuit,
  Database,
  Cpu,
  Megaphone,
  Stethoscope,
  MessageSquare,
} from 'lucide-react';
import Image from 'next/image';

const SLIDES = [
  // FASE 1: Introducción
  {
    id: 1,
    title: 'Patitas en Alerta',
    subtitle: 'Conectando a la comunidad por el bienestar animal',
    bgImage: '/Banner_inicial.png',
    overlay: true,
  },
  {
    id: 2,
    title: 'El Origen',
    content: (
      <div className="flex flex-col gap-6 text-xl">
        <p>
          La idea de este proyecto nació de mis ganas de generar un{' '}
          <strong>impacto positivo en la comunidad</strong> aplicando los conocimientos adquiridos
          en la Tecnicatura en Programación.
        </p>
        <p>
          Quería construir algo que no solo fuera un ejercicio académico, sino una herramienta real
          para resolver problemas diarios que enfrentamos todos.
        </p>
      </div>
    ),
    icon: <Heart className="w-16 h-16 text-accent mb-4" />,
  },
  {
    id: 3,
    title: 'Benchmarking: ¿Qué hay en el mercado?',
    content: (
      <div className="flex flex-col gap-6 text-xl">
        <p>
          Investigando apps actuales noté que resuelven problemas de forma{' '}
          <strong>fragmentada</strong>:
        </p>
        <ul className="list-disc list-inside space-y-4 ml-4">
          <li>
            <strong>VetCard:</strong> Libretas digitales.
          </li>
          <li>
            <strong>appPet:</strong> Gestión Veterinaria.
          </li>
          <li>
            <strong>Snout:</strong> Gestión de refugios.
          </li>
          <li>
            <strong>PetsApp:</strong> Telemedicina.
          </li>
        </ul>
        <div className="mt-6 p-4 bg-red-500/10 border-l-4 border-red-500 rounded text-red-700 dark:text-red-300">
          <strong>Falla principal:</strong> Es inexistente una plataforma que <em>integre</em> a
          todos los involucrados en el ecosistema local.
        </div>
      </div>
    ),
    icon: <Search className="w-16 h-16 text-accent mb-4" />,
  },
  {
    id: 4,
    title: 'Problemáticas Locales',
    content: (
      <div className="grid grid-cols-2 gap-6 text-lg mt-4">
        <div className="bg-surface2 p-6 rounded-xl flex gap-4 items-start">
          <MapPin className="w-8 h-8 text-danger shrink-0" />
          <p>
            Reportes de animales perdidos en Facebook sin <strong>ninguna trazabilidad</strong>.
          </p>
        </div>
        <div className="bg-surface2 p-6 rounded-xl flex gap-4 items-start">
          <FileText className="w-8 h-8 text-warning shrink-0" />
          <p>
            Gestión de turnos de Zoonosis (castraciones) aún en <strong>papel</strong>.
          </p>
        </div>
        <div className="bg-surface2 p-6 rounded-xl flex gap-4 items-start">
          <Users className="w-8 h-8 text-accent shrink-0" />
          <p>
            <strong>Desgaste extremo</strong> de ONGs y voluntarios buscando recursos a pulmón.
          </p>
        </div>
        <div className="bg-surface2 p-6 rounded-xl flex gap-4 items-start">
          <Stethoscope className="w-8 h-8 text-info shrink-0" />
          <p>Veterinarias pequeñas sin recursos para llevar control digital de pacientes.</p>
        </div>
        <div className="bg-surface2 p-6 rounded-xl flex gap-4 items-start">
          <Database className="w-8 h-8 text-purple-500 shrink-0" />
          <p>
            Pérdida total de <strong>datos estadísticos</strong> para tomar políticas públicas
            locales.
          </p>
        </div>
        <div className="bg-surface2 p-6 rounded-xl flex gap-4 items-start">
          <Megaphone className="w-8 h-8 text-green-500 shrink-0" />
          <p>
            Falta de conocimiento sobre la <strong>tenencia responsable</strong> de mascotas.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    content: (
      <div className="flex flex-col items-center text-center h-full justify-center">
        <Target className="w-24 h-24 text-accent mb-8" />
        <h2 className="text-4xl md:text-5xl font-bold leading-tight max-w-4xl text-text-primary">
          &quot;Centralizar y unir a todos los interesados brindándoles herramientas digitales que
          potencien y faciliten la ayuda que ya están intentando dar.&quot;
        </h2>
      </div>
    ),
  },
  // FASE 2: MVP
  {
    id: 6,
    title: 'Reportes Centralizados',
    subtitle: 'Registro de animales perdidos/encontrados y alertas ciudadanas',
    image: '/Reportar-encontrado-perdido.png',
    imagePosition: 'right',
  },
  {
    id: 7,
    title: 'Dashboard para Zoonosis',
    subtitle: 'Transformando datos sueltos en información de calidad y mapas de calor',
    image: '/Inicio-Dashboard.png',
    imagePosition: 'right',
  },
  {
    id: 8,
    title: 'Gestión Inteligente de Turnos',
    subtitle: 'Digitalización de campañas de castración. Reduce tiempos y notifica a ciudadanos.',
    image: '/Datos y turnos del municipio.png',
    imagePosition: 'left',
  },
  {
    id: 9,
    title: 'Adopción Consciente',
    subtitle:
      'Emparejamiento cruzando el estilo de vida del usuario con las necesidades del animal.',
    image: '/Adopciones.png',
    imagePosition: 'right',
  },
  {
    id: 10,
    title: 'Gestión Veterinaria y Marketplace',
    subtitle: 'Libretas sanitarias digitales y espacio para comerciantes locales.',
    image: '/Comercios-Veterinarios.png',
    imagePosition: 'left',
  },
  {
    id: 11,
    title: 'Asistencia a ONGs',
    subtitle:
      'Herramientas de gestión para aliviar el desgaste físico y mental de los voluntarios.',
    image: '/ONGs y rescatistas.png',
    imagePosition: 'right',
  },
  // FASE 3: Futuro e IA
  {
    id: 12,
    title: 'El Futuro: Inteligencia Artificial',
    subtitle: 'El MVP prepara el terreno estructurando datos limpios. ¿Qué sigue?',
    content: (
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div className="flex flex-col gap-4 items-center text-center p-6 bg-surface2 rounded-2xl">
          <Activity className="w-16 h-16 text-accent" />
          <h3 className="text-xl font-bold">Análisis Predictivo</h3>
          <p className="text-text-muted">
            Descubrir patrones ocultos para que Zoonosis se anticipe a brotes o zonas críticas.
          </p>
        </div>
        <div className="flex flex-col gap-4 items-center text-center p-6 bg-surface2 rounded-2xl">
          <BrainCircuit className="w-16 h-16 text-accent" />
          <h3 className="text-xl font-bold">Machine Learning en Adopciones</h3>
          <p className="text-text-muted">
            Refinar el algoritmo de emparejamiento usando el registro histórico de éxito.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 13,
    title: 'Búsqueda Potenciada por IA e IoT',
    content: (
      <div className="flex flex-col items-center text-center gap-8 mt-12">
        <Cpu className="w-24 h-24 text-accent" />
        <h3 className="text-3xl font-bold">Reconocimiento de Imágenes</h3>
        <p className="text-xl text-text-muted max-w-2xl">
          Integración con IA para detectar automáticamente coincidencias entre animales encontrados
          y reportados como perdidos mediante el análisis de sus fotos. Conexión futura con cámaras
          y lectores de microchips.
        </p>
      </div>
    ),
  },
  {
    id: 14,
    title: 'Asistente IA + Notificaciones Inteligentes',
    content: (
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div className="flex flex-col gap-4 p-8 bg-surface2 rounded-2xl">
          <MessageSquare className="w-12 h-12 text-accent" />
          <h3 className="text-2xl font-bold">Asistente Virtual</h3>
          <p className="text-lg text-text-muted">
            Chatbot para consultar temas de bienestar animal y tenencia responsable, derivando a un
            profesional humano cuando sea necesario.
          </p>
        </div>
        <div className="flex flex-col gap-4 p-8 bg-surface2 rounded-2xl">
          <ShieldAlert className="w-12 h-12 text-accent" />
          <h3 className="text-2xl font-bold">Notificaciones Proactivas</h3>
          <p className="text-lg text-text-muted">
            Alertas automáticas para mantener al día tratamientos, vacunaciones y un seguimiento
            inteligente de la mascota.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 15,
    title: 'Expansión Funcional',
    content: (
      <div className="flex flex-col gap-8 mt-8">
        <div className="flex items-center gap-6 p-6 bg-surface2 rounded-2xl">
          <Heart className="w-12 h-12 text-danger shrink-0" />
          <div>
            <h3 className="text-2xl font-bold mb-2">Gestión de Donaciones y Recursos</h3>
            <p className="text-lg text-text-muted">
              Las ONGs podrán pedir donaciones en la web de forma oficial y segura, automatizando la
              gestión predictiva de inventarios.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 p-6 bg-surface2 rounded-2xl">
          <ShieldAlert className="w-12 h-12 text-warning shrink-0" />
          <div>
            <h3 className="text-2xl font-bold mb-2">Denuncias Directas</h3>
            <p className="text-lg text-text-muted">
              Canal seguro para realizar denuncias formales sobre maltratos u otras conductas
              indebidas a las autoridades correspondientes.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  // FASE 4: Final
  {
    id: 16,
    title: 'Mariano Young',
    subtitle: 'Técnico en programación y futuro administrador de empresas',
    content: (
      <div className="flex flex-col items-center mt-12 gap-6">
        <div className="w-40 h-40 rounded-full bg-accent text-white flex items-center justify-center text-6xl font-bold">
          MY
        </div>
        <p className="text-2xl text-center max-w-3xl text-text-muted mt-4">
          Buscando siempre tender un puente entre las necesidades reales de los negocios y las
          soluciones tecnológicas eficientes.
        </p>
      </div>
    ),
  },
  {
    id: 17,
    title: 'Experiencia',
    subtitle: 'Desarrollo de sistemas de gestión y webs',
    content: (
      <div className="flex flex-col items-center mt-8 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-xl w-64 h-32 relative flex items-center justify-center">
          <Image
            src="/LogoappyStudio.jpeg"
            alt="Appy Studio"
            fill
            className="object-contain p-4 rounded-xl"
          />
        </div>
        <ul className="text-xl space-y-4 list-disc list-inside">
          <li>
            Catálogo web para <strong>Filomena</strong>
          </li>
          <li>
            Marketplace de servicios para <strong>Argoot</strong>
          </li>
          <li>
            Página web para tapicería <strong>Italia</strong>
          </li>
          <li>
            Sistema de gestión para Leñera <strong>&quot;Los chingolitos&quot;</strong>
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 18,
    title: 'Nodexa',
    subtitle: 'Tu aliado tecnológico',
    content: (
      <div className="flex flex-col items-center gap-8 mt-4">
        <div className="bg-white p-6 rounded-2xl shadow-xl w-80 h-32 relative flex items-center justify-center">
          <Image
            src="/LogoNodexa.png"
            alt="Nodexa"
            fill
            className="object-contain p-4 rounded-xl"
          />
        </div>
        <p className="text-xl text-center max-w-4xl leading-relaxed">
          Agencia de desarrollo de software enfocada en entender problemas y encontrar soluciones
          que generen un impacto positivo en los clientes.
          <br />
          <br />
          Ajustando el servicio a los intereses y posibilidades: brindando desde herramientas
          accesibles para iniciar de a poco (suscripciones), hasta sistemas robustos y a medida.
        </p>
      </div>
    ),
  },
  {
    id: 19,
    content: (
      <div className="flex flex-col items-center justify-center h-full gap-12 text-center w-full">
        <h2 className="text-5xl md:text-7xl font-bold text-accent">¡Muchas Gracias!</h2>
        <div className="flex gap-8 text-xl md:text-2xl mt-8">
          <div className="flex items-center gap-4 bg-surface2 px-8 py-4 rounded-full">
            <span className="font-bold">Instagram:</span> @marianoyoung.dev
          </div>
          <div className="flex items-center gap-4 bg-surface2 px-8 py-4 rounded-full">
            <span className="font-bold">TikTok:</span> @young_mariano
          </div>
        </div>
      </div>
    ),
  },
];

export function Slideshow() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => Math.min(prev + 1, SLIDES.length - 1));
  const prev = () => setCurrent((prev) => Math.max(prev - 1, 0));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const slide = SLIDES[current];

  return (
    <div className="fixed inset-0 bg-surface1 text-text-primary overflow-hidden flex flex-col z-[9999]">
      {/* Barra de progreso */}
      <div className="h-2 w-full bg-surface2 absolute top-0 left-0 z-50">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${((current + 1) / SLIDES.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="flex-1 w-full h-full relative flex items-center justify-center p-12 lg:p-24"
        >
          {slide.bgImage && (
            <div className="absolute inset-0 z-0">
              <Image src={slide.bgImage} alt="" fill className="object-cover" priority />
              {slide.overlay && <div className="absolute inset-0 bg-black/60" />}
            </div>
          )}

          <div className="z-10 w-full max-w-7xl mx-auto h-full flex flex-col justify-center">
            {/* Header del slide */}
            {slide.title && (
              <div className="mb-8 md:mb-12 text-center md:text-left">
                {slide.icon && (
                  <div className="mb-4 flex justify-center md:justify-start">{slide.icon}</div>
                )}
                <h1
                  className={`text-4xl md:text-6xl font-black mb-4 ${slide.bgImage ? 'text-white' : 'text-text-primary'}`}
                >
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p
                    className={`text-xl md:text-3xl font-medium ${slide.bgImage ? 'text-gray-200' : 'text-accent'}`}
                  >
                    {slide.subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Cuerpo principal */}
            <div
              className={`flex-1 flex ${slide.imagePosition === 'left' ? 'flex-col md:flex-row-reverse' : 'flex-col md:flex-row'} items-center gap-12 w-full max-h-full`}
            >
              {slide.content && <div className="flex-1 w-full">{slide.content}</div>}

              {slide.image && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="flex-1 relative w-full min-h-[40vh] md:min-h-[60vh] rounded-2xl overflow-hidden shadow-2xl border-4 border-surface2"
                >
                  <Image
                    src={slide.image}
                    alt={slide.title || 'Slide image'}
                    fill
                    className="object-contain bg-surface2"
                  />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controles flotantes */}
      <div className="absolute bottom-8 right-8 flex gap-4 z-50">
        <button
          onClick={prev}
          disabled={current === 0}
          className="p-4 rounded-full bg-surface2 text-text-primary hover:bg-surface3 disabled:opacity-30 transition-all shadow-lg"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={next}
          disabled={current === SLIDES.length - 1}
          className="p-4 rounded-full bg-accent text-white hover:brightness-110 disabled:opacity-30 transition-all shadow-lg"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Indicador de número */}
      <div className="absolute bottom-8 left-8 text-text-muted font-bold text-xl z-50 bg-surface1/80 px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
        {current + 1} / {SLIDES.length}
      </div>
    </div>
  );
}
