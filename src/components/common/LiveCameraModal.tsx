import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { compressImageToWebP } from '../../lib/imageCompressor';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export default function LiveCameraModal({ isOpen, onClose, onCapture }: LiveCameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileFallbackRef = useRef<HTMLInputElement | null>(null);
  const bottomGalleryInputRef = useRef<HTMLInputElement | null>(null);

  // Iniciar la cámara en vivo
  const startCamera = async (mode: 'environment' | 'user') => {
    setIsLoading(true);
    setErrorMsg(null);
    setCapturedPreview(null);

    // Detener tracks anteriores si existen
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta cámara web directa.');
      }

      // Intentar primero con la cámara deseada (trasera 'environment' o frontal 'user')
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (err) {
        // Fallback genérico sin constraints si falla ideal mode
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('[LiveCamera] Error accediendo a la cámara:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg('Permiso de cámara denegado. Toca el candado en la barra del navegador para permitir el acceso o sube tu foto desde archivos.');
      } else {
        setErrorMsg('No se pudo iniciar la cámara en vivo. Puedes subir tu foto directamente desde la galería o archivos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setCapturedPreview(null);
      setErrorMsg(null);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  // Cambiar entre cámara trasera y delantera
  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Capturar fotograma en vivo desde el video
  const handleCaptureSnapshot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dibujar fotograma del video
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convertir a JPEG optimizado
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedPreview(rawDataUrl);

      // Detener video en vivo para congelar y ahorrar batería
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch (e) {
      console.warn('[LiveCamera] Error capturando snapshot:', e);
    }
  };

  // Confirmar la foto capturada
  const handleConfirmPhoto = () => {
    if (!capturedPreview) return;
    onCapture(capturedPreview);
    handleClose();
  };

  // Cancelar y cerrar
  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCapturedPreview(null);
    setErrorMsg(null);
    onClose();
  };

  // Fallback de archivo si la cámara no abre
  const handleFallbackFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const compressed = await compressImageToWebP(file);
      if (compressed) {
        onCapture(compressed);
        handleClose();
      }
    } catch (err) {
      console.warn('[LiveCamera] Error en fallback de archivo:', err);
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-4 select-none">
      {/* Header superior */}
      <div className="w-full max-w-lg flex items-center justify-between p-2 z-10">
        <div className="flex items-center gap-2 text-white">
          <Camera className="w-5 h-5 text-purple-400" />
          <span className="font-black text-sm sm:text-base">
            {capturedPreview ? 'Revisar Foto' : 'Cámara en Pantalla'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          title="Cerrar cámara"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contenedor Central del Visor */}
      <div className="relative w-full max-w-lg flex-1 max-h-[70vh] flex items-center justify-center rounded-3xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl my-auto">
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center gap-3 text-white">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-xs font-bold text-white/80">Iniciando cámara en vivo...</p>
          </div>
        )}

        {/* Mensaje de Error / Fallback */}
        {errorMsg && !capturedPreview && (
          <div className="p-6 text-center max-w-sm space-y-4 text-white z-20">
            <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
            <h4 className="font-black text-base">Acceso a cámara no disponible</h4>
            <p className="text-xs text-white/60 leading-relaxed">{errorMsg}</p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (fileFallbackRef.current) {
                    fileFallbackRef.current.value = '';
                    fileFallbackRef.current.click();
                  }
                }}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs shadow-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all w-full"
              >
                <ImageIcon className="w-4 h-4" />
                <span>📁 Elegir Foto de mis Archivos / Galería</span>
              </button>
              <input
                ref={fileFallbackRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-hidden="true"
                onChange={handleFallbackFile}
              />
            </div>
          </div>
        )}

        {/* Video en vivo */}
        {!capturedPreview && (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover rounded-3xl ${errorMsg ? 'hidden' : 'block'}`}
          />
        )}

        {/* Foto Congelada / Vista Previa de Captura */}
        {capturedPreview && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={capturedPreview}
              alt="Foto capturada"
              className="w-full h-full object-contain rounded-3xl"
            />
          </div>
        )}

        {/* Botón flotante para voltear cámara (trasera / frontal) si no hay foto congelada */}
        {!capturedPreview && !errorMsg && !isLoading && (
          <button
            type="button"
            onClick={handleToggleFacingMode}
            className="absolute top-4 right-4 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all active:scale-90 z-20"
            title="Voltear cámara (trasera / delantera)"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Barra de Controles Inferior */}
      <div className="w-full max-w-lg p-3 z-10 flex flex-col items-center gap-3">
        {/* Caso A: Estamos en vivo apuntando con la cámara */}
        {!capturedPreview && !errorMsg && (
          <div className="flex items-center justify-center gap-8 w-full">
            {/* Botón de Galería alternativo */}
            <button
              type="button"
              onClick={() => {
                if (bottomGalleryInputRef.current) {
                  bottomGalleryInputRef.current.value = '';
                  bottomGalleryInputRef.current.click();
                }
              }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer active:scale-90 flex items-center justify-center"
              title="Subir foto existente desde la galería"
            >
              <ImageIcon className="w-5 h-5 text-emerald-400" />
            </button>
            <input
              ref={bottomGalleryInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-hidden="true"
              onChange={handleFallbackFile}
            />

            {/* BOTÓN DISPARADOR PRINCIPAL (Círculo fotográfico grande) */}
            <button
              type="button"
              disabled={isLoading || Boolean(errorMsg)}
              onClick={handleCaptureSnapshot}
              className="w-18 h-18 rounded-full border-4 border-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-90 shadow-2xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
              title="Disparar foto"
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-inner" />
            </button>

            {/* Espacio equilibrador */}
            <div className="w-11" />
          </div>
        )}

        {/* Caso B: Ya tomamos la foto y el alumno decide si usarla o repetir */}
        {capturedPreview && (
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setCapturedPreview(null);
                startCamera(facingMode);
              }}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tomar otra foto</span>
            </button>

            <button
              type="button"
              onClick={handleConfirmPhoto}
              className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/30 hover:opacity-95 transition-all cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>✓ Usar esta Foto</span>
            </button>
          </div>
        )}

        <p className="text-[11px] text-white/40 text-center">
          {capturedPreview
            ? 'Revisa que tu foto sea legible y presiona "Usar esta Foto"'
            : 'Enfoca tu cuaderno o procedimiento y presiona el círculo para disparar'}
        </p>
      </div>
    </div>
  );
}
