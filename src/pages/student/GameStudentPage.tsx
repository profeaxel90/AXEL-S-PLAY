import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { getOrCreateGameClientSync, type GameEventMessage } from '../../lib/gameSync';
import {
  Clock, CheckCircle2, XCircle, Zap, Volume2, VolumeX, Sparkles, Award
} from 'lucide-react';
import type { Question, PowerUp, ParticipantRank } from '../../types';

// Colores y símbolos estilo Kahoot para los botones táctiles de respuesta
const OPTION_STYLES = [
  {
    bg: 'bg-red-600 hover:bg-red-500 active:bg-red-700 border-red-400',
    icon: '▲',
    label: 'Rojo',
  },
  {
    bg: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border-blue-400',
    icon: '◆',
    label: 'Azul',
  },
  {
    bg: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 border-amber-300 text-slate-950',
    icon: '●',
    label: 'Amarillo',
  },
  {
    bg: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border-emerald-400',
    icon: '■',
    label: 'Verde',
  },
];

export default function GameStudentPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    currentQuestion,
    currentParticipant,
    questionIndex,
    phase,
  } = useSessionStore();

  const [activeQuestion, setActiveQuestion] = useState<Question | null>(currentQuestion);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [pointsGained, setPointsGained] = useState<number | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [revealedCorrectId, setRevealedCorrectId] = useState<string | null>(null);
  const [explanationText, setExplanationText] = useState<string | null>(null);
  const [activePower, setActivePower] = useState<PowerUp | null>(currentParticipant?.activePower || null);
  const [currentScore, setCurrentScore] = useState<number>(currentParticipant?.score || 0);
  const [questionNum, setQuestionNum] = useState<number>(questionIndex + 1);
  const [totalQuestions, setTotalQuestions] = useState<number>(5);

  // Audio en Móvil
  const [isMusicActive, setIsMusicActive] = useState(() => audioEngine.getSettings().musicEnabled);
  const [musicVol, setMusicVol] = useState(() => audioEngine.getSettings().musicVolume ?? 0.75);
  const [showVolSlider, setShowVolSlider] = useState(false);

  // Modo Robo de Puntos en Móvil
  const [stealModalActive, setStealModalActive] = useState(false);
  const [isClaimingSteal, setIsClaimingSteal] = useState(false);
  const [stealResult, setStealResult] = useState<{ didWin: boolean; winnerNickname: string; amount: number } | null>(null);

  // Escuchar mensajes en tiempo real vía GameClientSync (SSE + P2P)
  useEffect(() => {
    if (!sessionId) return;
    const sync = getOrCreateGameClientSync(sessionId);

    sync.onEvent = (msg: GameEventMessage) => {
      console.log('[GameStudentPage] Evento recibido:', msg.type);

      if (msg.type === 'QUESTION' && msg.question) {
        setActiveQuestion(msg.question);
        setSelectedOption(null);
        setIsAnswerSubmitted(false);
        setFeedback(null);
        setPointsGained(null);
        setEliminatedOptions([]);
        setRevealedCorrectId(null);
        setExplanationText(null);
        setStealModalActive(false);
        setStealResult(null);
        setTimeLeft(msg.timeLimit || 20);
        setQuestionNum((msg.index || 0) + 1);
        setTotalQuestions(msg.total || 5);
        audioEngine.setContext('question');
      } else if (msg.type === 'ANSWER_ACK') {
        if (!currentParticipant || msg.participantId === currentParticipant.id) {
          setFeedback(msg.isCorrect ? 'correct' : 'incorrect');
          setPointsGained(msg.pointsEarned || 0);
          if (msg.newScore !== undefined) {
            setCurrentScore(msg.newScore);
          }
          if (msg.isCorrect) {
            audioEngine.playEffect('sfx_correct');
          } else {
            audioEngine.playEffect('sfx_wrong');
          }
        }
      } else if (msg.type === 'REVEAL_ANSWER') {
        if (msg.correctOptionId) {
          setRevealedCorrectId(msg.correctOptionId);
        }
        if (msg.explanation) setExplanationText(msg.explanation);
      } else if (msg.type === 'STEAL_POINTS_START') {
        // Docente activó el Robo de Puntos
        setStealModalActive(true);
        setIsClaimingSteal(false);
        setStealResult(null);
        audioEngine.playEffect('sfx_steal_alert');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([120, 80, 120]);
        }
      } else if (msg.type === 'STEAL_POINTS_CLAIMED') {
        const didWin = Boolean(currentParticipant && msg.winnerId === currentParticipant.id);
        const amount = msg.amount || 500;
        setStealResult({
          didWin,
          winnerNickname: msg.winnerNickname || (didWin ? 'Tú' : 'Otro participante'),
          amount,
        });

        if (didWin) {
          audioEngine.playEffect('sfx_steal_win');
          setCurrentScore((prev) => prev + amount);
        } else {
          audioEngine.playEffect('sfx_steal_lost');
        }

        // Cerrar modal automáticamente después de mostrar el resultado
        setTimeout(() => {
          setStealModalActive(false);
          setStealResult(null);
        }, 3500);
      } else if (msg.type === 'POWER') {
        if (!msg.targetId || (currentParticipant && msg.targetId === currentParticipant.id)) {
          if (msg.power) {
            setActivePower(msg.power);
            audioEngine.playEffect('sfx_power_assigned');

            // Efecto eliminate_two: eliminar 2 opciones incorrectas
            if (msg.power.type === 'eliminate_two' && activeQuestion) {
              const correct = activeQuestion.correctAnswer;
              const wrongOptions = (activeQuestion.options || [])
                .map((o) => o.id)
                .filter((id) => id !== correct);
              setEliminatedOptions(wrongOptions.slice(0, 2));
            }
          }
        }
      } else if (msg.type === 'GAME_OVER') {
        const mappedRanks: ParticipantRank[] = (msg.rankings || []).map((p, idx) => ({
          participantId: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score,
          rank: idx + 1,
          change: 0,
          correctAnswers: p.correctAnswers || 0,
        }));
        useSessionStore.setState({ rankings: mappedRanks });
        navigate(`/results/${sessionId}`);
      }
    };

    sync.connectSSE();
  }, [sessionId, currentParticipant, activeQuestion, navigate]);

  // Temporizador regresivo local por pregunta
  useEffect(() => {
    if (!activeQuestion) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        if (prev <= 5) {
          audioEngine.playEffect('sfx_countdown');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuestion]);

  // Si la fase pasa a finalizado por el store
  useEffect(() => {
    if (phase === 'finished' && sessionId) {
      navigate(`/results/${sessionId}`);
    }
  }, [phase, sessionId, navigate]);

  // Manejo de envío de respuesta
  const handleSelectAnswer = async (optionId: string) => {
    if (isAnswerSubmitted || timeLeft <= 0 || !activeQuestion) return;

    setSelectedOption(optionId);
    setIsAnswerSubmitted(true);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(60);
    }
    audioEngine.playEffect('sfx_tick');

    const timeTaken = (activeQuestion.timeLimit || 20) - timeLeft;

    // Comprobación de respuesta
    const isCorrect = Array.isArray(activeQuestion.correctAnswer)
      ? (activeQuestion.correctAnswer as unknown[]).includes(optionId)
      : activeQuestion.correctAnswer === optionId;

    const basePoints = activeQuestion.points || 1000;
    const timeBonus = Math.floor((timeLeft / (activeQuestion.timeLimit || 20)) * 500);

    // Multiplicador de Super Poder + Multiplicador de Pregunta (Doble / Triple)
    const questionMultiplier = activeQuestion.pointsMultiplier || 1;
    const powerMultiplier = activePower?.type === 'double_points' ? 2 : 1;
    const totalMultiplier = questionMultiplier * powerMultiplier;

    const earned = isCorrect ? (basePoints + timeBonus) * totalMultiplier : 0;

    // Enviar al servidor local y P2P
    if (sessionId) {
      const sync = getOrCreateGameClientSync(sessionId);
      const participantId = currentParticipant?.id || 'p-self';
      sync.submitAnswer({
        participantId,
        optionId,
        timeTaken,
        isCorrect,
        pointsEarned: earned,
      });
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setPointsGained(earned);
    if (isCorrect) {
      setCurrentScore((prev) => prev + earned);
      audioEngine.playEffect('sfx_correct');
    } else {
      audioEngine.playEffect('sfx_wrong');
    }
  };

  // Manejo del botón Robar Puntos
  const handleClaimSteal = async () => {
    if (isClaimingSteal || stealResult || !sessionId) return;
    setIsClaimingSteal(true);
    audioEngine.playEffect('sfx_tick');

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100);
    }

    const sync = getOrCreateGameClientSync(sessionId);
    const participantId = currentParticipant?.id || 'p-self';
    await sync.claimStealPoints(participantId);
  };

  // Pregunta activa o muestra por defecto para pruebas
  const displayQuestion: Question = activeQuestion || {
    id: 'mock-q1',
    content: '¿Cuál es la función principal de la señalización vial de color rojo?',
    type: 'single_choice',
    timeLimit: 20,
    points: 1000,
    pointsMultiplier: 1,
    difficulty: 'medium',
    orderIndex: 0,
    teacherId: 'teacher-1',
    createdAt: new Date().toISOString(),
    correctAnswer: 'opt-1',
    explanation: 'El color rojo en las señales de tránsito indica prohibición, parada obligatoria o peligro inminente.',
    options: [
      { id: 'opt-1', text: 'Indica prohibición o parada obligatoria' },
      { id: 'opt-2', text: 'Indica una recomendación turística' },
      { id: 'opt-3', text: 'Indica información de kilometraje' },
      { id: 'opt-4', text: 'Indica zonas de descanso y camping' },
    ],
  };

  const currentOptions = displayQuestion.options || [];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-3 sm:p-5 select-none relative overflow-x-hidden">
      {/* ── Top Bar con HUD del Jugador ── */}
      <header className="flex items-center justify-between max-w-lg mx-auto w-full pt-1 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 p-1 shadow-md">
            <img
              src={currentParticipant?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ProfeAxel'}
              alt="Avatar"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="font-bold text-xs leading-none">{currentParticipant?.nickname || 'Jugador'}</div>
            <div className="text-[11px] text-yellow-400 font-extrabold mt-0.5">
              {currentScore.toLocaleString()} pts
            </div>
          </div>
        </div>

        {/* Control de Audio y Temporizador */}
        <div className="flex items-center gap-2">
          {/* Audio Slider Móvil */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                audioEngine.unlock();
                setShowVolSlider(!showVolSlider);
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/70"
              title="Volumen del teléfono"
            >
              {isMusicActive ? <Volume2 className="w-3.5 h-3.5 text-green-400" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
            </button>

            {showVolSlider && (
              <div className="absolute right-0 top-9 z-50 p-2.5 rounded-xl bg-slate-900 border border-purple-500/40 shadow-2xl w-40 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span>Volumen:</span>
                  <button
                    onClick={() => {
                      const next = audioEngine.toggleMusic();
                      setIsMusicActive(next);
                    }}
                    className="text-purple-300 font-bold"
                  >
                    {isMusicActive ? 'Mute' : 'Activar'}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVol}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setMusicVol(v);
                    audioEngine.setMusicVolume(v);
                  }}
                  className="w-full accent-purple-500"
                />
              </div>
            )}
          </div>

          <span className="text-xs font-bold text-purple-300 bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-500/30">
            {questionNum}/{totalQuestions}
          </span>

          <div className={`px-3 py-1 rounded-full border font-black text-xs flex items-center gap-1 ${
            timeLeft <= 5
              ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
              : 'bg-white/10 border-white/20 text-white'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>
      </header>

      {/* ── Banner de Super Poder Activo ── */}
      {activePower && (
        <div className="max-w-lg mx-auto w-full my-1.5 animate-bounce-in">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-between text-amber-300 shadow-lg shadow-amber-500/10">
            <div className="flex items-center gap-2">
              <span className="text-xl">{activePower.icon}</span>
              <div>
                <div className="font-black text-xs">{activePower.label}</div>
                <div className="text-[10px] text-amber-200/80">{activePower.description}</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
              Activo
            </span>
          </div>
        </div>
      )}

      {/* ── Pregunta e Imagen en Pantalla Móvil ── */}
      <main className="max-w-lg mx-auto w-full my-auto py-2">
        <div className="card p-3.5 md:p-4 border-purple-500/30 bg-purple-950/20 backdrop-blur-xl mb-3 text-center">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
              Pregunta #{questionNum}
            </span>

            {/* Badge de Multiplicador si es x2 o x3 */}
            {displayQuestion.pointsMultiplier && displayQuestion.pointsMultiplier > 1 && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950 font-black text-[10px] flex items-center gap-1 animate-pulse">
                <Zap className="w-3 h-3 fill-slate-950" />
                <span>PUNTOS {displayQuestion.pointsMultiplier === 2 ? 'DOBLES (2×)' : 'TRIPLES (3×)'}</span>
              </span>
            )}
          </div>

          {/* Imagen de la Pregunta en el celular */}
          {displayQuestion.imageUrl && (
            <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 max-h-40 bg-slate-950 flex items-center justify-center">
              <img
                src={displayQuestion.imageUrl}
                alt="Imagen de la pregunta"
                className="max-h-36 object-contain rounded"
              />
            </div>
          )}

          <h2 className="text-sm md:text-base font-black text-white leading-snug">
            {displayQuestion.content}
          </h2>
        </div>

        {/* ── Botones Grandes de Respuesta (Estilo Kahoot) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {currentOptions.map((option, idx) => {
            const style = OPTION_STYLES[idx % OPTION_STYLES.length];
            const isSelected = selectedOption === option.id;
            const isEliminated = eliminatedOptions.includes(option.id);
            const isRevealedCorrect = revealedCorrectId === option.id;
            const isRevealedWrong = revealedCorrectId && revealedCorrectId !== option.id;

            return (
              <button
                key={option.id}
                disabled={isAnswerSubmitted || isEliminated || timeLeft <= 0}
                onClick={() => handleSelectAnswer(option.id)}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 text-left font-bold relative shadow-lg ${
                  isEliminated
                    ? 'opacity-20 pointer-events-none line-through bg-slate-900 border-white/10'
                    : isRevealedCorrect
                    ? 'bg-emerald-600 border-yellow-300 text-white scale-[1.02] shadow-emerald-500/40 ring-4 ring-yellow-400'
                    : isRevealedWrong
                    ? 'opacity-40 bg-slate-900 border-white/10'
                    : isSelected
                    ? `${style.bg} ring-4 ring-white border-white scale-[1.02] shadow-2xl`
                    : `${style.bg} ${isAnswerSubmitted ? 'opacity-50' : 'hover:scale-[1.02]'}`
                }`}
              >
                {/* Símbolo geométrico */}
                <span className="w-9 h-9 rounded-xl bg-black/25 flex items-center justify-center font-black text-lg shrink-0">
                  {style.icon}
                </span>

                <span className="text-xs sm:text-sm leading-tight flex-1">
                  {option.text}
                </span>

                {/* Check si está seleccionada */}
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 animate-bounce-in" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Feedback de Respuesta Enviada ── */}
        {isAnswerSubmitted && (
          <div className="mt-3 text-center animate-bounce-in">
            {feedback === 'correct' ? (
              <div className="p-3 rounded-2xl bg-green-500/20 border border-green-500/40 text-green-300">
                <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>¡RESPUESTA CORRECTA! +{pointsGained} pts</span>
                </div>
                <p className="text-[11px] text-green-200 mt-0.5">
                  ¡Excelente reflejo! Esperando siguiente pregunta...
                </p>
              </div>
            ) : feedback === 'incorrect' ? (
              <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300">
                <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span>¡Incorrecto! No te rindas</span>
                </div>
                <p className="text-[11px] text-red-200 mt-0.5">
                  Esperando que el docente avance...
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-white/10 border border-white/20 text-white/80 text-xs">
                Respuesta enviada. Esperando que todos respondan...
              </div>
            )}

            {/* Explicación pedagógica si fue revelada */}
            {explanationText && (
              <div className="mt-2 p-2.5 rounded-xl bg-purple-900/40 border border-purple-500/30 text-[11px] text-purple-200 text-left">
                💡 <strong>Explicación:</strong> {explanationText}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── OVERLAY GIGANTE: ROBO DE PUNTOS EN MÓVIL ── */}
      {stealModalActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-bounce-in">
          <div className="card max-w-sm w-full p-6 border-red-500/80 bg-gradient-to-b from-red-950/90 via-slate-900 to-slate-950 text-center shadow-2xl shadow-red-600/50 space-y-5 ring-4 ring-red-500/50">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-400 text-red-300 text-xs font-black animate-pulse">
              <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>¡ALERTA DE ROBO DE PUNTOS!</span>
            </div>

            <h3 className="text-xl font-black text-white">
              ¡Sé el primero en pulsar!
            </h3>

            {stealResult ? (
              <div className="p-4 rounded-2xl bg-white/10 border border-white/20 space-y-2 animate-bounce-in">
                {stealResult.didWin ? (
                  <>
                    <div className="text-4xl">🎉</div>
                    <div className="text-lg font-black text-yellow-300">
                      ¡ROBASTE LOS PUNTOS!
                    </div>
                    <div className="text-sm font-bold text-green-400">
                      +{stealResult.amount} pts sumados a tu marcador
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-4xl">⚡</div>
                    <div className="text-base font-black text-white">
                      ¡{stealResult.winnerNickname} fue más rápido!
                    </div>
                    <div className="text-xs text-white/60">
                      Se quedó con los {stealResult.amount} puntos. ¡Más suerte en la próxima!
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                disabled={isClaimingSteal}
                onClick={handleClaimSteal}
                className="w-full py-8 rounded-3xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-black text-2xl uppercase tracking-wider shadow-2xl shadow-red-600/60 border-4 border-yellow-300 animate-pulse flex flex-col items-center justify-center gap-2 cursor-pointer transition-transform"
              >
                <Zap className="w-10 h-10 fill-yellow-300 text-yellow-300 animate-bounce" />
                <span>ROBAR PUNTOS</span>
                <span className="text-xs font-bold text-yellow-200 tracking-normal">+500 PTS</span>
              </button>
            )}

            <p className="text-[10px] text-white/50">
              Solo el estudiante con el reflejo más veloz de la sala se queda con los puntos.
            </p>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="max-w-lg mx-auto w-full text-center text-[10px] text-white/40 pb-1">
        AXEL'S PLAY • Mantente atento a la pantalla principal
      </footer>
    </div>
  );
}
