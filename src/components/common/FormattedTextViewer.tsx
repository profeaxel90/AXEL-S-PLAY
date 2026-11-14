import React, { useState } from 'react';
import { AlignLeft, AlignCenter, AlignJustify, ZoomIn, ZoomOut } from 'lucide-react';

interface FormattedTextViewerProps {
  text: string;
  initialAlign?: 'left' | 'center' | 'justify';
  showControls?: boolean;
  className?: string;
  maxHeightClass?: string;
}

/**
 * Parsea segmentos de texto convirtiendo **negrita** o <b>negrita</b> en elementos <strong>
 */
function parseInlineFormatting(line: string): React.ReactNode[] {
  // Regex para capturar **texto**, <b>texto</b> o <strong>texto</strong>
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|<b>[^<]+<\/b>|<strong>[^<]+<\/strong>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index));
    }
    const matchedText = match[0];
    let cleanText = matchedText;
    if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
      cleanText = matchedText.slice(2, -2);
    } else if (matchedText.startsWith('<b>') && matchedText.endsWith('</b>')) {
      cleanText = matchedText.slice(3, -4);
    } else if (matchedText.startsWith('<strong>') && matchedText.endsWith('</strong>')) {
      cleanText = matchedText.slice(8, -9);
    }
    parts.push(
      <strong key={match.index} className="font-black text-white selection:bg-purple-500/40">
        {cleanText}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [line];
}

export default function FormattedTextViewer({
  text,
  initialAlign = 'justify',
  showControls = true,
  className = '',
  maxHeightClass = 'max-h-72 sm:max-h-96',
}: FormattedTextViewerProps) {
  const [alignment, setAlignment] = useState<'left' | 'center' | 'justify'>(initialAlign);
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base' | 'lg'>('sm');

  if (!text || text.trim().length === 0) {
    return <p className="text-white/40 text-xs italic">No hay contenido de texto disponible.</p>;
  }

  const paragraphs = text.split('\n');

  const FONT_CLASSES = {
    xs: 'text-xs leading-relaxed',
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-loose',
  };

  const ALIGN_CLASSES = {
    left: 'text-left',
    center: 'text-center',
    justify: 'text-justify [text-align-last:left]',
  };

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/* Barra de herramientas para el lector (alineación y zoom de lectura) */}
      {showControls && (
        <div className="flex items-center justify-between bg-slate-950/80 border border-white/10 rounded-xl p-1.5 text-xs text-white/70 select-none">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40 font-bold px-1 uppercase tracking-wider hidden sm:inline">
              Alineación:
            </span>
            <button
              type="button"
              onClick={() => setAlignment('justify')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                alignment === 'justify'
                  ? 'bg-emerald-600 text-white font-bold shadow-md'
                  : 'hover:bg-white/5 text-white/60'
              }`}
              title="Justificar texto"
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden xs:inline">Justificar</span>
            </button>
            <button
              type="button"
              onClick={() => setAlignment('center')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                alignment === 'center'
                  ? 'bg-emerald-600 text-white font-bold shadow-md'
                  : 'hover:bg-white/5 text-white/60'
              }`}
              title="Centrar texto"
            >
              <AlignCenter className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden xs:inline">Centrar</span>
            </button>
            <button
              type="button"
              onClick={() => setAlignment('left')}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition-all ${
                alignment === 'left'
                  ? 'bg-emerald-600 text-white font-bold shadow-md'
                  : 'hover:bg-white/5 text-white/60'
              }`}
              title="Alinear a la izquierda"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden xs:inline">Izquierda</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/40 font-bold px-1 uppercase tracking-wider hidden sm:inline">
              Letra:
            </span>
            <button
              type="button"
              disabled={fontSize === 'xs'}
              onClick={() => {
                const sizes: ('xs' | 'sm' | 'base' | 'lg')[] = ['xs', 'sm', 'base', 'lg'];
                const curIdx = sizes.indexOf(fontSize);
                if (curIdx > 0) setFontSize(sizes[curIdx - 1]);
              }}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 disabled:opacity-30"
              title="Reducir tamaño de letra"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 font-bold text-emerald-300 uppercase">
              {fontSize}
            </span>
            <button
              type="button"
              disabled={fontSize === 'lg'}
              onClick={() => {
                const sizes: ('xs' | 'sm' | 'base' | 'lg')[] = ['xs', 'sm', 'base', 'lg'];
                const curIdx = sizes.indexOf(fontSize);
                if (curIdx < sizes.length - 1) setFontSize(sizes[curIdx + 1]);
              }}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 disabled:opacity-30"
              title="Aumentar tamaño de letra"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Contenedor del texto formateado con scroll suave */}
      <div
        className={`${maxHeightClass} overflow-y-auto pr-2 text-slate-100 font-normal ${FONT_CLASSES[fontSize]} ${ALIGN_CLASSES[alignment]} space-y-2.5 selection:bg-emerald-500/30`}
      >
        {paragraphs.map((para, idx) => {
          const trimmed = para.trim();
          if (!trimmed) {
            return <div key={idx} className="h-2" />;
          }

          // Soporte especial para bloques centrados explícitamente: [center]...[/center] o <center>...</center>
          let isExplicitCenter = false;
          let content = para;
          if (
            (content.startsWith('[center]') && content.endsWith('[/center]')) ||
            (content.startsWith('<center>') && content.endsWith('</center>'))
          ) {
            isExplicitCenter = true;
            content = content.replace(/^\[center\]|<center>/i, '').replace(/\[\/center\]|<\/center>$/i, '');
          }

          return (
            <p
              key={idx}
              className={`${isExplicitCenter ? 'text-center font-bold text-emerald-200' : ''}`}
            >
              {parseInlineFormatting(content)}
            </p>
          );
        })}
      </div>
    </div>
  );
}
