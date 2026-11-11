import { useState, useEffect } from 'react';
import {
  X, ChevronLeft, ChevronRight, RotateCcw, CheckCircle2,
  XCircle, Smartphone, Monitor, Award, Sparkles, HelpCircle
} from 'lucide-react';
import MascotAvatar from '../game/MascotAvatar';
import type { QuestionType } from '../../types';

export interface PreviewQuestion {
  id: string;
  type: QuestionType;
  content: string;
  timeLimit: number;
  points: number;
  pointsMultiplier?: 1 | 2 | 3;
  explanation?: string;
  imageUrl?: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

interface GamePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  questions: PreviewQuestion[];
  initialQuestionIndex?: number;
}

const OPTION_THEMES = [
  {
    bg: 'from-red-600 to-rose-700',
    border: 'border-red-400',
    hover: 'hover:border-red-300 hover:shadow-red-500/25',
    letterBg: 'bg-red-800/80',
    letter: 'A',
    shape: '▲',
  },
  {
    bg: 'from-blue-600 to-indigo-700',
    border: 'border-blue-400',
    hover: 'hover:border-blue-300 hover:shadow-blue-500/25',
    letterBg: 'bg-blue-800/80',
    letter: 'B',
    shape: '◆',
  },
  {
    bg: 'from-amber-500 to-yellow-600',
    border: 'border-amber-400',
    hover: 'hover:border-amber-300 hover:shadow-yellow-500/25',
    letterBg: 'bg-amber-800/80',
    letter: 'C',
    shape: '●',
  },
  {
    bg: 'from-emerald-600 to-teal-700',
    border: 'border-emerald-400',
    hover: 'hover:border-emerald-300 hover:shadow-emerald-500/25',
    letterBg: 'bg-emerald-800/80',
    letter: 'D',
    shape: '■',
  },
];

export default function GamePreviewModal({
  isOpen,
  onClose,
  gameTitle,
  questions,
  initialQuestionIndex = 0,
}: GamePreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialQuestionIndex);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [timeLeft, setTimeLeft] = useState(20);

  const totalQuestions = questions.length;
  const currentQ = questions[currentIndex] || questions[0];

  useEffect(() => {
    setCurrentIndex(Math.min(initialQuestionIndex, Math.max(0, totalQuestions - 1)));
  }, [initialQuestionIndex, totalQuestions]);

  // Reset al cambiar de pregunta
  useEffect(() => {
    setSelectedOptionId(null);
    setShowFeedback(false);
    if (currentQ) {
      setTimeLeft(currentQ.timeLimit || 20);
    }
  }, [currentIndex, currentQ]);

  // Cronómetro simulado
  useEffect(() => {
    if (!isOpen || showFeedback || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShowFeedback(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, showFeedback, timeLeft]);

  if (!isOpen || !currentQ) return null;

  const isAnswered = selectedOptionId !== null;
  const selectedOption = currentQ.options.find((o) => o.id === selectedOptionId);
  const isCorrect = selectedOption?.isCorrect ?? false;
  const correctOption = currentQ.options.find((o) => o.isCorrect);

  const handleSelect = (optId: string) => {
    if (showFeedback) return;
    setSelectedOptionId(optId);
    setShowFeedback(true);
  };

  const handleRestartQuestion = () => {
    setSelectedOptionId(null);
    setShowFeedback(false);
    setTimeLeft(currentQ.timeLimit || 20);
  };

  const mascotEmotion = !showFeedback
    ? 'thinking'
    : isCorrect
    ? 'celebrate'
    : 'sad';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-950 border border-purple-500/30 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Barra superior de control docente */}
        <div className="p-4 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 font-bold text-xs">
              👁️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base truncate max-w-[200px] sm:max-w-md">
                  Vista Previa Estudiante: {gameTitle || 'Juego sin título'}
                </h3>
                <span className="bg-purple-500/20 text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-400/30">
                  SIMULACIÓN
                </span>
              </div>
              <p className="text-xs text-white/50">
                Pregunta {currentIndex + 1} de {totalQuestions}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Conmutador móvil / pantalla completa */}
            <div className="bg-white/5 p-1 rounded-xl border border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('mobile')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'mobile'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Vista móvil de estudiante"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Móvil</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('desktop')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  viewMode === 'desktop'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Vista proyector / tablet"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pantalla</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Área central interactiva */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-center justify-center bg-gradient-to-br from-indigo-950/40 via-purple-950/30 to-slate-950">
          <div
            className={`w-full transition-all duration-300 ${
              viewMode === 'mobile'
                ? 'max-w-md bg-slate-900 border-4 border-slate-800 rounded-[2.5rem] shadow-2xl p-4 sm:p-5 relative'
                : 'max-w-3xl bg-slate-900/80 border border-white/10 rounded-2xl p-6 shadow-2xl'
            }`}
          >
            {/* Header del juego del estudiante */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <MascotAvatar seed="Fox" emotion={mascotEmotion} size="xs" />
                <span className="text-xs font-bold text-white/80">Estudiante (Tú)</span>
              </div>

              {/* Temporizador */}
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border transition-all ${
                  timeLeft <= 5
                    ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse'
                    : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                }`}
              >
                <span>⏱️</span>
                <span>{timeLeft}s</span>
              </div>

              {/* Puntos de la pregunta */}
              <div className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                <Award className="w-3.5 h-3.5" />
                <span>{currentQ.points || 1000} pts</span>
                {currentQ.pointsMultiplier && currentQ.pointsMultiplier > 1 && (
                  <span className="text-[10px] bg-amber-400 text-slate-950 px-1 font-black rounded">
                    {currentQ.pointsMultiplier}×
                  </span>
                )}
              </div>
            </div>

            {/* Imagen opcional */}
            {currentQ.imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-white/10 max-h-44 bg-slate-950 flex items-center justify-center">
                <img
                  src={currentQ.imageUrl}
                  alt="Pregunta"
                  className="max-h-40 object-contain rounded"
                />
              </div>
            )}

            {/* Enunciado */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 mb-4 text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 block mb-1">
                Pregunta {currentIndex + 1} de {totalQuestions}
              </span>
              <h4 className="text-base sm:text-lg font-black text-white leading-snug">
                {currentQ.content || 'Sin enunciado'}
              </h4>
            </div>

            {/* Opciones interactivas con estilo tipo Kahoot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 mb-4">
              {currentQ.options.map((opt, optIdx) => {
                const theme = OPTION_THEMES[optIdx % OPTION_THEMES.length];
                const isThisSelected = selectedOptionId === opt.id;
                const isThisCorrect = opt.isCorrect;

                let stateClass = `bg-gradient-to-r ${theme.bg} border ${theme.border} ${theme.hover} text-white shadow-lg cursor-pointer`;

                if (showFeedback) {
                  if (isThisCorrect) {
                    stateClass =
                      'bg-gradient-to-r from-emerald-600 to-green-600 border-emerald-300 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400';
                  } else if (isThisSelected && !isThisCorrect) {
                    stateClass =
                      'bg-gradient-to-r from-red-600 to-rose-700 border-red-300 text-white opacity-90 ring-2 ring-red-400';
                  } else {
                    stateClass = 'bg-slate-800/60 border-white/10 text-white/40 opacity-40';
                  }
                }

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt.id)}
                    disabled={showFeedback}
                    className={`relative p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-left transition-all duration-200 active:scale-95 disabled:active:scale-100 ${stateClass}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${theme.letterBg}`}
                    >
                      <span>{theme.shape}</span>
                    </div>

                    <span className="font-bold text-xs sm:text-sm flex-1 leading-tight">
                      {opt.text || `Opción ${optIdx + 1}`}
                    </span>

                    {showFeedback && isThisCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 animate-bounce" />
                    )}
                    {showFeedback && isThisSelected && !isThisCorrect && (
                      <XCircle className="w-5 h-5 text-white flex-shrink-0 animate-shake" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Retroalimentación al responder */}
            {showFeedback && (
              <div
                className={`p-4 rounded-2xl border text-center animate-fade-in mb-3 ${
                  isCorrect
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/20 border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 font-black text-base mb-1">
                  {isCorrect ? (
                    <>
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      <span>¡Respuesta Correcta! +{currentQ.points || 1000} pts</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span>¡Incorrecto! La correcta era: {correctOption?.text}</span>
                    </>
                  )}
                </div>

                {currentQ.explanation && (
                  <p className="text-xs text-white/80 mt-1 max-w-md mx-auto flex items-center justify-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                    <span>{currentQ.explanation}</span>
                  </p>
                )}
              </div>
            )}

            {/* Botón de reiniciar pregunta actual */}
            <div className="flex items-center justify-between text-xs text-white/60 pt-2 border-t border-white/10">
              <span className="text-[11px]">
                {showFeedback
                  ? 'Haz clic en siguiente o prueba otra vez'
                  : 'Haz clic en cualquier opción para responder'}
              </span>
              <button
                type="button"
                onClick={handleRestartQuestion}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reintentar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer de navegación entre preguntas */}
        <div className="p-4 bg-slate-900/90 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="btn-secondary py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          {/* Carrusel de bolitas de preguntas */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[200px] sm:max-w-md py-1">
            {questions.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                  currentIndex === idx
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400 scale-110'
                    : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            disabled={currentIndex === totalQuestions - 1}
            className="btn-primary py-2 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
