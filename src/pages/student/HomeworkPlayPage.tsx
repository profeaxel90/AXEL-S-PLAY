import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2, XCircle, RotateCcw, Send, Home, AlertCircle,
  FileText, Camera, Eye, Trash2, X, Plus
} from 'lucide-react';
import { useHomeworkStore } from '../../stores/homeworkStore';
import { useGameStore } from '../../stores/gameStore';
import { SAMPLE_GAMES } from '../../data/mockGames';
import type { HomeworkAnswerSubmission } from '../../types/homework';
import MascotAvatar from '../../components/game/MascotAvatar';

function getEmbedVideoUrl(url?: string): string {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return url;
}

interface StudentData {
  pin: string;
  fullName: string;
  gradeGroup: string;
  avatar: string;
}

interface DraftAnswer {
  selectedOptionId: string;
  selectedOptionText: string;
  isCorrect: boolean;
  wasCorrected: boolean;
  corrections: number; // cuántas veces se corrigió esta pregunta
}

export default function HomeworkPlayPage() {
  const navigate = useNavigate();
  const { pin } = useParams<{ pin: string }>();
  const { getAssignmentByIdOrPin, submitHomework } = useHomeworkStore();

  // Recuperar datos del estudiante desde sessionStorage
  const [studentData] = useState<StudentData | null>(() => {
    try {
      const raw = sessionStorage.getItem('hw_student');
      if (!raw) return null;
      return JSON.parse(raw) as StudentData;
    } catch {
      return null;
    }
  });

  const assignment = pin ? getAssignmentByIdOrPin(pin) : undefined;
  const game = assignment ? (useGameStore.getState().getGame(assignment.gameId) || SAMPLE_GAMES[assignment.gameId]) : undefined;
  const questions = game?.questions ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(DraftAnswer | null)[]>(
    () => Array(questions.length).fill(null)
  );
  const [globalCorrectionsUsed, setGlobalCorrectionsUsed] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [studentPhotos, setStudentPhotos] = useState<string[]>([]);
  const [isPdfOpenInPage, setIsPdfOpenInPage] = useState<boolean>(true);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [selectedZoomPhoto, setSelectedZoomPhoto] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [photoAnswer, setPhotoAnswer] = useState<string | null>(null);

  const maxCorrections = assignment?.maxCorrections ?? 3;
  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const isAnswered = currentAnswer !== null;
  const isLastQuestion = currentIndex === questions.length - 1;
  const allAnswered = answers.every((a) => a !== null);

  // Reiniciar campos al cambiar de pregunta
  useEffect(() => {
    setTypedAnswer('');
    setPhotoAnswer(null);
  }, [currentIndex]);

  // Redirigir si no hay datos de estudiante o pin inválido
  useEffect(() => {
    if (!studentData || !pin || !assignment || !game || questions.length === 0) {
      navigate(`/homework/${pin || ''}`, { replace: true });
    }
  }, [studentData, pin, assignment, game, questions.length, navigate]);

  const handleSelectOption = (optionId: string, optionText: string) => {
    if (isAnswered && !showFeedback) return;
    if (showFeedback) return;

    const q = currentQ;
    const isCorrect = optionId === q.correctAnswer;

    setAnswers((prev) => {
      const updated = [...prev];
      updated[currentIndex] = {
        selectedOptionId: optionId,
        selectedOptionText: optionText,
        isCorrect,
        wasCorrected: (prev[currentIndex]?.corrections ?? 0) > 0,
        corrections: prev[currentIndex]?.corrections ?? 0,
      };
      return updated;
    });
    setShowFeedback(true);
  };

  const handleCorrect = () => {
    if (globalCorrectionsUsed >= maxCorrections) return;
    if (!isAnswered) return;

    setGlobalCorrectionsUsed((n) => n + 1);
    setAnswers((prev) => {
      const updated = [...prev];
      const existing = prev[currentIndex];
      if (existing) {
        updated[currentIndex] = { ...existing, corrections: existing.corrections + 1 };
      }
      return updated;
    });
    setShowFeedback(false);
  };

  const handleNext = useCallback(() => {
    setShowFeedback(false);
    if (!isLastQuestion) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowSummary(true);
    }
  }, [isLastQuestion]);

  const handleSubmit = () => {
    if (!assignment || !studentData) return;

    const finalAnswers: HomeworkAnswerSubmission[] = answers.map((a, i) => {
      const q = questions[i];
      const correctOpt = (q.options ?? []).find((o) => o.id === q.correctAnswer);
      return {
        questionIndex: i,
        questionPrompt: q.content,
        selectedOptionText: a?.selectedOptionText ?? '(sin respuesta)',
        correctOptionText: correctOpt?.text ?? '',
        isCorrect: a?.isCorrect ?? false,
        wasCorrected: (a?.corrections ?? 0) > 0,
      };
    });

    const correctCount = finalAnswers.filter((a) => a.isCorrect).length;
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const score = finalAnswers.reduce((acc, a) => acc + (a.isCorrect ? 1000 : 0), 0);

    submitHomework(assignment.id, {
      assignmentId: assignment.id,
      studentFullName: studentData.fullName,
      gradeGroup: studentData.gradeGroup,
      avatar: studentData.avatar,
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      accuracy,
      correctionsUsed: globalCorrectionsUsed,
      answers: finalAnswers,
      studentPhotos: studentPhotos.length > 0 ? studentPhotos : undefined,
    });

    sessionStorage.removeItem('hw_student');
    setSubmitted(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const remainingSlots = Math.max(0, 6 - studentPhotos.length);
    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        if (base64) {
          setStudentPhotos((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (indexToRemove: number) => {
    setStudentPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRetryExam = () => {
    // Para modo repaso de examen: resetear respuestas y volver a empezar
    setAnswers(Array(questions.length).fill(null));
    setCurrentIndex(0);
    setGlobalCorrectionsUsed(0);
    setShowFeedback(false);
    setShowSummary(false);
    setSubmitted(false);
  };

  if (!assignment || !game || !currentQ || !studentData) return null;

  const OPTION_COLORS = [
    'from-red-600 to-rose-700',
    'from-blue-600 to-indigo-700',
    'from-yellow-500 to-amber-600',
    'from-emerald-600 to-teal-700',
  ];

  // ── PANTALLA DE ENTREGA EXITOSA ──────────────────────────────
  if (submitted) {
    const correctCount = answers.filter((a) => a?.isCorrect).length;
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const allowRetry = assignment.assignmentType === 'exam_review' || assignment.allowRetries;

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="mb-6">
            <MascotAvatar seed={studentData.avatar} emotion="victory" size="2xl" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">¡Entregado! 🎉</h1>
          <p className="text-white/60 mb-6">Tu actividad fue registrada exitosamente</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-3xl font-black text-emerald-400">{accuracy}%</div>
              <div className="text-xs text-white/40">Aciertos</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-3xl font-black text-white">{correctCount}/{questions.length}</div>
              <div className="text-xs text-white/40">Correctas</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-3xl font-black text-purple-400">🔄{globalCorrectionsUsed}</div>
              <div className="text-xs text-white/40">Correcciones</div>
            </div>
          </div>

          {studentPhotos.length > 0 && (
            <div className="mb-6 p-3 rounded-2xl bg-white/5 border border-white/10 text-left">
              <p className="text-xs text-white/50 mb-2">📸 {studentPhotos.length} fotos de evidencia enviadas</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {studentPhotos.map((p, idx) => (
                  <img
                    key={idx}
                    src={p}
                    alt="Evidencia"
                    onClick={() => setSelectedZoomPhoto(p)}
                    className="w-14 h-14 object-cover rounded-xl border border-white/20 cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-sm text-white/40 mb-6">Tu docente podrá ver tus respuestas y evidencias fotográficas en su panel.</p>

          <div className="flex flex-col gap-3">
            {allowRetry && (
              <button
                onClick={handleRetryExam}
                className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black hover:opacity-90 shadow-lg shadow-purple-600/30 transition-all text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Repetir actividad para mejorar nota
              </button>
            )}
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold transition-all w-full text-sm"
            >
              <Home className="w-4 h-4" /> Ir al inicio
            </button>
          </div>
        </div>

        {/* Modal de zoom fotográfico si hace clic */}
        {selectedZoomPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedZoomPhoto(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh]">
              <img src={selectedZoomPhoto} alt="Zoom" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
              <button
                onClick={() => setSelectedZoomPhoto(null)}
                className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-white/20 text-white rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PANTALLA DE RESUMEN ANTES DE ENTREGAR ────────────────────
  if (showSummary) {
    const correctCount = answers.filter((a) => a?.isCorrect).length;
    const accuracy = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-6">
              <MascotAvatar seed={studentData.avatar} emotion={accuracy >= 70 ? 'celebrate' : 'thinking'} size="xl" />
              <h2 className="text-2xl font-black text-white mt-4">Resumen de tu tarea</h2>
              <p className="text-white/40 text-sm mt-1">{assignment.title}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white/5 rounded-2xl p-3 text-center">
                <div className="text-2xl font-black text-emerald-400">{accuracy}%</div>
                <div className="text-xs text-white/40">Aciertos</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 text-center">
                <div className="text-2xl font-black text-white">{correctCount}/{questions.length}</div>
                <div className="text-xs text-white/40">Correctas</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 text-center">
                <div className="text-2xl font-black text-purple-400">{globalCorrectionsUsed}</div>
                <div className="text-xs text-white/40">Correcciones usadas</div>
              </div>
            </div>

            {/* Revisión rápida de preguntas */}
            <div className="space-y-2 mb-6 max-h-40 overflow-y-auto pr-1">
              {questions.map((q, i) => {
                const a = answers[i];
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-xl p-3 ${a?.isCorrect ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {a?.isCorrect
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    }
                    <p className="text-xs text-white/70 truncate flex-1">{q.content}</p>
                    {(a?.corrections ?? 0) > 0 && (
                      <span className="text-[10px] text-purple-300 flex-shrink-0">🔄</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Subida de evidencias fotográficas del cuaderno */}
            {assignment.allowPhotoUpload !== false && (
              <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                    <Camera className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Fotos de tu cuaderno ({studentPhotos.length}/6)</span>
                  </div>
                  <label className="cursor-pointer px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-1 transition-all">
                    <Plus className="w-3.5 h-3.5" /> Subir fotos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                </div>
                <p className="text-[11px] text-white/40 mb-3">
                  Adjunta capturas claras de tus apuntes o procedimientos antes de entregar.
                </p>
                {studentPhotos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {studentPhotos.map((photo, pIdx) => (
                      <div key={pIdx} className="relative group rounded-xl overflow-hidden aspect-square border border-white/15 bg-black/40">
                        <img
                          src={photo}
                          alt={`Evidencia ${pIdx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setSelectedZoomPhoto(photo)}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(pIdx)}
                          className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-600 text-white rounded-md transition-colors"
                          title="Eliminar foto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-dashed border-white/15 rounded-xl p-3 text-center text-xs text-white/30">
                    No has adjuntado fotos todavía (opcional)
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowSummary(false); setCurrentIndex(questions.length - 1); }}
                className="py-3 px-4 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 text-sm font-semibold"
              >
                ← Revisar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-base hover:opacity-90 transition-all shadow-lg shadow-emerald-600/25"
              >
                <Send className="w-4 h-4" /> Entregar tarea
              </button>
            </div>
          </div>
        </div>

        {/* Modal de zoom fotográfico si hace clic */}
        {selectedZoomPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedZoomPhoto(null)}
          >
            <div className="relative max-w-3xl max-h-[90vh]">
              <img src={selectedZoomPhoto} alt="Zoom" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
              <button
                onClick={() => setSelectedZoomPhoto(null)}
                className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-white/20 text-white rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PANTALLA DE JUEGO PRINCIPAL ──────────────────────────────
  const correctOptText = (currentQ.options ?? []).find((o) => o.id === currentQ.correctAnswer)?.text ?? '';
  const correctionsLeft = maxCorrections - globalCorrectionsUsed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex flex-col">
      {/* HUD Superior */}
      <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          {/* Mascota + nombre */}
          <div className="flex items-center gap-2">
            <MascotAvatar seed={studentData.avatar} emotion={showFeedback && currentAnswer?.isCorrect ? 'happy' : showFeedback && !currentAnswer?.isCorrect ? 'sad' : 'idle'} size="xs" />
            <span className="text-sm font-semibold text-white/70 hidden sm:block">{studentData.fullName.split(' ')[0]}</span>
          </div>

          {/* Progreso */}
          <div className="flex-1 max-w-xs">
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Pregunta {currentIndex + 1} de {questions.length}</span>
              <span>{Math.round(((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex + (isAnswered ? 1 : 0)) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Comodines */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${
            correctionsLeft > 0 ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/10 text-white/30'
          }`}>
            🔄 {correctionsLeft}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6 gap-6">
        {/* Banner de Guía PDF Adjunta con Visor en la Misma Página */}
        {assignment.pdfUrl && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/70 to-slate-900/70 border border-blue-500/40 text-white shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-300 flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-blue-300 font-black uppercase tracking-wider">Documento / Guía del Taller</p>
                  <p className="text-sm font-bold text-white/95 truncate">{assignment.pdfName || 'Guía de la Asignación'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <button
                  type="button"
                  onClick={() => setIsPdfOpenInPage((prev) => !prev)}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all ${
                    isPdfOpenInPage
                      ? 'bg-blue-700 text-white border border-blue-400'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isPdfOpenInPage ? 'Ocultar PDF' : 'Abrir PDF'}</span>
                </button>
              </div>
            </div>

            {/* Visor de PDF embebido directamente en la misma página */}
            {isPdfOpenInPage && (
              <div className="w-full bg-slate-900 border border-blue-500/40 rounded-2xl overflow-hidden shadow-2xl transition-all animate-fade-in">
                <div className="flex items-center justify-between p-2.5 bg-blue-950/80 border-b border-blue-500/30 text-xs">
                  <span className="text-white/80 font-bold truncate px-2">{assignment.pdfName || 'Visor de Guía'}</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={assignment.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={assignment.pdfName || 'guia.pdf'}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold"
                    >
                      Descargar
                    </a>
                    <button
                      type="button"
                      onClick={() => setIsPdfOpenInPage(false)}
                      className="p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
                      title="Ocultar visor"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="h-[60vh] sm:h-[68vh] w-full bg-white">
                  <iframe
                    src={assignment.pdfUrl}
                    title="Guía PDF"
                    className="w-full h-full border-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pregunta con Video o Imagen */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
          {currentQ.videoUrl ? (
            <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/20 bg-black mb-4">
              <iframe
                src={getEmbedVideoUrl(currentQ.videoUrl)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video explicativo"
              />
            </div>
          ) : currentQ.imageUrl ? (
            <img
              src={currentQ.imageUrl}
              alt="Imagen de la pregunta"
              className="w-full max-h-48 object-contain rounded-xl mb-4 bg-black/40"
            />
          ) : null}
          <p className="text-xl font-black text-white text-center leading-snug">{currentQ.content}</p>
          <p className="text-center text-xs text-white/30 mt-2">Sin límite de tiempo · Sin presión ⏸</p>
        </div>

        {/* Respuestas según Tipo (Texto, Foto o Selección Múltiple) */}
        {currentQ.type === 'short_answer' ? (
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-300">
              ✍️ Tu Respuesta Escrita
            </label>
            <textarea
              rows={4}
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              disabled={showFeedback}
              placeholder="Escribe aquí tu respuesta detallada, justificación o procedimiento..."
              className="w-full p-4 rounded-xl bg-slate-900 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 text-sm resize-none"
            />
            {!showFeedback && (
              <button
                type="button"
                disabled={!typedAnswer.trim()}
                onClick={() => handleSelectOption('written', typedAnswer.trim())}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <Send className="w-4 h-4" /> Confirmar Respuesta
              </button>
            )}
          </div>
        ) : currentQ.type === 'photo_only' ? (
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">📸 Sube la Foto de tu Trabajo o Cuaderno</h4>
              <p className="text-xs text-white/50 mt-1">
                Toma una foto clara con tu celular o sube el archivo desde tu computador.
              </p>
            </div>

            {photoAnswer ? (
              <div className="relative max-w-sm mx-auto rounded-2xl overflow-hidden border border-white/20 bg-black/60 shadow-lg">
                <img src={photoAnswer} alt="Foto de trabajo" className="w-full max-h-56 object-contain" />
                {!showFeedback && (
                  <button
                    type="button"
                    onClick={() => setPhotoAnswer(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-md"
                    title="Eliminar foto y tomar otra"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <label className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm cursor-pointer shadow-lg shadow-purple-600/30 transition-all">
                <Camera className="w-4 h-4" />
                <span>Tomar o Elegir Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string;
                      setPhotoAnswer(dataUrl);
                      setStudentPhotos((prev) => [...prev, dataUrl]);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            )}

            {!showFeedback && photoAnswer && (
              <button
                type="button"
                onClick={() => handleSelectOption('photo', 'Evidencia fotográfica adjuntada')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Enviar Evidencia Fotográfica
              </button>
            )}
          </div>
        ) : (
          /* Opciones de Selección Múltiple (4 Colores) */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(currentQ.options ?? []).map((opt, i) => {
              const isSelected = currentAnswer?.selectedOptionId === opt.id;
              const isCorrectOpt = opt.id === currentQ.correctAnswer;

              let borderClass = 'border-white/10 hover:border-white/30 hover:bg-white/10';
              let bgClass = 'bg-white/5';

              if (showFeedback) {
                if (isCorrectOpt) {
                  bgClass = 'bg-emerald-500/20';
                  borderClass = 'border-emerald-400';
                } else if (isSelected && !isCorrectOpt) {
                  bgClass = 'bg-red-500/20';
                  borderClass = 'border-red-400';
                } else {
                  bgClass = 'bg-white/5 opacity-40';
                  borderClass = 'border-white/10';
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id, opt.text)}
                  disabled={showFeedback}
                  className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${bgClass} ${borderClass} disabled:cursor-default`}
                >
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${OPTION_COLORS[i % 4]} flex items-center justify-center font-black text-sm text-white flex-shrink-0`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm font-semibold text-white leading-snug">{opt.text}</span>
                  {showFeedback && isCorrectOpt && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto flex-shrink-0" />
                  )}
                  {showFeedback && isSelected && !isCorrectOpt && (
                    <XCircle className="w-5 h-5 text-red-400 ml-auto flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback + acciones */}
        {showFeedback && (
          <div className={`rounded-2xl border p-5 ${currentAnswer?.isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex items-start gap-3 mb-4">
              <MascotAvatar seed={studentData.avatar} emotion={currentAnswer?.isCorrect ? 'celebrate' : 'sad'} size="sm" />
              <div>
                <p className={`font-black text-lg ${currentAnswer?.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                  {currentAnswer?.isCorrect ? '¡Correcto! 🎉' : 'Incorrecto 😔'}
                </p>
                {!currentAnswer?.isCorrect && (
                  <p className="text-sm text-white/60 mt-0.5">
                    La respuesta correcta era: <strong className="text-white">{correctOptText}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {/* Botón de corrección */}
              {!currentAnswer?.isCorrect && correctionsLeft > 0 && (
                <button
                  onClick={handleCorrect}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-sm hover:bg-purple-600/50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Corregir 🔄 ({correctionsLeft} restantes)
                </button>
              )}
              {!currentAnswer?.isCorrect && correctionsLeft === 0 && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/30 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Sin comodines disponibles
                </div>
              )}
              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                {isLastQuestion ? 'Ver resumen' : 'Siguiente →'}
              </button>
            </div>
          </div>
        )}

        {/* Sin feedback todavía: indicador de "sin presión" */}
        {!showFeedback && !isAnswered && (
          <p className="text-center text-white/30 text-sm">👆 Toca una respuesta para continuar</p>
        )}
      </main>

      {/* MODAL VISOR DE PDF GUÍA */}
      {showPdfModal && assignment.pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col p-3 sm:p-6 animate-fade-in">
          <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-3 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="font-bold text-sm truncate">{assignment.pdfName || 'Guía de la actividad'}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={assignment.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={assignment.pdfName || 'guia.pdf'}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold"
              >
                Descargar
              </a>
              <button
                onClick={() => setShowPdfModal(false)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                title="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="max-w-4xl w-full mx-auto flex-1 bg-white rounded-2xl overflow-hidden shadow-2xl">
            <iframe
              src={assignment.pdfUrl}
              title="Guía PDF"
              className="w-full h-full border-none"
            />
          </div>
        </div>
      )}

      {/* MODAL ZOOM FOTO EVIDENCIA */}
      {selectedZoomPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedZoomPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={selectedZoomPhoto} alt="Zoom" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
            <button
              onClick={() => setSelectedZoomPhoto(null)}
              className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-white/20 text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
