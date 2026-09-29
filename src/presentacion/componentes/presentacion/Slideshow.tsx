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

import type { Variants } from 'framer-motion';

const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const STAGGER_ITEM: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const SLIDES = [
  // FASE 1: Introducción
  {
    id: 1,
    title: 'Patitas en Alerta',
    subtitle: 'Conectando a nuestra comunidad para proteger a quienes no tienen voz.',
    bgImage: '/Banner_inicial.png',
    overlay: true,
    logo: '/logopatitas.png',
  },
  {
    id: 2,
    title: 'El Origen',
    image: '/Banner_inicial2.png',
    imagePosition: 'right',
    content: (
      <motion.div
        variants={STAGGER_CONTAINER}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 text-xl md:text-2xl leading-relaxed"
      >
        <motion.p variants={STAGGER_ITEM}>
          La idea de este proyecto nació de mis ganas de generar un{' '}
          <strong>impacto positivo en la comunidad</strong> aplicando los conocimientos adquiridos
          en la Tecnicatura en Programación.
        </motion.p>
        <motion.p variants={STAGGER_ITEM}>
          Quería construir algo que no solo fuera un ejercicio académico, sino una herramienta real
          para resolver problemas diarios que enfrentamos todos respecto al bienestar animal.
        </motion.p>
      </motion.div>
    ),
    icon: <Heart className="w-20 h-20 text-accent mb-6" />,
  },
  {
    id: 3,
    title: 'Benchmarking: ¿Qué hay en el mercado?',
    content: (
      <motion.div
        variants={STAGGER_CONTAINER}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 text-xl md:text-2xl leading-relaxed"
      >
        <motion.p variants={STAGGER_ITEM}>
          Investigando apps actuales noté que resuelven problemas de forma{' '}
          <strong>fragmentada</strong>:
        </motion.p>
        <motion.ul variants={STAGGER_ITEM} className="list-disc list-inside space-y-6 ml-6">
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
        </motion.ul>
        <motion.div
          variants={STAGGER_ITEM}
          className="mt-8 p-6 bg-red-500/10 border-l-8 border-red-500 rounded text-red-700 dark:text-red-300 font-medium"
        >
          <strong>Falla principal:</strong> Es inexistente una plataforma que <em>integre</em> a
          todos los involucrados en el ecosistema local.
        </motion.div>
      </motion.div>
    ),
    icon: <Search className="w-20 h-20 text-accent mb-6" />,
  },
  {
    id: 4,
    title: 'Problemáticas Locales',
    content: (
      <motion.div
        variants={STAGGER_CONTAINER}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-6 text-xl md:text-2xl mt-4"
      >
        <motion.div
          variants={STAGGER_ITEM}
          className="bg-surface2 p-8 rounded-2xl flex gap-6 items-start shadow-sm hover:shadow-md transition-shadow"
        >
          <MapPin className="w-12 h-12 text-danger shrink-0 mt-1" />
          <p>
            Reportes de animales perdidos en Facebook sin <strong>ninguna trazabilidad</strong>.
          </p>
        </motion.div>
        <motion.div
          variants={STAGGER_ITEM}
          className="bg-surface2 p-8 rounded-2xl flex gap-6 items-start shadow-sm hover:shadow-md transition-shadow"
        >
          <FileText className="w-12 h-12 text-warning shrink-0 mt-1" />
          <p>
            Gestión de turnos de Zoonosis (castraciones) aún en <strong>papel</strong>.
          </p>
        </motion.div>
        <motion.div
          variants={STAGGER_ITEM}
          className="bg-surface2 p-8 rounded-2xl flex gap-6 items-start shadow-sm hover:shadow-md transition-shadow"
        >
          <Users className="w-12 h-12 text-accent shrink-0 mt-1" />
          <p>
            <strong>Desgaste extremo</strong> de ONGs y voluntarios buscando recursos a pulmón.
          </p>
        </motion.div>
        <motion.div
          variants={STAGGER_ITEM}
          className="bg-surface2 p-8 rounded-2xl flex gap-6 items-start shadow-sm hover:shadow-md transition-shadow"
        >
          <Stethoscope className="w-12 h-12 text-info shrink-0 mt-1" />
          <p>Veterinarias pequeñas sin recursos para llevar control digital de pacientes.</p>
        </motion.div>
        <motion.div
          variants={STAGGER_ITEM}
          className="bg-surface2 p-8 rounded-2xl flex gap-6 items-start shadow-sm hover:shadow-md transition-shadow"
        >
          <Database className="w-12 h-12 text-purple-500 shrink-0 mt-1" />
          <p>
            Pérdida total de <strong>datos estadísticos</strong> para tomar políticas públicas
            locales.
          </p>
        </motion.div>
        <motion.div
          variants={STAGGER_ITEM}
          className="bg-surface2 p-8 rounded-2xl flex gap-6 items-start shadow-sm hover:shadow-md transition-shadow"
        >
          <Megaphone className="w-12 h-12 text-green-500 shrink-0 mt-1" />
          <p>
            Falta de conocimiento sobre la <strong>tenencia responsable</strong> de mascotas.
          </p>
        </motion.div>
      </motion.div>
    ),
  },
  {
    id: 5,
    bgImage: '/Banner_inicial2.png',
    overlay: true,
    content: (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center text-center h-full justify-center bg-black/40 p-12 rounded-3xl backdrop-blur-sm"
      >
        <Target className="w-32 h-32 text-accent mb-12" />
        <h2 className="text-3xl md:text-6xl font-black leading-tight max-w-5xl text-white drop-shadow-lg">
          &quot;Centralizar y unir a todos los interesados brindándoles herramientas digitales que
          potencien y faciliten la ayuda que ya están intentando dar.&quot;
        </h2>
      </motion.div>
    ),
  },
  // FASE 2: MVP
  {
    id: 6,
    title: 'Reportes Centralizados',
    subtitle: 'Registro de animales perdidos/encontrados y alertas ciudadanas',
    image: '/acceso-rapido/Reportar-encontrado-perdido.png',
    imagePosition: 'right',
  },
  {
    id: 7,
    title: 'Dashboard para Zoonosis',
    subtitle: 'Transformando datos sueltos en información de calidad y mapas de calor',
    image: '/animales/Inicio-Dashboard.png',
    imagePosition: 'right',
  },
  {
    id: 8,
    title: 'Gestión Inteligente de Turnos',
    subtitle: 'Digitalización de campañas de castración. Reduce tiempos y notifica a ciudadanos.',
    image: '/animales/Datos y turnos del municipio.png',
    imagePosition: 'left',
  },
  {
    id: 9,
    title: 'Adopción Consciente',
    subtitle:
      'Emparejamiento cruzando el estilo de vida del usuario con las necesidades del animal.',
    image: '/acceso-rapido/Adopciones.png',
    imagePosition: 'right',
  },
  {
    id: 10,
    title: 'Gestión Veterinaria y Marketplace',
    subtitle: 'Libretas sanitarias digitales y espacio para comerciantes locales.',
    image: '/acceso-rapido/Comercios-Veterinarios.png',
    imagePosition: 'left',
  },
  {
    id: 11,
    title: 'Asistencia a ONGs',
    subtitle:
      'Herramientas de gestión para aliviar el desgaste físico y mental de los voluntarios.',
    image: '/animales/ONGs y rescatistas.png',
    imagePosition: 'right',
  },
  // FASE 3: Futuro e IA
  {
    id: 12,
    title: 'El Futuro: Inteligencia Artificial',
    subtitle: 'El MVP prepara el terreno estructurando datos limpios. ¿Qué sigue?',
    content: (
      <motion.div
        variants={STAGGER_CONTAINER}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-8 mt-12"
      >
        <motion.div
          variants={STAGGER_ITEM}
          className="flex flex-col gap-6 items-center text-center p-10 bg-surface2 rounded-3xl shadow-lg border border-surface3"
        >
          <Activity className="w-24 h-24 text-accent" />
          <h3 className="text-2xl font-bold">Análisis Predictivo</h3>
          <p className="text-xl text-text-muted">
            Descubrir patrones ocultos para que Zoonosis se anticipe a brotes o zonas críticas.
          </p>
        </motion.div>
        <motion.div
          variants={STAGGER_ITEM}
          className="flex flex-col gap-6 items-center text-center p-10 bg-surface2 rounded-3xl shadow-lg border border-surface3"
        >
          <BrainCircuit className="w-24 h-24 text-accent" />
          <h3 className="text-2xl font-bold">Machine Learning</h3>
          <p className="text-xl text-text-muted">
            Refinar el algoritmo de emparejamiento de adopciones usando el registro histórico de
            éxito.
          </p>
        </motion.div>
      </motion.div>
    ),
  },
  {
    id: 13,
    title: 'Búsqueda Potenciada por IA e IoT',
    content: (
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
        className="flex flex-col items-center text-center gap-8 mt-16 p-12 bg-surface2 rounded-3xl shadow-xl border border-surface3"
      >
        <Cpu className="w-32 h-32 text-accent" />
        <h3 className="text-3xl font-black">Reconocimiento de Imágenes</h3>
        <p className="text-2xl text-text-muted max-w-4xl leading-relaxed">
          Integración con IA para detectar automáticamente coincidencias entre animales encontrados
          y reportados como perdidos mediante el análisis de sus fotos. Conexión futura con cámaras
          y lectores de microchips.
        </p>
      </motion.div>
    ),
  },
  {
    id: 14,
    title: 'Asistente IA + Notificaciones Inteligentes',
    content: (
      <motion.div
        variants={STAGGER_CONTAINER}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-8 mt-12"
      >
        <motion.div
          variants={STAGGER_ITEM}
          className="flex flex-col gap-6 p-10 bg-surface2 rounded-3xl shadow-lg border border-surface3 hover:border-accent/50 transition-colors"
        >
          <MessageSquare className="w-16 h-16 text-accent" />
          <h3 className="text-2xl font-bold">Asistente Virtual</h3>
          <p className="text-xl text-text-muted leading-relaxed">
            Chatbot para consultar temas de bienestar animal y tenencia responsable, derivando a un
            profesional humano cuando sea necesario.
          </p>
        </motion.div>
        <motion.div
          variants={STAGGER_ITEM}
          className="flex flex-col gap-6 p-10 bg-surface2 rounded-3xl shadow-lg border border-surface3 hover:border-accent/50 transition-colors"
        >
          <ShieldAlert className="w-16 h-16 text-accent" />
          <h3 className="text-2xl font-bold">Notificaciones Proactivas</h3>
          <p className="text-xl text-text-muted leading-relaxed">
            Alertas automáticas para mantener al día tratamientos, vacunaciones y un seguimiento
            inteligente de la mascota.
          </p>
        </motion.div>
      </motion.div>
    ),
  },
  {
    id: 15,
    title: 'Expansión Funcional',
    content: (
      <motion.div
        variants={STAGGER_CONTAINER}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-8 mt-10"
      >
        <motion.div
          variants={STAGGER_ITEM}
          className="flex items-center gap-6 p-8 bg-surface2 rounded-3xl shadow-md border-l-8 border-l-danger"
        >
          <Heart className="w-16 h-16 text-danger shrink-0" />
          <div>
            <h3 className="text-2xl font-bold mb-3">Gestión de Donaciones y Recursos</h3>
            <p className="text-xl text-text-muted">
              Las ONGs podrán pedir donaciones en la web de forma oficial y segura, automatizando la
              gestión predictiva de inventarios.
            </p>
          </div>
        </motion.div>
        <motion.div
          variants={STAGGER_ITEM}
          className="flex items-center gap-6 p-8 bg-surface2 rounded-3xl shadow-md border-l-8 border-l-warning"
        >
          <ShieldAlert className="w-16 h-16 text-warning shrink-0" />
          <div>
            <h3 className="text-2xl font-bold mb-3">Denuncias Directas</h3>
            <p className="text-xl text-text-muted">
              Canal seguro para realizar denuncias formales sobre maltratos u otras conductas
              indebidas a las autoridades correspondientes.
            </p>
          </div>
        </motion.div>
      </motion.div>
    ),
  },
  // FASE 4: Final
  {
    id: 16,
    title: 'Mariano Young',
    subtitle: 'Técnico en programación y futuro administrador de empresas',
    content: (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center mt-16 gap-6"
      >
        <div className="w-48 h-48 rounded-full bg-accent text-white flex items-center justify-center text-5xl md:text-6xl font-black shadow-2xl ring-8 ring-accent/30">
          MY
        </div>
        <p className="text-2xl text-center max-w-4xl text-text-muted mt-6 leading-relaxed">
          Buscando siempre tender un puente entre las necesidades reales de los negocios y las
          soluciones tecnológicas eficientes.
        </p>
      </motion.div>
    ),
  },
  {
    id: 17,
    title: 'Experiencia',
    subtitle: 'Desarrollo de sistemas de gestión y webs',
    content: (
      <div className="flex flex-col items-center mt-12 gap-8">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-8 rounded-3xl shadow-2xl w-80 h-40 relative flex items-center justify-center"
        >
          <Image
            src="/LogoappyStudio.jpeg"
            alt="Appy Studio"
            fill
            className="object-contain p-6 rounded-2xl"
          />
        </motion.div>
        <motion.ul
          variants={STAGGER_CONTAINER}
          initial="hidden"
          animate="show"
          className="text-2xl space-y-6 list-disc list-inside bg-surface2 p-10 rounded-3xl shadow-lg border border-surface3"
        >
          <motion.li variants={STAGGER_ITEM}>
            Catálogo web para <strong>Filomena</strong>
          </motion.li>
          <motion.li variants={STAGGER_ITEM}>
            Marketplace de servicios para <strong>Argoot</strong>
          </motion.li>
          <motion.li variants={STAGGER_ITEM}>
            Página web para tapicería <strong>Italia</strong>
          </motion.li>
          <motion.li variants={STAGGER_ITEM}>
            Sistema de gestión para Leñera <strong>&quot;Los chingolitos&quot;</strong>
          </motion.li>
        </motion.ul>
      </div>
    ),
  },
  {
    id: 18,
    title: 'Nodexa',
    subtitle: 'Tu aliado tecnológico',
    content: (
      <div className="flex flex-col items-center gap-8 mt-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="bg-white p-8 rounded-3xl shadow-2xl w-96 h-40 relative flex items-center justify-center"
        >
          <Image
            src="/LogoNodexa.png"
            alt="Nodexa"
            fill
            className="object-contain p-6 rounded-2xl"
          />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-2xl text-center max-w-5xl leading-relaxed bg-surface2 p-10 rounded-3xl shadow-lg border border-surface3"
        >
          Agencia de desarrollo de software enfocada en entender problemas y encontrar soluciones
          que generen un impacto positivo en los clientes.
          <br />
          <br />
          Ajustando el servicio a los intereses y posibilidades: brindando desde herramientas
          accesibles para iniciar de a poco (suscripciones), hasta sistemas robustos y a medida.
        </motion.p>
      </div>
    ),
  },
  {
    id: 19,
    content: (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center justify-center h-full gap-10 text-center w-full"
      >
        <Image
          src="/logopatitas.png"
          alt="Patitas en Alerta Logo"
          width={250}
          height={250}
          className="drop-shadow-2xl mb-4"
        />
        <h2 className="text-5xl md:text-7xl font-black text-accent drop-shadow-lg">
          ¡Muchas Gracias!
        </h2>
        <div className="flex gap-8 text-xl md:text-2xl mt-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-4 bg-surface2 px-10 py-6 rounded-full shadow-lg border border-surface3 cursor-pointer"
          >
            <span className="font-bold">Instagram:</span> @marianoyoung.dev
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-4 bg-surface2 px-10 py-6 rounded-full shadow-lg border border-surface3 cursor-pointer"
          >
            <span className="font-bold">TikTok:</span> @young_mariano
          </motion.div>
        </div>
      </motion.div>
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
  if (!slide) return null;

  return (
    <div className="fixed inset-0 bg-surface1 text-text-primary overflow-hidden flex flex-col z-[9999]">
      {/* Barra de progreso */}
      <div className="h-3 w-full bg-surface2 absolute top-0 left-0 z-50">
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
          initial={{ opacity: 0, x: 100, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -100, scale: 0.98 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 w-full h-full relative flex items-center justify-center p-12 lg:p-24"
        >
          {slide.bgImage && (
            <div className="absolute inset-0 z-0">
              <motion.div
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 10, ease: 'linear' }}
                className="w-full h-full relative"
              >
                <Image src={slide.bgImage} alt="" fill className="object-cover" priority />
              </motion.div>
              {slide.overlay && <div className="absolute inset-0 bg-black/65" />}
            </div>
          )}

          <div className="z-10 w-full max-w-[90rem] mx-auto h-full flex flex-col justify-center">
            {/* Header del slide */}
            {slide.title && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-10 md:mb-16 text-center md:text-left flex flex-col md:flex-row items-center md:items-start gap-6"
              >
                {slide.logo && (
                  <div className="relative w-40 h-40 md:w-48 md:h-48 shrink-0 bg-white/10 rounded-full p-4 backdrop-blur-md shadow-2xl border border-white/20">
                    <Image
                      src={slide.logo}
                      alt="Logo"
                      fill
                      className="object-contain p-4 drop-shadow-xl"
                      priority
                    />
                  </div>
                )}
                <div className="flex flex-col justify-center">
                  {slide.icon && (
                    <div className="mb-4 flex justify-center md:justify-start">{slide.icon}</div>
                  )}
                  <h1
                    className={`text-4xl md:text-5xl md:text-6xl font-black mb-6 ${slide.bgImage ? 'text-white drop-shadow-lg' : 'text-text-primary'}`}
                  >
                    {slide.title}
                  </h1>
                  {slide.subtitle && (
                    <p
                      className={`text-2xl md:text-3xl font-medium leading-snug ${slide.bgImage ? 'text-gray-200 drop-shadow-md' : 'text-accent'}`}
                    >
                      {slide.subtitle}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Cuerpo principal */}
            <div
              className={`flex-1 flex ${slide.imagePosition === 'left' ? 'flex-col md:flex-row-reverse' : 'flex-col md:flex-row'} items-center gap-10 w-full max-h-full`}
            >
              {slide.content && (
                <div className="flex-1 w-full flex flex-col justify-center">{slide.content}</div>
              )}

              {slide.image && (
                <motion.div
                  initial={{ x: slide.imagePosition === 'left' ? -50 : 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8, type: 'spring', bounce: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 relative w-full min-h-[35vh] md:min-h-[50vh] rounded-3xl overflow-hidden shadow-2xl border-8 border-surface2/50 backdrop-blur-sm bg-surface2/30"
                >
                  <Image
                    src={slide.image}
                    alt={slide.title || 'Slide image'}
                    fill
                    className="object-contain p-2"
                    priority={current < 12}
                  />
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controles flotantes */}
      <div className="absolute bottom-10 right-10 flex gap-6 z-50">
        <button
          onClick={prev}
          disabled={current === 0}
          className="p-5 rounded-full bg-surface2 text-text-primary hover:bg-surface3 disabled:opacity-30 transition-all shadow-xl hover:scale-110 active:scale-95"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>
        <button
          onClick={next}
          disabled={current === SLIDES.length - 1}
          className="p-5 rounded-full bg-accent text-white hover:brightness-110 disabled:opacity-30 transition-all shadow-xl hover:scale-110 active:scale-95"
        >
          <ChevronRight className="w-10 h-10" />
        </button>
      </div>

      {/* Indicador de número */}
      <div className="absolute bottom-12 left-12 text-text-primary font-black text-2xl z-50 bg-surface1/90 px-6 py-3 rounded-full shadow-xl backdrop-blur-md border border-surface3">
        {current + 1} / {SLIDES.length}
      </div>
    </div>
  );
}
