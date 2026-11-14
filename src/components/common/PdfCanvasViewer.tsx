import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, FileText, Layers } from 'lucide-react';

interface PdfCanvasViewerProps {
  pdfUrl: string;
  fileName?: string;
}

export default function PdfCanvasViewer({ pdfUrl, fileName }: PdfCanvasViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('scroll');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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

        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        });

        const pdf = await loadingTask.promise;
        if (isCancelled) return;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        setLoading(false);

        // Renderizar página actual
        renderPage(pdf, 1);
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('[PdfCanvasViewer] Error cargando PDF:', err);
          setError('No se pudo visualizar el archivo visualmente.');
          setLoading(false);
        }
      }
    }

    if (pdfUrl) {
      loadPdf();
    }

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  const renderPage = async (pdfDoc?: any, pageNum = currentPage) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const doc = pdfDoc || (await pdfjsLib.getDocument(pdfUrl).promise);
      const page = await doc.getPage(pageNum);
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
      console.warn('[PdfCanvasViewer] Error renderizando página:', e);
    }
  };

  useEffect(() => {
    if (!loading && !error && numPages > 0) {
      renderPage();
    }
  }, [currentPage, scale]);

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-white/10 flex flex-col items-center justify-center text-center gap-3">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <p className="text-xs text-white/60">Cargando visualización del documento...</p>
      </div>
    );
  }

  if (error) {
    return null; // Fallback al visor de texto si hay error visual
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
                className="p-1 text-white/70 hover:text-white disabled:opacity-30 rounded"
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
                className="p-1 text-white/70 hover:text-white disabled:opacity-30 rounded"
                title="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.8, s - 0.2))}
              className="p-1 text-white/70 hover:text-white rounded"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
              className="p-1 text-white/70 hover:text-white rounded"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contenedor del Canvas con Scroll Nativo */}
      <div
        ref={scrollContainerRef}
        className="overflow-auto max-h-[60vh] sm:max-h-[75vh] p-2 sm:p-4 bg-slate-900 flex justify-center items-start selection:bg-none"
      >
        <canvas
          ref={canvasRef}
          className="rounded-lg shadow-xl bg-white max-w-full"
        />
      </div>
    </div>
  );
}
