'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Image as ImageIcon, ZoomIn, ZoomOut, RotateCw, Check, RefreshCw } from 'lucide-react';
import { Boton } from '@presentacion/componentes/ui/Boton';

interface RecortadorFotoProps {
  onFotoProcesada: (archivoProcesado: File, previewUrl: string) => void;
  fotoUrlExistente?: string | null;
  onLimpiar?: () => void;
  deshabilitado?: boolean;
}

const TAMANO_FINAL_PX = 800; // Calidad óptima HD para mascotas, peso ~100-150KB
const TAMANO_VISOR_PX = 280; // Área visible del marco en pantalla móvil/desktop

/**
 * Componente intuitivo y accesible de subida y encuadre/recorte de fotos.
 *
 * Diseñado con botones táctiles grandes (≥44px) pensando en personas mayores
 * y usuarios no técnicos. Incluye pre-compresión en el cliente mediante
 * Canvas HTML5 para ahorrar ancho de banda y respetar las cuotas de Cloudinary.
 */
export function RecortadorFoto({
  onFotoProcesada,
  fotoUrlExistente,
  onLimpiar,
  deshabilitado = false,
}: RecortadorFotoProps) {
  const [imagenOriginalSrc, setImagenOriginalSrc] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>('foto-mascota.jpg');
  const [enModoRecorte, setEnModoRecorte] = useState<boolean>(false);
  const [previewFinal, setPreviewFinal] = useState<string | null>(fotoUrlExistente ?? null);

  // Estados del visor de recorte
  const [zoom, setZoom] = useState<number>(1);
  const [rotacion, setRotacion] = useState<number>(0);
  const [posicion, setPosicion] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState<boolean>(false);
  const [inicioArrastre, setInicioArrastre] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const imagenElementoRef = useRef<HTMLImageElement>(null);
  const archivoOriginalRef = useRef<File | null>(null);

  useEffect(() => {
    if (fotoUrlExistente) {
      setPreviewFinal(fotoUrlExistente);
    }
  }, [fotoUrlExistente]);

  // Al seleccionar un archivo
  const manejarArchivoSeleccionado = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    archivoOriginalRef.current = archivo;
    setNombreArchivo(archivo.name || 'foto-mascota.jpg');
    const objectUrl = URL.createObjectURL(archivo);
    setImagenOriginalSrc(objectUrl);
    setZoom(1);
    setRotacion(0);
    setPosicion({ x: 0, y: 0 });
    setEnModoRecorte(true);

    // Limpia el input para permitir elegir el mismo archivo si se desea
    evento.target.value = '';
  };

  // Controles de arrastre (Pan) con Mouse
  const iniciarArrastreMouse = (e: React.MouseEvent) => {
    e.preventDefault();
    setArrastrando(true);
    setInicioArrastre({ x: e.clientX - posicion.x, y: e.clientY - posicion.y });
  };

  const moverArrastreMouse = (e: React.MouseEvent) => {
    if (!arrastrando) return;
    setPosicion({
      x: e.clientX - inicioArrastre.x,
      y: e.clientY - inicioArrastre.y,
    });
  };

  const finalizarArrastreMouse = () => setArrastrando(false);

  // Controles de arrastre táctil para celulares
  const iniciarArrastreTactil = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    setArrastrando(true);
    setInicioArrastre({ x: touch.clientX - posicion.x, y: touch.clientY - posicion.y });
  };

  const moverArrastreTactil = (e: React.TouchEvent) => {
    if (!arrastrando || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (!touch) return;
    setPosicion({
      x: touch.clientX - inicioArrastre.x,
      y: touch.clientY - inicioArrastre.y,
    });
  };

  const finalizarArrastreTactil = () => setArrastrando(false);

  // Girar 90 grados
  const girar90Grados = () => {
    setRotacion((prev) => (prev + 90) % 360);
  };

  // Usar la foto completa sin recortar
  const usarFotoCompleta = useCallback(() => {
    const archivoFinal =
      archivoOriginalRef.current ?? new File(['dummy'], nombreArchivo, { type: 'image/jpeg' });
    const urlFinal = imagenOriginalSrc || URL.createObjectURL(archivoFinal);
    setPreviewFinal(urlFinal);
    setEnModoRecorte(false);
    onFotoProcesada(archivoFinal, urlFinal);
  }, [nombreArchivo, imagenOriginalSrc, onFotoProcesada]);

  // Generar la imagen procesada usando Canvas y exportar a File
  const confirmarRecorte = useCallback(() => {
    const img = imagenElementoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = TAMANO_FINAL_PX;
    canvas.height = TAMANO_FINAL_PX;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;

    if (!ctx || typeof canvas.toBlob !== 'function' || !img) {
      usarFotoCompleta();
      return;
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, TAMANO_FINAL_PX, TAMANO_FINAL_PX);

    ctx.save();
    // Mover el origen al centro del canvas
    ctx.translate(TAMANO_FINAL_PX / 2, TAMANO_FINAL_PX / 2);
    ctx.rotate((rotacion * Math.PI) / 180);

    // Factor de escala entre el visor visual y el canvas final de 800px
    const escalaRatio = TAMANO_FINAL_PX / TAMANO_VISOR_PX;
    const escalaFinal = zoom * escalaRatio;

    // Calcular dimensiones proporcionales
    const anchoDibujo = img.naturalWidth * escalaFinal;
    const altoDibujo = img.naturalHeight * escalaFinal;

    const desplazamientoX = posicion.x * escalaRatio;
    const desplazamientoY = posicion.y * escalaRatio;

    ctx.drawImage(
      img,
      desplazamientoX - anchoDibujo / 2,
      desplazamientoY - altoDibujo / 2,
      anchoDibujo,
      altoDibujo,
    );
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          usarFotoCompleta();
          return;
        }
        const nombreFinal = nombreArchivo.replace(/\.[^/.]+$/, '') + '.jpg';
        const archivoFinal = new File([blob], nombreFinal, { type: 'image/jpeg' });
        const urlFinal = URL.createObjectURL(blob);

        setPreviewFinal(urlFinal);
        setEnModoRecorte(false);
        onFotoProcesada(archivoFinal, urlFinal);
      },
      'image/jpeg',
      0.85, // Calidad alta y balanceada (ahorro ~85% de peso)
    );
  }, [rotacion, zoom, posicion, nombreArchivo, onFotoProcesada, usarFotoCompleta]);

  // Si se cancela el recorte o se quiere volver a elegir
  const cancelarRecorte = () => {
    setEnModoRecorte(false);
    if (!previewFinal && onLimpiar) {
      onLimpiar();
    }
  };

  const reelegirFoto = () => {
    setPreviewFinal(null);
    setImagenOriginalSrc(null);
    archivoOriginalRef.current = null;
    if (onLimpiar) onLimpiar();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Inputs ocultos accesibles vía botones grandes */}
      <input
        ref={inputCamaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label="Tomar foto con la cámara"
        onChange={manejarArchivoSeleccionado}
        disabled={deshabilitado}
      />
      <input
        ref={inputGaleriaRef}
        id="foto"
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Foto de la mascota"
        onChange={manejarArchivoSeleccionado}
        disabled={deshabilitado}
      />

      {/* 1. Estado inicial: Botones de selección grandes */}
      {!imagenOriginalSrc && !previewFinal && !enModoRecorte && (
        <div className="rounded-xl border-2 border-dashed border-surface2 bg-surface1 p-6 text-center">
          <p className="mb-4 text-base font-medium text-text-primary">
            Subí una foto clara donde se vea la carita o el cuerpo del animal
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              disabled={deshabilitado}
              onClick={() => inputCamaraRef.current?.click()}
              className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-lg bg-accent px-5 py-3 text-base font-semibold text-text-primary shadow-sm transition hover:brightness-95 active:scale-95 disabled:opacity-50"
            >
              <Camera aria-hidden="true" className="h-6 w-6" />
              Tomar foto ahora
            </button>

            <button
              type="button"
              disabled={deshabilitado}
              onClick={() => inputGaleriaRef.current?.click()}
              className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-lg border-2 border-surface2 bg-surface1 px-5 py-3 text-base font-semibold text-text-primary transition hover:border-accent hover:bg-surface2/50 active:scale-95 disabled:opacity-50"
            >
              <ImageIcon aria-hidden="true" className="h-6 w-6 text-primary" />
              Elegir de la galería
            </button>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Formatos: JPG, PNG o WebP. Se ajustará automáticamente.
          </p>
        </div>
      )}

      {/* 2. Estado de Recorte y Encuadre Interactivo */}
      {enModoRecorte && imagenOriginalSrc && (
        <div className="rounded-xl border border-surface2 bg-surface1 p-4 shadow-sm sm:p-6">
          <div className="mb-3 text-center">
            <h3 className="text-base font-bold text-text-primary">
              Acomodá la foto de tu mascota
            </h3>
            <p className="text-xs text-text-muted">
              Arrastrá la imagen con el dedo o el mouse para centrar al animal.
            </p>
          </div>

          {/* Visor con marco cuadrado */}
          <div className="flex justify-center">
            <div
              className="relative cursor-move select-none overflow-hidden rounded-xl border-4 border-accent bg-neutral-900 shadow-inner"
              style={{ width: TAMANO_VISOR_PX, height: TAMANO_VISOR_PX }}
              onMouseDown={iniciarArrastreMouse}
              onMouseMove={moverArrastreMouse}
              onMouseUp={finalizarArrastreMouse}
              onMouseLeave={finalizarArrastreMouse}
              onTouchStart={iniciarArrastreTactil}
              onTouchMove={moverArrastreTactil}
              onTouchEnd={finalizarArrastreTactil}
              role="region"
              aria-label="Área de encuadre de la foto"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imagenElementoRef}
                src={imagenOriginalSrc}
                alt="Imagen para encuadrar"
                draggable={false}
                className="pointer-events-none absolute max-w-none origin-center transition-transform duration-75"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(-50%, -50%) translate(${posicion.x}px, ${posicion.y}px) rotate(${rotacion}deg) scale(${zoom})`,
                }}
              />
              {/* Líneas guía sutiles */}
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25">
                <div className="border-b border-r border-white"></div>
                <div className="border-b border-r border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-b border-r border-white"></div>
                <div className="border-b border-r border-white"></div>
                <div className="border-b border-white"></div>
                <div className="border-r border-white"></div>
                <div className="border-r border-white"></div>
                <div></div>
              </div>
            </div>
          </div>

          {/* Controles de Zoom y Rotación accesibles */}
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                aria-label="Alejar foto"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-surface2 bg-surface1 text-text-primary hover:bg-surface2"
              >
                <ZoomOut className="h-5 w-5" />
              </button>

              <input
                type="range"
                min="0.6"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="h-2 w-40 cursor-pointer accent-accent"
                aria-label="Nivel de aumento"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                aria-label="Acercar foto"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-surface2 bg-surface1 text-text-primary hover:bg-surface2"
              >
                <ZoomIn className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={girar90Grados}
                aria-label="Girar 90 grados"
                title="Girar 90 grados"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-surface2 bg-surface1 text-text-primary hover:bg-surface2"
              >
                <RotateCw className="h-5 w-5" />
              </button>
            </div>

            {/* Botones de acción */}
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Boton
                type="button"
                variante="primaria"
                onClick={confirmarRecorte}
                className="h-12 text-base font-semibold"
              >
                <Check className="h-5 w-5" />
                Listo, usar esta foto
              </Boton>
              <Boton
                type="button"
                variante="secundaria"
                onClick={usarFotoCompleta}
                className="h-12 text-sm"
              >
                Usar foto completa
              </Boton>
              <Boton
                type="button"
                variante="texto"
                onClick={cancelarRecorte}
                className="h-12 text-sm"
              >
                Elegir otra
              </Boton>
            </div>
          </div>
        </div>
      )}

      {/* 3. Estado confirmado: Foto lista */}
      {previewFinal && !enModoRecorte && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-surface2 bg-surface1 p-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border-2 border-success shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewFinal}
              alt="Foto seleccionada del animal"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-1 flex-col items-center gap-1 text-center sm:items-start sm:text-left">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
              <Check className="h-4 w-4" /> Foto lista y optimizada
            </span>
            <p className="text-xs text-text-muted">
              Se recortó y optimizó para que suba rápido y se vea nítida en el mapa.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={reelegirFoto}
                disabled={deshabilitado}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-surface2 bg-surface1 px-3 text-xs font-medium text-text-primary hover:border-accent hover:bg-surface2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Cambiar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
