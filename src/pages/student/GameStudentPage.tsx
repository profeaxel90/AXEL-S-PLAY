import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { getOrCreateGameClientSync, type GameEventMessage } from '../../lib/gameSync';
import {
  Clock, CheckCircle2, XCircle, Zap, Sparkles, Award, Volume2, VolumeX,
  Shield, ShieldCheck, Flame, Star
} from 'lucide-react';
import type { Question, PowerUp, ParticipantRank } from '../../types';
import MascotAvatar from '../../components/game/MascotAvatar';

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

  // Audio en Móvil — solo control de beeps/efectos, sin música de fondo
  const [isSfxActive, setIsSfxActive] = useState(() => audioEngine.getSettings().effectsEnabled);
  const [sfxVol, setSfxVol] = useState(() => audioEngine.getSettings().effectsVolume ?? 0.85);
  const [showVolSlider, setShowVolSlider] = useState(false);

  // Nuevo sistema de Robo de Puntos
  const [stealCount, setStealCount] = useState(0); // robos usados (máx 2)
  const [showStealModal, setShowStealModal] = useState(false);
  const [showStealConfirm, setShowStealConfirm] = useState(false);
  const [stealTarget, setStealTarget] = useState<{id: string, nickname: string, score: number} | null>(null);
  const [stealResult, setStealResult] = useState<{success: boolean, fromNickname?: string, toNickname?: string, amount?: number, error?: string} | null>(null);
  const [isDoingSteal, setIsDoingSteal] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<{id: string, nickname: string, score: number}[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isStealAuthorized, setIsStealAuthorized] = useState(false);

  // Nuevas Funciones de Gamificación: Rachas, Ronda Dorada, Escudo Protector y Emojis
  const [streakCount, setStreakCount] = useState(0);
  const [isGoldenRound, setIsGoldenRound] = useState(false);
  const [shieldAvailable, setShieldAvailable] = useState(true); // 1 escudo por partida
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [lastSentEmoji, setLastSentEmoji] = useState<string | null>(null);

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
        setShowStealModal(false);
        setShowStealConfirm(false);
        setStealResult(null);
        setShowLeaderboard(false);
        setIsStealAuthorized(false);
        setIsShieldActive(false); // El escudo se reinicia para la nueva ronda
        setTimeLeft(msg.timeLimit || 20);
        setQuestionNum((msg.index || 0) + 1);
        setTotalQuestions(msg.total || 5);
        if (msg.isGoldenRound !== undefined) {
          setIsGoldenRound(msg.isGoldenRound);
        }
        // Sin música en dispositivos de alumnos — solo beep de inicio
        audioEngine.playEffect('sfx_tick');

        // Actualizar lista de jugadores disponibles para robar
        if (msg.participants) {
          const others = msg.participants
            .filter((p: any) => p.id !== currentParticipant?.id && p.score >= 50)
            .map((p: any) => ({ id: p.id, nickname: p.nickname, score: p.score }));
          setAvailablePlayers(others);
        }
      } else if (msg.type === 'GOLDEN_ROUND') {
        const active = msg.isGoldenRound || false;
        setIsGoldenRound(active);
        if (active) {
          audioEngine.playEffect('sfx_golden_round');
        }
      } else if (msg.type === 'ANSWER_ACK') {
        if (!currentParticipant || msg.participantId === currentParticipant.id) {
          setFeedback(msg.isCorrect ? 'correct' : 'incorrect');
          setPointsGained(msg.pointsEarned || 0);
          if (msg.newScore !== undefined) {
            setCurrentScore(msg.newScore);
          }
          if (msg.isCorrect) {
            setStreakCount((prev) => {
              const next = prev + 1;
              if (next >= 2) {
                audioEngine.playEffect('sfx_streak');
              } else {
                audioEngine.playEffect('sfx_correct');
              }
              return next;
            });
          } else {
            setStreakCount(0);
            audioEngine.playEffect('sfx_wrong');
          }
        }

        // Actualizar lista de jugadores disponibles para robar
        if (msg.participants) {
          const others = msg.participants
            .filter((p: any) => p.id !== currentParticipant?.id && p.score >= 50)
            .map((p: any) => ({ id: p.id, nickname: p.nickname, score: p.score }));
          setAvailablePlayers(others);
        }
      } else if (msg.type === 'STEAL_POWER_AUTHORIZED') {
        setIsStealAuthorized(true);
        audioEngine.playEffect('sfx_power_up');
      } else if (msg.type === 'REVEAL_ANSWER') {
        audioEngine.playEffect('sfx_time_up');
        if (msg.correctOptionId) {
          setRevealedCorrectId(msg.correctOptionId);
        }
        if (msg.explanation) setExplanationText(msg.explanation);
        if (msg.rankings) {
          setLeaderboardData(msg.rankings);
          setShowLeaderboard(true);
          audioEngine.playEffect('sfx_digital_coins');
          setTimeout(() => setShowLeaderboard(false), 7000);
        }
      } else if (msg.type === 'STEAL_RESULT') {
        if (msg.fromId === currentParticipant?.id) {
          // Fui yo quien robó
          if (msg.success) {
            setStealCount(prev => prev + 1);
            setCurrentScore(prev => prev + (msg.amount || 50));
            audioEngine.playEffect('sfx_steal_win');
          }
          setStealResult({ success: msg.success || false, fromNickname: msg.fromNickname, toNickname: msg.toNickname, amount: msg.amount, error: msg.error });
          setIsDoingSteal(false);
          setShowStealConfirm(false);
          setShowStealModal(false);
          setTimeout(() => setStealResult(null), 4000);
        } else if (msg.toId === currentParticipant?.id) {
          // Me robaron
          setCurrentScore(prev => Math.max(0, prev - (msg.amount || 50)));
          audioEngine.playEffect('sfx_steal_lost');
          setStealResult({ success: false, fromNickname: msg.fromNickname, toNickname: msg.toNickname, amount: msg.amount });
          setTimeout(() => setStealResult(null), 4000);
        } else {
          // Alguien más robó a otro
          audioEngine.playEffect('sfx_tick');
        }
        if (msg.participants) {
          const others = msg.participants
            .filter((p: any) => p.id !== currentParticipant?.id && p.score >= 50)
            .map((p: any) => ({ id: p.id, nickname: p.nickname, score: p.score }));
          setAvailablePlayers(others);
        }
      } else if (msg.type === 'LEADERBOARD') {
        setLeaderboardData(msg.rankings || []);
        setShowLeaderboard(true);
        audioEngine.playEffect('sfx_digital_coins');
        setTimeout(() => setShowLeaderboard(false), 7000);
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

    // Multiplicador de Super Poder + Ronda Dorada (2X) + Multiplicador de Pregunta
    const questionMultiplier = activeQuestion.pointsMultiplier || 1;
    const powerMultiplier = activePower?.type === 'double_points' ? 2 : 1;
    const goldenMultiplier = isGoldenRound ? 2 : 1;

    // Multiplicador de Racha de Fuego (+15%, +30%, +50%)
    const nextStreak = isCorrect ? streakCount + 1 : 0;
    const streakMultiplier = nextStreak >= 4 ? 1.5 : nextStreak === 3 ? 1.3 : nextStreak === 2 ? 1.15 : 1.0;

    const totalMultiplier = questionMultiplier * powerMultiplier * goldenMultiplier * streakMultiplier;
    const earned = isCorrect ? Math.floor((basePoints + timeBonus) * totalMultiplier) : 0;
    const nextScore = currentScore + earned;

    // Enviar al servidor local y P2P
    if (sessionId) {
      const sync = getOrCreateGameClientSync(sessionId);
      const participantId = currentParticipant?.id || 'p-self';
      const nickname = currentParticipant?.nickname || 'Estudiante';
      sync.submitAnswer({
        participantId,
        nickname,
        optionId,
        timeTaken,
        isCorrect,
        pointsEarned: earned,
        newScore: nextScore,
      });
    }

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setPointsGained(earned);
    if (isCorrect) {
      setCurrentScore((prev) => prev + earned);
      setStreakCount(nextStreak);
      if (nextStreak >= 2) {
        audioEngine.playEffect('sfx_streak');
      } else {
        audioEngine.playEffect('sfx_correct');
      }
    } else {
      setStreakCount(0);
      audioEngine.playEffect('sfx_wrong');
    }
  };

  // Activar Escudo Protector Anti-Robo (1 uso por partida)
  const handleActivateShield = () => {
    if (!shieldAvailable || isShieldActive || !sessionId || !currentParticipant) return;
    setShieldAvailable(false);
    setIsShieldActive(true);
    audioEngine.playEffect('sfx_shield_activate');
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 80, 40]);
    }
    const sync = getOrCreateGameClientSync(sessionId);
    sync.send({
      type: 'ACTIVATE_SHIELD',
      participantId: currentParticipant.id,
      nickname: currentParticipant.nickname,
    });
  };

  // Enviar Reacción de Emoji Flotante en Vivo
  const handleSendEmoji = (emoji: string) => {
    if (!sessionId) return;
    audioEngine.playEffect('sfx_emoji_pop');
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
    setLastSentEmoji(emoji);
    setTimeout(() => setLastSentEmoji(null), 1000);
    const sync = getOrCreateGameClientSync(sessionId);
    sync.send({
      type: 'LIVE_EMOJI',
      emoji,
      nickname: currentParticipant?.nickname || 'Estudiante',
    });
  };

  // Manejo del nuevo sistema de Robo de Puntos (máx 2 robos, 50 pts por robo)
  const handleOpenStealModal = () => {
    if (stealCount >= 2) return;
    audioEngine.playEffect('sfx_tick');
    setShowStealModal(true);
  };

  const handleSelectVictim = (player: { id: string; nickname: string; score: number }) => {
    audioEngine.playEffect('sfx_tick');
    setStealTarget(player);
    setShowStealModal(false);
    setShowStealConfirm(true);
  };

  const handleExecuteSteal = async () => {
    if (!stealTarget || isDoingSteal || !sessionId || !currentParticipant) return;
    if (stealCount >= 2) return;

    setIsDoingSteal(true);
    audioEngine.playEffect('sfx_tick');

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(80);
    }

    const sync = getOrCreateGameClientSync(sessionId);
    const result = await sync.requestSteal({
      fromId: currentParticipant.id,
      toId: stealTarget.id,
    });

    setIsDoingSteal(false);
    setShowStealConfirm(false);

    if (!result.success) {
      audioEngine.playEffect('sfx_wrong');
      setStealResult({
        success: false,
        error: result.error || 'No se pudo completar el robo de puntos',
      });
      setTimeout(() => setStealResult(null), 3500);
    }
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
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 p-1 shadow-md shrink-0 flex items-center justify-center">
            <MascotAvatar
              avatar={currentParticipant?.avatar}
              emotion={feedback === 'correct' ? 'happy' : feedback === 'incorrect' ? 'sad' : 'idle'}
              size="sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs leading-none">{currentParticipant?.nickname || 'Jugador'}</span>
              {streakCount >= 2 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-red-600 to-amber-500 text-white flex items-center gap-0.5 shadow-md shadow-red-500/30 animate-pulse">
                  <Flame className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                  <span>x{streakCount}</span>
                </span>
              )}
              {isShieldActive && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 flex items-center gap-0.5 animate-pulse">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>Blindado</span>
                </span>
              )}
            </div>
            <div className="text-[11px] text-yellow-400 font-extrabold mt-0.5">
              {currentScore.toLocaleString()} pts
            </div>
          </div>
        </div>

        {/* Control de Audio y Temporizador */}
        <div className="flex items-center gap-2">
          {/* Audio Slider Móvil — solo beeps */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                audioEngine.unlock();
                setShowVolSlider(!showVolSlider);
              }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/70"
              title="Volumen de sonidos"
            >
              {isSfxActive ? <Volume2 className="w-3.5 h-3.5 text-green-400" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
            </button>

            {showVolSlider && (
              <div className="absolute right-0 top-9 z-50 p-2.5 rounded-xl bg-slate-900 border border-purple-500/40 shadow-2xl w-40 space-y-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span>Sonido:</span>
                  <button
                    onClick={() => {
                      const next = audioEngine.toggleEffects();
                      setIsSfxActive(next);
                    }}
                    className="text-purple-300 font-bold"
                  >
                    {isSfxActive ? 'Mute' : 'Activar'}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={sfxVol}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setSfxVol(v);
                    audioEngine.setSfxVolume(v);
                  }}
                  className="w-full accent-purple-500"
                />
                <p className="text-[9px] text-white/40 text-center">Beeps al presionar</p>
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

      {/* ── Banner de Ronda Dorada 2X ── */}
      {isGoldenRound && (
        <div className="max-w-lg mx-auto w-full mb-2 animate-bounce-in">
          <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 text-xs font-black text-center flex items-center justify-center gap-2 shadow-xl shadow-yellow-400/30 animate-pulse border-2 border-yellow-200">
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>⭐ ¡RONDA DORADA! ESTA PREGUNTA VALE EL DOBLE DE PUNTOS (2X) ⭐</span>
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

        {/* ── Feedback cuando se acaba el tiempo sin responder ── */}
        {!isAnswerSubmitted && (timeLeft <= 0 || Boolean(revealedCorrectId)) && (
          <div className="mt-3 text-center animate-bounce-in">
            <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-200">
              <div className="flex items-center justify-center gap-2 font-black text-sm text-amber-300">
                <span className="text-xl">⏰</span>
                <span>¡SE ACABÓ EL TIEMPO!</span>
              </div>
              <p className="text-[11px] text-amber-100/80 mt-1">
                La presión del reloj te ganó en esta pregunta (+0 pts). ¡Concéntrate para la siguiente!
              </p>
            </div>
          </div>
        )}

        {/* ── Feedback de Respuesta Enviada ── */}
        {isAnswerSubmitted && (
          <div className="mt-3 text-center animate-bounce-in">
            {feedback === 'correct' ? (
              <div className="p-3 rounded-2xl bg-green-500/20 border border-green-500/40 text-green-300">
                <div className="my-1.5 flex justify-center">
                  <MascotAvatar avatar={currentParticipant?.avatar} emotion="celebrate" size="lg" />
                </div>
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
                <div className="my-1.5 flex justify-center">
                  <MascotAvatar avatar={currentParticipant?.avatar} emotion="sad" size="lg" />
                </div>
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
          </div>
        )}

        {/* ── BOTÓN ROBO DE PUNTOS CON CONTADOR (Máx 2 robos, 50 pts, Autorizado por Docente) ── */}
        <div className="mt-3">
          {stealCount >= 2 ? (
            <div className="w-full py-2.5 px-4 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold text-center flex items-center justify-center gap-2">
              <span>🗡️ Robos de puntos agotados (2/2 usados)</span>
            </div>
          ) : !isStealAuthorized ? (
            <div className="w-full py-2.5 px-4 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🔒</span>
                <span>Robo de Puntos</span>
              </div>
              <span className="text-[10px] text-yellow-400/80 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                Esperando autorización del Profe
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleOpenStealModal}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/40 border-2 border-yellow-300 flex items-center justify-between transition-transform active:scale-95 animate-pulse"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">⚡🗡️</span>
                <span>¡ROBAR PUNTOS! (50 pts)</span>
              </div>
              <span className="bg-black/30 px-2.5 py-1 rounded-full text-[10px] text-yellow-300 font-bold border border-white/20">
                {2 - stealCount} {2 - stealCount === 1 ? 'disponible' : 'disponibles'}
              </span>
            </button>
          )}
          {/* ── BOTÓN ESCUDO PROTECTOR ANTI-ROBO (1 uso por partida) ── */}
          <div className="mt-2.5">
            {isShieldActive ? (
              <div className="w-full py-2.5 px-3 rounded-2xl bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 font-black text-xs text-center flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 animate-pulse">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>🛡️ ¡ESCUDO ACTIVO! Tus puntos están blindados contra robos en esta ronda</span>
              </div>
            ) : shieldAvailable ? (
              <button
                type="button"
                onClick={handleActivateShield}
                className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 border border-cyan-300 hover:scale-[1.02] active:scale-95 transition-all"
                title="Protege tus puntos contra cualquier intento de robo de tus compañeros durante esta ronda"
              >
                <Shield className="w-4 h-4 fill-white" />
                <span>🛡️ Activar Escudo Protector (1 uso por partida)</span>
              </button>
            ) : (
              <div className="w-full py-1.5 px-3 rounded-xl bg-white/5 text-white/40 text-[10px] text-center">
                🛡️ Escudo Protector utilizado
              </div>
            )}
          </div>

          {/* ── BARRA DE REACCIONES DE EMOJIS EN VIVO (ESTILO KAHOOT) ── */}
          <div className="mt-4 pt-2 border-t border-white/10 flex items-center justify-center gap-2">
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest mr-1">Reaccionar:</span>
            {['❤️', '🔥', '😂', '👏', '🤯', '🎉'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSendEmoji(emoji)}
                className={`w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-125 text-lg flex items-center justify-center transition-transform shadow-sm ${
                  lastSentEmoji === emoji ? 'scale-125 ring-2 ring-yellow-400 bg-yellow-400/20' : ''
                }`}
                title={`Enviar reacción ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* ── MODAL 1: SELECCIÓN DE VÍCTIMA PARA ROBAR PUNTOS ── */}
      {showStealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-bounce-in">
          <div className="card max-w-sm w-full p-5 border-red-500/50 bg-slate-900 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <span>🗡️</span>
                <span>Elige a quién robarle</span>
              </h3>
              <button
                onClick={() => setShowStealModal(false)}
                className="text-white/40 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-yellow-300 text-left">
              Regla: Solo puedes robar a compañeros con 50 puntos o más. Se transferirán 50 pts a tu marcador.
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {availablePlayers.length === 0 ? (
                <div className="py-6 text-center text-white/50 text-xs">
                  No hay compañeros con 50 puntos o más en este momento.
                </div>
              ) : (
                availablePlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelectVictim(player)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-400 text-left transition-all group"
                  >
                    <span className="font-bold text-sm text-white group-hover:text-yellow-300">
                      {player.nickname}
                    </span>
                    <span className="text-yellow-400 font-extrabold text-sm">
                      {player.score.toLocaleString()} pts
                    </span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => setShowStealModal(false)}
              className="btn-secondary w-full py-2.5 rounded-xl text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CONFIRMACIÓN DEL ROBO DE 50 PUNTOS ── */}
      {showStealConfirm && stealTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-bounce-in">
          <div className="card max-w-sm w-full p-6 border-2 border-red-500 bg-gradient-to-b from-red-950/80 via-slate-900 to-slate-950 shadow-2xl text-center space-y-4">
            <div className="text-4xl animate-bounce">🗡️</div>
            <h3 className="font-black text-xl text-white">¿Confirmar Robo?</h3>
            <p className="text-sm text-white/80 leading-relaxed">
              Vas a robar <span className="text-yellow-400 font-black">50 puntos</span> a{' '}
              <span className="text-red-300 font-black">{stealTarget.nickname}</span>.
            </p>
            <p className="text-[10px] text-white/40">
              Esta operación es definitiva y descontará 1 oportunidad de tus 2 robos permitidos.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDoingSteal}
                onClick={() => {
                  setShowStealConfirm(false);
                  setStealTarget(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDoingSteal}
                onClick={handleExecuteSteal}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/40 border border-yellow-300 flex items-center justify-center gap-1.5"
              >
                {isDoingSteal ? 'Robando...' : '¡Confirmar Robo!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NOTIFICACIÓN TOAST VISUAL DE ROBO DE PUNTOS ── */}
      {stealResult && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4 animate-bounce-in">
          <div
            className={`p-3.5 rounded-2xl shadow-2xl border text-center text-xs font-black ${
              stealResult.success
                ? 'bg-emerald-600 text-white border-yellow-300 shadow-emerald-600/40'
                : stealResult.toNickname
                ? 'bg-rose-700 text-white border-rose-400 shadow-rose-700/40'
                : 'bg-red-900 text-red-200 border-red-500'
            }`}
          >
            {stealResult.success
              ? `🎉 ¡Robaste ${stealResult.amount || 50} pts a ${stealResult.toNickname}!`
              : stealResult.fromNickname && stealResult.toNickname
              ? `⚡ ${stealResult.fromNickname} te robó ${stealResult.amount || 50} pts`
              : `⚠️ ${stealResult.error || 'No se pudo realizar el robo'}`}
          </div>
        </div>
      )}

      {/* ── TABLA DE CLASIFICACIÓN TOP 7 POST-PREGUNTA EN MÓVIL ── */}
      {showLeaderboard && leaderboardData.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-bounce-in">
          <div className="w-full max-w-md p-4 rounded-3xl bg-slate-900/95 border border-purple-500/50 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-black text-xs text-yellow-400 flex items-center gap-1.5">
                🏆 CLASIFICACIÓN · TOP 7
              </span>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-[11px] text-white/50 hover:text-white px-2 py-0.5 rounded bg-white/5"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {leaderboardData.slice(0, 7).map((p, idx) => {
                const isMe = currentParticipant && p.id === currentParticipant.id;
                return (
                  <div
                    key={p.id || idx}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                      isMe
                        ? 'bg-purple-600/40 border border-purple-400 text-yellow-300 shadow-md'
                        : 'bg-white/5 border border-white/5 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] shrink-0 font-black">
                        #{idx + 1}
                      </span>
                      <span className="truncate">{p.nickname} {isMe ? '(Tú)' : ''}</span>
                    </div>
                    <span className="text-yellow-400 font-extrabold shrink-0">
                      {p.score.toLocaleString()} pts
                    </span>
                  </div>
                );
              })}
            </div>
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
