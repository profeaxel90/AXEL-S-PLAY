import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { P2PClient } from '../../lib/p2p';
import {
  Zap, Clock, Heart, Award, CheckCircle2, XCircle,
  HelpCircle, Shield, AlertTriangle
} from 'lucide-react';
import type { QuestionOption } from '../../types';

export default function GameStudentPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    session,
    currentQuestion,
    currentParticipant,
    questionIndex,
    phase,
    submitAnswer,
    usePower,
  } = useSessionStore();

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [pointsGained, setPointsGained] = useState<number | null>(null);

  // Vidas para modo supervivencia
  const [lives, setLives] = useState(3);

  // Efecto del poder activo
  const activePower = currentParticipant?.activePower;

  // Carga y temporizador de la pregunta
  useEffect(() => {
    if (!currentQuestion) return;

    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setFeedback(null);
    setPointsGained(null);

    const initialTime = currentQuestion.timeLimit || 20;
    setTimeLeft(initialTime);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        if (prev <= 5) {
          audioEngine.playEffect('sfx_countdown');
        } else {
          audioEngine.playEffect('sfx_tick');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestion]);

  // Si la sesión finaliza, redirigir a resultados
  useEffect(() => {
    if (phase === 'finished' && sessionId) {
      navigate(`/results/${sessionId}`);
    }
  }, [phase, sessionId, navigate]);

  // Conexión P2P para recibir poderes y fin de juego en tiempo real
  useEffect(() => {
    let client: P2PClient | null = null;
    if (sessionId && currentParticipant) {
      client = new P2PClient(sessionId);
      client.connect(currentParticipant);
      client.onMessage = (msg) => {
        if (msg.type === 'POWER') {
          if (!msg.targetId || msg.targetId === currentParticipant.id) {
            useSessionStore.setState((state) => ({
              currentParticipant: state.currentParticipant
                ? { ...state.currentParticipant, activePower: msg.power }
                : null,
            }));
            audioEngine.setContext('power_up');
          }
        } else if (msg.type === 'GAME_OVER') {
          navigate(`/results/${sessionId}`);
        }
      };
    }

    return () => {
      client?.destroy();
    };
  }, [sessionId, currentParticipant, navigate]);

  // Manejo de envío de respuesta
  const handleSelectAnswer = async (optionId: string) => {
    if (isAnswerSubmitted || timeLeft <= 0 || !currentQuestion) return;

    setSelectedOption(optionId);
    setIsAnswerSubmitted(true);

    const timeTaken = (currentQuestion.timeLimit || 20) - timeLeft;

    // Comprobar acierto local o servidor
    const isCorrect = Array.isArray(currentQuestion.correctAnswer)
      ? (currentQuestion.correctAnswer as unknown[]).includes(optionId)
      : (currentQuestion.correctAnswer as unknown) === optionId;

    if (isCorrect) {
      const basePoints = currentQuestion.points || 1000;
      // Bonus por tiempo
      const timeBonus = Math.floor((timeLeft / (currentQuestion.timeLimit || 20)) * 500);
      const mult = activePower?.type === 'double_points' ? 2 : 1;
      const totalPoints = (basePoints + timeBonus) * mult;

      setPointsGained(totalPoints);
      setFeedback('correct');
      audioEngine.playEffect('sfx_correct');
    } else {
      // Si tiene escudo activo, no pierde vidas ni recibe penalización
      if (activePower?.type === 'shield') {
        setFeedback('correct');
        setPointsGained(0);
      } else {
        setFeedback('incorrect');
        setPointsGained(0);
        audioEngine.playEffect('sfx_incorrect');
        if (lives > 0) setLives((l) => l - 1);
      }
    }

    // Consumir el poder si vence al terminar la pregunta
    if (activePower?.expiresAfterQuestion) {
      await usePower(activePower.type);
    }

    try {
      await submitAnswer(currentQuestion.id, optionId, timeTaken);
    } catch {
      // Ignorar en demo
    }
  };

  // Pregunta por defecto si estamos en modo prueba sin backend
  const displayQuestion = currentQuestion || {
    id: 'mock-q1',
    content: '¿Cuál es la función principal de la señalización vial de color rojo?',
    type: 'single_choice' as const,
    timeLimit: 20,
    points: 1000,
    difficulty: 'medium' as const,
    orderIndex: 0,
    teacherId: 'teacher-1',
    createdAt: new Date().toISOString(),
    correctAnswer: 'opt-1',
    explanation: 'El color rojo en las señales de tránsito indica prohibición, parada obligatoria o peligro inmediato.',
    options: [
      { id: 'opt-1', text: 'Indica prohibición o parada obligatoria' },
      { id: 'opt-2', text: 'Indica una recomendación turística' },
      { id: 'opt-3', text: 'Indica información de kilometraje' },
      { id: 'opt-4', text: 'Indica zonas de descanso' },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-6 select-none">
      {/* ── Top Bar con HUD del Jugador ── */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full mb-4">
        {/* Jugador info */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 p-1">
            <img
              src={currentParticipant?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ProfeAxel'}
              alt="Avatar"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="font-bold text-sm leading-none">{currentParticipant?.nickname || 'Jugador'}</div>
            <div className="text-[11px] text-purple-300 font-semibold mt-0.5">
              {currentParticipant?.score || 0} pts
            </div>
          </div>
        </div>

        {/* HUD Vidas (Modo Supervivencia) */}
        {session?.game?.gameMode === 'survival' && (
          <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 px-3 py-1.5 rounded-full">
            {[...Array(3)].map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${i < lives ? 'text-red-500 fill-red-500' : 'text-white/20'}`}
              />
            ))}
          </div>
        )}

        {/* Timer */}
        <div className="flex items-center gap-2">
          <div className={`px-4 py-1.5 rounded-full border font-black text-sm flex items-center gap-1.5 ${
            timeLeft <= 5
              ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
              : 'bg-white/10 border-white/20 text-white'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{timeLeft}s</span>
          </div>
        </div>
      </header>

      {/* ── Poder Especial del Docente (Si está activo) ── */}
      {activePower && (
        <div className="max-w-md mx-auto w-full mb-4 animate-bounce-in">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-between text-amber-300 shadow-lg shadow-amber-500/20">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{activePower.icon}</span>
              <div>
                <p className="font-bold text-xs uppercase tracking-wider">{activePower.label} ACTIVO</p>
                <p className="text-[11px] text-amber-200/80">{activePower.description}</p>
              </div>
            </div>
            <span className="text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-md">
              DOCENTE
            </span>
          </div>
        </div>
      )}

      {/* ── Pregunta Principal ── */}
      <main className="max-w-2xl mx-auto w-full my-auto text-center py-4">
        <div className="mb-2 text-xs font-bold text-purple-400 uppercase tracking-widest">
          Pregunta {questionIndex + 1}
        </div>
        <h1 className="text-xl md:text-3xl font-black mb-6 leading-tight text-white drop-shadow-md">
          {displayQuestion.content}
        </h1>

        {displayQuestion.imageUrl && (
          <div className="mb-6 max-w-sm mx-auto rounded-2xl overflow-hidden border border-white/20 shadow-xl">
            <img src={displayQuestion.imageUrl} alt="Pregunta visual" className="w-full object-cover max-h-56" />
          </div>
        )}

        {/* ── Opciones de Respuesta ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl mx-auto">
          {displayQuestion.options?.map((option: QuestionOption, idx: number) => {
            const isSelected = selectedOption === option.id;
            const letters = ['A', 'B', 'C', 'D'];
            const colors = [
              'hover:border-red-400 bg-red-500/10 border-red-500/30',
              'hover:border-blue-400 bg-blue-500/10 border-blue-500/30',
              'hover:border-yellow-400 bg-yellow-500/10 border-yellow-500/30',
              'hover:border-green-400 bg-green-500/10 border-green-500/30',
            ];

            return (
              <button
                key={option.id}
                disabled={isAnswerSubmitted || timeLeft <= 0}
                onClick={() => handleSelectAnswer(option.id)}
                className={`p-4 rounded-2xl border-2 text-left font-bold transition-all relative overflow-hidden flex items-center gap-3 ${
                  isSelected
                    ? 'border-purple-400 bg-purple-600/30 scale-102 shadow-lg shadow-purple-600/30'
                    : colors[idx % colors.length]
                } ${isAnswerSubmitted && !isSelected ? 'opacity-40' : ''}`}
              >
                <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-sm flex-shrink-0">
                  {letters[idx]}
                </div>
                <span className="text-sm md:text-base">{option.text}</span>
              </button>
            );
          })}
        </div>

        {/* ── Feedback Inmediato al Responder ── */}
        {feedback && (
          <div className="mt-6 animate-bounce-in max-w-md mx-auto">
            {feedback === 'correct' ? (
              <div className="p-4 rounded-2xl bg-green-500/20 border border-green-500/40 text-green-300 flex items-center justify-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-black text-lg text-white">¡RESPUESTA CORRECTA!</p>
                  <p className="text-xs text-green-200">+{pointsGained} puntos obtenidos</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 flex items-center justify-center gap-3">
                <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-black text-lg text-white">¡INCORRECTO!</p>
                  <p className="text-xs text-red-200">{displayQuestion.explanation || 'Sigue intentándolo en la próxima'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Bottom Info ── */}
      <footer className="text-center text-xs text-white/40 py-2">
        {isAnswerSubmitted
          ? 'Respuesta registrada. Esperando a los demás participantes...'
          : 'Selecciona una respuesta antes de que se agote el tiempo.'}
      </footer>
    </div>
  );
}
