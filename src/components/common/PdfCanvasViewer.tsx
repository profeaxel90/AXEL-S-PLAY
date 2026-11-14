import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText, AlertCircle } from 'lucide-react';

interface PdfCanvasViewerProps {
  pdfUrl: string;
  fileName?: string;
  fallbackText?: string;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  try {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.warn('[PdfCanvasViewer] Error convirtiendo base64:', e);
    return new Uint8Array();
  }
}

export default function PdfCanvasViewer({ pdfUrl, fileName, fallbackText }: PdfCanvasViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      try {
        const pdfjsLib = await import('pdfjs-dist');
        if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
        }

        const isDataUri = pdfUrl.startsWith('data:') || !pdfUrl.startsWith('http');
        const documentSource = isDataUri
          ? { data: dataUrlToUint8Array(pdfUrl) }
          : { url: pdfUrl };

        const loadingTask = pdfjsLib.getDocument({
          ...documentSource,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        });

        const pdf = await loadingTask.promise;
        if (isCancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('[PdfCanvasViewer] Error cargando PDF con pdf.js:', err);
          setError('No se pudo procesar la vista gráfica del PDF.');
          setLoading(false);
        }
      }
    }

    if (pdfUrl) {
      loadPdf();
    }

    return () => {
      isCancelled = true;
      pdfDocRef.current = null;
    };
  }, [pdfUrl]);

  const renderPage = async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    if (!pdf || !canvasRef.current) return;

    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = viewport.width * pixelRatio;
      canvas.height = viewport.height * pixelRatio;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      await page.render(renderContext).promise;
    } catch (e) {
      console.warn('[PdfCanvasViewer] Error renderizando página canvas:', e);
    }
  };

  useEffect(() => {
    if (!loading && !error && pdfDocRef.current && numPages > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, scale, loading, error, numPages]);

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center text-center gap-3">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <p className="text-xs text-white/60">Cargando visualización del documento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Vista de lectura directa activa</span>
        </div>
        {fallbackText ? (
          <div className="max-h-72 overflow-y-auto text-xs text-slate-100 leading-relaxed whitespace-pre-line p-3 bg-slate-950 rounded-xl border border-white/5 font-normal">
            {fallbackText}
          </div>
        ) : (
          <p className="text-xs text-white/50">
            Documento: {fileName || 'Guía de la asignación'}. Puedes leer las instrucciones y resolver las preguntas abajo.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-slate-950 overflow-hidden shadow-2xl flex flex-col">
      {/* Barra de control del documento */}
      <div className="p-2.5 sm:p-3 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-xs text-white gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span className="font-bold truncate max-w-[150px] sm:max-w-xs">{fileName || 'Documento / Taller'}</span>
        </div>

        <div className="flex items-center gap-2">
          {numPages > 1 && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 text-white/70 hover:text-white disabled:opacity-30 rounded cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold px-1.5 text-white/90">
                {currentPage} / {numPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= numPages}
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                className="p-1 text-white/70 hover:text-white disabled:opacity-30 rounded cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.7, s - 0.2))}
              className="p-1 text-white/70 hover:text-white rounded cursor-pointer"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
              className="p-1 text-white/70 hover:text-white rounded cursor-pointer"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor del Canvas con Scroll Nativo */}
      <div className="overflow-auto max-h-[60vh] sm:max-h-[75vh] p-2 sm:p-4 bg-slate-900 flex justify-center items-start">
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-2xl bg-white max-w-full"
        />
      </div>
    </div>
  );
}
