import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, RotateCcw, Send, Home, AlertCircle } from 'lucide-react';
import { useHomeworkStore } from '../../stores/homeworkStore';
import { useGameStore } from '../../stores/gameStore';
import { SAMPLE_GAMES } from '../../data/mockGames';
import type { HomeworkAnswerSubmission } from '../../types/homework';
import MascotAvatar from '../../components/game/MascotAvatar';

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

  const maxCorrections = assignment?.maxCorrections ?? 3;
  const currentQ = questions[currentIndex];
  const currentAnswer = answers[currentIndex];
  const isAnswered = currentAnswer !== null;
  const isLastQuestion = currentIndex === questions.length - 1;
  const allAnswered = answers.every((a) => a !== null);

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
    });

    sessionStorage.removeItem('hw_student');
    setSubmitted(true);
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="mb-6">
            <MascotAvatar seed={studentData.avatar} emotion="victory" size="2xl" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2">¡Entregado! 🎉</h1>
          <p className="text-white/60 mb-6">Tu tarea fue registrada exitosamente</p>

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

          <p className="text-sm text-white/40 mb-6">Tu docente podrá ver tus resultados en el panel de asignaciones.</p>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mx-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold"
          >
            <Home className="w-4 h-4" /> Ir al inicio
          </button>
        </div>
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
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
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
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-1">
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
        {/* Pregunta */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
          {currentQ.imageUrl && (
            <img
              src={currentQ.imageUrl}
              alt="Imagen de la pregunta"
              className="w-full max-h-40 object-cover rounded-xl mb-4"
            />
          )}
          <p className="text-xl font-black text-white text-center leading-snug">{currentQ.content}</p>
          <p className="text-center text-xs text-white/30 mt-2">Sin límite de tiempo · Sin presión ⏸</p>
        </div>

        {/* Opciones */}
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
    </div>
  );
}
