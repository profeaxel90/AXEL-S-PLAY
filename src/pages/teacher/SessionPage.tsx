import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { generateSessionToken, buildQRUrl, shareSessionLink } from '../../lib/qr';
import { GameHostSync, type GameEventMessage } from '../../lib/gameSync';
import { POWER_UPS } from '../../types';
import type { PowerUpType, Participant, Question } from '../../types';
import { SAMPLE_GAMES, SAMPLE_QUESTIONS_ROAD_SAFETY } from '../../data/mockGames';
import {
  Play, Pause, SkipForward, Square, Users, QrCode,
  Zap, Share2, RefreshCw, Trophy, Medal, Crown,
  ArrowLeft, CheckCircle2, Sparkles, BarChart3,
  Clock, Eye, Wifi, AlertCircle, Volume2, VolumeX
} from 'lucide-react';

const OPTION_STYLES = [
  {
    bg: 'bg-red-600 text-white',
    border: 'border-red-500',
    icon: '▲',
    symbolBg: 'bg-red-800/60',
  },
  {
    bg: 'bg-blue-600 text-white',
    border: 'border-blue-500',
    icon: '◆',
    symbolBg: 'bg-blue-800/60',
  },
  {
    bg: 'bg-amber-500 text-slate-950',
    border: 'border-amber-400',
    icon: '●',
    symbolBg: 'bg-amber-700/40 text-slate-950',
  },
  {
    bg: 'bg-emerald-600 text-white',
    border: 'border-emerald-500',
    icon: '■',
    symbolBg: 'bg-emerald-800/60',
  },
];

export default function SessionPage() {
  const { gameId } = useParams<{ gameId: string }>();

  // Token único para la partida
  const [token, setToken] = useState(() => generateSessionToken());

  // Detectar si el usuario está en localhost para permitirle usar su IP de red Wi-Fi
  const [useNetworkIp, setUseNetworkIp] = useState(() => {
    return typeof window !== 'undefined' && window.location.hostname === 'localhost';
  });

  const networkHost = '192.168.100.4:5173';
  const qrBaseUrl = useNetworkIp
    ? `http://${networkHost}`
    : typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:5173';

  const qrUrl = buildQRUrl(token, qrBaseUrl);

  // Preguntas del juego seleccionado
  const gameData = SAMPLE_GAMES[gameId || 'g-1'];
  const questions: Question[] = gameData?.questions || SAMPLE_QUESTIONS_ROAD_SAFETY;

  // Estado del juego
  const [gamePhase, setGamePhase] = useState<'waiting' | 'question' | 'finished'>('waiting');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timerLeft, setTimerLeft] = useState(20);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Participantes REALES conectados (100% reales, sin simulaciones ni suposiciones)
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  const [selectedStudentForPower, setSelectedStudentForPower] = useState<Participant | null>(null);
  const [powerModalOpen, setPowerModalOpen] = useState(false);
  const [globalPowerModalOpen, setGlobalPowerModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [globalPowerSuccess, setGlobalPowerSuccess] = useState<string | null>(null);
  const [isMusicActive, setIsMusicActive] = useState(() => audioEngine.getSettings().musicEnabled);

  const hostSyncRef = useRef<GameHostSync | null>(null);
  const currentQ = questions[currentQIndex] || questions[0];

  // ── Inicializar Motor de Sincronización en Tiempo Real (SSE Local + P2P) ──
  useEffect(() => {
    const hostSync = new GameHostSync(token);
    hostSyncRef.current = hostSync;

    hostSync.onEvent = (msg: GameEventMessage) => {
      console.log('[Teacher SessionPage] Evento recibido:', msg.type);

      if (msg.type === 'INIT' && msg.session) {
        if (msg.session.participants && msg.session.participants.length > 0) {
          setLiveParticipants(msg.session.participants);
        }
      } else if (msg.type === 'JOIN' && msg.participant) {
        setLiveParticipants((prev) => {
          const exists = prev.some((p) => p.id === msg.participant!.id || p.nickname === msg.participant!.nickname);
          if (exists) {
            return prev.map((p) => (p.nickname === msg.participant!.nickname ? { ...msg.participant!, isConnected: true } : p));
          }
          return [...prev, msg.participant!];
        });
        audioEngine.playEffect('sfx_join');
      } else if (msg.type === 'ANSWER') {
        setAnsweredCount((prev) => prev + 1);

        // Actualizar puntaje del estudiante real
        if (msg.participantId) {
          setLiveParticipants((prev) =>
            prev.map((p) => (p.id === msg.participantId ? { ...p, score: msg.newScore || p.score } : p))
          );
        }

        audioEngine.playEffect('sfx_tick');
      }
    };

    hostSync.init();

    return () => {
      hostSync.destroy();
    };
  }, [token]);

  // ── Temporizador de la pregunta ──
  useEffect(() => {
    if (gamePhase !== 'question' || isPaused || isAnswerRevealed) return;

    const interval = setInterval(() => {
      setTimerLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleRevealAnswer();
          return 0;
        }
        if (prev <= 5) {
          audioEngine.playEffect('sfx_countdown');
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gamePhase, isPaused, isAnswerRevealed]);

  // ── Audio según la fase ──
  useEffect(() => {
    if (gamePhase === 'finished') {
      audioEngine.setContext('podium');
    } else if (gamePhase === 'question') {
      audioEngine.setContext('question');
    } else {
      audioEngine.setContext('lobby');
    }
  }, [gamePhase]);

  // Participantes ordenados estrictamente por puntaje real
  const sortedParticipants = [...liveParticipants].sort((a, b) => b.score - a.score);
  const firstPlace = sortedParticipants[0];
  const secondPlace = sortedParticipants[1];
  const thirdPlace = sortedParticipants[2];

  // ── Acciones del Docente ──
  const handleStartGame = () => {
    if (liveParticipants.length === 0) return;

    setGamePhase('question');
    setCurrentQIndex(0);
    setIsAnswerRevealed(false);
    setAnsweredCount(0);
    const firstQ = questions[0];
    setTimerLeft(firstQ.timeLimit || 20);

    audioEngine.setContext('game_start');

    // Transmitir a todos los celulares
    hostSyncRef.current?.broadcast('START_GAME');
    hostSyncRef.current?.broadcast('QUESTION', {
      question: firstQ,
      index: 0,
      total: questions.length,
      timeLimit: firstQ.timeLimit || 20,
    });
  };

  const handleNextQuestion = () => {
    const nextIdx = currentQIndex + 1;
    if (nextIdx >= questions.length) {
      handleEndGame();
      return;
    }

    const nextQ = questions[nextIdx];
    setCurrentQIndex(nextIdx);
    setIsAnswerRevealed(false);
    setAnsweredCount(0);
    setTimerLeft(nextQ.timeLimit || 20);

    audioEngine.playEffect('sfx_round_change');

    hostSyncRef.current?.broadcast('QUESTION', {
      question: nextQ,
      index: nextIdx,
      total: questions.length,
      timeLimit: nextQ.timeLimit || 20,
    });
  };

  const handleRevealAnswer = () => {
    setIsAnswerRevealed(true);
    audioEngine.playEffect('sfx_correct');

    hostSyncRef.current?.broadcast('REVEAL_ANSWER', {
      correctOptionId: currentQ.correctAnswer as string,
      explanation: currentQ.explanation,
    });
  };

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false);
      hostSyncRef.current?.broadcast('RESUME');
    } else {
      setIsPaused(true);
      hostSyncRef.current?.broadcast('PAUSE');
    }
  };

  const handleEndGame = () => {
    setGamePhase('finished');
    audioEngine.setContext('podium');

    hostSyncRef.current?.broadcast('GAME_OVER', {
      rankings: sortedParticipants,
    });
  };

  const handleRegenerateQR = () => {
    const newToken = generateSessionToken();
    setToken(newToken);
    setLiveParticipants([]);
    audioEngine.playEffect('sfx_tick');
  };

  const handleShareLink = async () => {
    const shared = await shareSessionLink(qrUrl, 'Únete a AXEL PLAY');
    if (shared) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleApplyPowerToAll = (powerKey: PowerUpType) => {
    const power = POWER_UPS[powerKey];
    setGlobalPowerSuccess(`¡⚡ ${power.label} activado para TODOS los estudiantes!`);
    setGlobalPowerModalOpen(false);

    audioEngine.playEffect('sfx_power_assigned');

    hostSyncRef.current?.broadcast('POWER', { power });

    setLiveParticipants((prev) =>
      prev.map((p) => ({ ...p, activePower: power }))
    );

    setTimeout(() => setGlobalPowerSuccess(null), 4000);
  };

  const handleApplyPowerIndividual = (powerKey: PowerUpType) => {
    if (!selectedStudentForPower) return;
    const power = POWER_UPS[powerKey];
    setPowerModalOpen(false);

    audioEngine.playEffect('sfx_power_assigned');

    hostSyncRef.current?.broadcast('POWER', {
      power,
      targetId: selectedStudentForPower.id,
    });

    setLiveParticipants((prev) =>
      prev.map((p) => (p.id === selectedStudentForPower.id ? { ...p, activePower: power } : p))
    );
  };

  return (
    <div className="space-y-6 select-none">
      {/* ── Top Bar de Control Docente ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/teacher/games"
            className="p-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={`badge ${
                gamePhase === 'finished' ? 'badge-warning' : gamePhase === 'question' ? 'badge-success' : 'badge-primary'
              } text-[10px]`}>
                {gamePhase === 'finished' ? 'PARTIDA FINALIZADA' : gamePhase === 'question' ? 'EN VIVO' : 'SALA DE ESPERA'}
              </span>
              <span className="text-white/40 text-xs">Juego: {gameData?.title || 'Seguridad Vial'}</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              {gamePhase === 'finished' ? '🏆 Gran Podio de Ganadores' : gamePhase === 'question' ? `Pregunta ${currentQIndex + 1} de ${questions.length}` : 'Partida en Tiempo Real'}
            </h1>
          </div>
        </div>

        {/* Botones de Control de la Sesión */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* BOTÓN MÚSICA ON / OFF */}
          <button
            type="button"
            onClick={() => {
              audioEngine.unlock();
              const active = audioEngine.toggleMusic();
              setIsMusicActive(active);
              if (active) {
                audioEngine.setContext(gamePhase === 'finished' ? 'podium' : gamePhase === 'question' ? 'question' : 'lobby');
              }
            }}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isMusicActive
                ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/30 shadow-md shadow-purple-600/20'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
            }`}
            title="Activar o Silenciar Música de Fondo"
          >
            {isMusicActive ? <Volume2 className="w-4 h-4 text-green-400 animate-pulse" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            <span>{isMusicActive ? 'Música: ON' : 'Música: Mute'}</span>
          </button>

          {/* BOTÓN PODER PARA TODOS (Solo si hay alumnos conectados) */}
          {gamePhase !== 'finished' && liveParticipants.length > 0 && (
            <button
              onClick={() => setGlobalPowerModalOpen(true)}
              className="btn-primary py-2.5 px-4 rounded-xl text-xs font-black flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 border border-yellow-400/40 shadow-lg shadow-yellow-500/20 text-slate-950 hover:scale-105 transition-transform"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>⚡ Poder para TODOS</span>
            </button>
          )}

          {gamePhase === 'waiting' && (
            <button
              onClick={handleStartGame}
              disabled={liveParticipants.length === 0}
              className={`py-2.5 px-6 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg transition-all ${
                liveParticipants.length > 0
                  ? 'btn-success shadow-green-600/30 hover:scale-105 cursor-pointer'
                  : 'bg-white/10 text-white/40 border border-white/10 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {liveParticipants.length > 0
                  ? `INICIAR PARTIDA (${liveParticipants.length} ${liveParticipants.length === 1 ? 'alumno' : 'alumnos'})`
                  : 'Esperando que se una al menos 1 alumno...'}
              </span>
            </button>
          )}

          {gamePhase === 'question' && (
            <>
              <button
                onClick={handlePauseResume}
                className="btn-secondary py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {isPaused ? <Play className="w-4 h-4 text-green-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
              </button>

              {!isAnswerRevealed ? (
                <button
                  onClick={handleRevealAnswer}
                  className="btn-primary py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500"
                >
                  <Eye className="w-4 h-4" />
                  <span>Revelar Respuesta</span>
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="btn-primary py-2 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-purple-600/30 animate-bounce-in"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>{currentQIndex + 1 < questions.length ? 'Siguiente Pregunta' : 'Ver Podio Olímpico'}</span>
                </button>
              )}

              <button
                onClick={handleEndGame}
                className="btn-danger py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5"
                title="Terminar la partida y mostrar ganadores"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Terminar</span>
              </button>
            </>
          )}

          {gamePhase === 'finished' && (
            <Link
              to="/teacher/analytics"
              className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Ver Reporte Pedagógico</span>
            </Link>
          )}
        </div>
      </div>

      {/* Banner de Poder Global Activado */}
      {globalPowerSuccess && (
        <div className="card p-4 border-yellow-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 text-yellow-300 font-black text-sm flex items-center justify-center gap-3 animate-bounce-in shadow-xl shadow-yellow-500/20">
          <Zap className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          <span>{globalPowerSuccess}</span>
          <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
        </div>
      )}

      {/* ── FASE 1: SALA DE ESPERA CON CÓDIGO QR GIGANTE ── */}
      {gamePhase === 'waiting' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: QR Grande Proyectable */}
          <div className="card p-8 border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-slate-900 text-center flex flex-col items-center justify-between shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold mb-3">
                <QrCode className="w-4 h-4 text-yellow-400" />
                <span>ACCESO EXCLUSIVO CON CÁMARA</span>
              </div>
              <h2 className="text-xl font-black text-white mb-1">
                Escanea con tu celular para unirte
              </h2>
              <p className="text-white/60 text-xs mb-4">
                Abre la cámara normal de tu teléfono móvil y apunta al código.
              </p>
            </div>

            {/* Canvas QR */}
            <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-purple-600/40 border-4 border-purple-500/60 my-2">
              <QRCodeSVG
                value={qrUrl}
                size={230}
                level="H"
                includeMargin={false}
                fgColor="#1e1b4b"
              />
            </div>

            <div className="w-full mt-4 space-y-3">
              {/* Enlace actual del QR */}
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 font-mono truncate">
                {qrUrl}
              </div>

              {/* Botones de enlace y regeneración */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleShareLink}
                  className="btn-secondary py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copyFeedback ? '¡Copiado!' : 'Copiar Enlace'}</span>
                </button>

                <button
                  onClick={handleRegenerateQR}
                  className="btn-secondary py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Nuevo QR</span>
                </button>
              </div>

              {/* Selector de IP de red para pruebas Wi-Fi */}
              <div className="pt-2 border-t border-white/10 text-left">
                <button
                  type="button"
                  onClick={() => setUseNetworkIp(!useNetworkIp)}
                  className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1.5 w-full justify-between"
                >
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3.5 h-3.5 text-green-400" />
                    <span>IP Red Wi-Fi ({networkHost}):</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    useNetworkIp ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/10 text-white/50'
                  }`}>
                    {useNetworkIp ? 'ACTIVADA' : 'USAR LOCAL'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Participantes Conectados REALES */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5 border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Estudiantes Conectados ({liveParticipants.length})
                  </h3>
                  <p className="text-white/50 text-xs">
                    {liveParticipants.length === 0
                      ? 'Nadie se ha unido aún. Los estudiantes aparecerán aquí conforme escaneen el QR.'
                      : 'Toca en cualquier alumno para darle un poder individual o dale a TODOS ⚡'}
                  </p>
                </div>
              </div>
            </div>

            {/* Grid de Participantes REALES */}
            {liveParticipants.length === 0 ? (
              <div className="card p-12 border-dashed border-white/15 text-center flex flex-col items-center justify-center bg-white/[0.01]">
                <div className="w-16 h-16 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
                  <QrCode className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">
                  Esperando a los estudiantes...
                </h4>
                <p className="text-white/50 text-xs max-w-sm mb-4">
                  Apunta tu teléfono móvil al código QR de la izquierda para unirte a la partida. Tu avatar y apodo aparecerán aquí al instante.
                </p>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                  <span>Sala lista para recibir conexiones</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {liveParticipants.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedStudentForPower(p);
                      setPowerModalOpen(true);
                    }}
                    className="card p-3 border-white/10 hover:border-purple-500/50 bg-white/[0.04] hover:bg-purple-600/10 cursor-pointer transition-all duration-200 flex flex-col items-center text-center relative group animate-bounce-in"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 p-1 mb-2 group-hover:scale-105 transition-transform">
                      <img src={p.avatar} alt={p.nickname} className="w-full h-full object-contain" />
                    </div>

                    <div className="font-bold text-xs text-white truncate max-w-full">
                      {p.nickname}
                    </div>

                    <div className="text-[10px] text-purple-300 font-semibold mt-0.5">
                      {p.score} pts
                    </div>

                    {p.activePower && (
                      <div className="mt-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 flex items-center gap-1">
                        <span>{p.activePower.icon}</span>
                        <span>{p.activePower.label}</span>
                      </div>
                    )}

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="p-1 rounded-md bg-yellow-400 text-slate-950 font-black text-[10px] flex items-center shadow-md">
                        <Zap className="w-3 h-3 fill-slate-950" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── FASE 2: PREGUNTA EN PANTALLA GIGANTE (PROYECTOR ESTILO KAHOOT) ── */}
      {gamePhase === 'question' && (
        <div className="space-y-6">
          {/* Header de Pregunta en Proyector */}
          <div className="card p-6 border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 text-center relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3.5 py-1 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 font-black text-xs uppercase tracking-wider">
                Pregunta {currentQIndex + 1} de {questions.length}
              </span>

              {/* Contador de Respuestas Reales Recibidas */}
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-white">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Respuestas: {answeredCount} / {liveParticipants.length}</span>
              </div>

              {/* Timer Circular / Badge */}
              <div className={`px-4 py-1.5 rounded-full border font-black text-sm flex items-center gap-2 ${
                timerLeft <= 5
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                  : 'bg-white/10 border-white/20 text-white'
              }`}>
                <Clock className="w-4 h-4" />
                <span>{timerLeft} segundos</span>
              </div>
            </div>

            {/* Texto de la Pregunta en Tamaño Gigante */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight max-w-4xl mx-auto py-4">
              {currentQ.content}
            </h2>

            {/* Barra de progreso de tiempo */}
            <div className="w-full bg-white/10 rounded-full h-2 mt-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  timerLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-400'
                }`}
                style={{ width: `${(timerLeft / (currentQ.timeLimit || 20)) * 100}%` }}
              />
            </div>
          </div>

          {/* 4 Opciones en Proyector Gigante */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(currentQ.options || []).map((option, idx) => {
              const style = OPTION_STYLES[idx % OPTION_STYLES.length];
              const isCorrect = currentQ.correctAnswer === option.id;

              return (
                <div
                  key={option.id}
                  className={`p-6 rounded-3xl border-3 transition-all flex items-center gap-4 relative shadow-xl ${
                    isAnswerRevealed
                      ? isCorrect
                        ? 'bg-emerald-600 border-yellow-400 text-white scale-[1.02] shadow-emerald-500/50 ring-4 ring-yellow-400'
                        : 'opacity-30 bg-slate-900 border-white/10'
                      : `${style.bg} ${style.border}`
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 ${style.symbolBg}`}>
                    {style.icon}
                  </div>

                  <span className="text-xl md:text-2xl font-black leading-snug flex-1">
                    {option.text}
                  </span>

                  {isAnswerRevealed && isCorrect && (
                    <CheckCircle2 className="w-8 h-8 text-yellow-300 shrink-0 animate-bounce" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Explicación pedagógica mostrada al revelar */}
          {isAnswerRevealed && currentQ.explanation && (
            <div className="card p-5 border-emerald-500/40 bg-emerald-950/20 text-emerald-200 text-sm flex items-start gap-3 animate-bounce-in">
              <Sparkles className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white text-base block mb-0.5">Explicación Pedagógica:</strong>
                <span>{currentQ.explanation}</span>
              </div>
            </div>
          )}

          {/* Posiciones de los alumnos reales en vivo */}
          {liveParticipants.length > 0 && (
            <div className="card p-4 border-white/10">
              <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">
                Posiciones en Tiempo Real ({liveParticipants.length})
              </h4>
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {sortedParticipants.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 shrink-0"
                  >
                    <span className="font-black text-xs text-purple-400">#{i + 1}</span>
                    <img src={p.avatar} alt={p.nickname} className="w-6 h-6" />
                    <span className="text-xs font-bold text-white">{p.nickname}</span>
                    <span className="text-xs font-extrabold text-yellow-400">{p.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FASE 3: GRAN PODIO OLÍMPICO DE GANADORES REALES ── */}
      {gamePhase === 'finished' && (
        <div className="space-y-8 animate-bounce-in">
          <div className="card border-purple-500/30 p-8 text-center relative overflow-hidden bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 shadow-2xl">
            <div className="mb-4">
              <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-2 animate-bounce" />
              <h2 className="text-3xl sm:text-4xl font-black text-white">¡Gran Podio Olímpico!</h2>
              <p className="text-purple-300 font-bold text-sm mt-1">
                Resultados finales de los participantes que compitieron en la sala
              </p>
            </div>

            {/* Estructura del Podio de Jugadores REALES */}
            {liveParticipants.length === 0 ? (
              <div className="p-8 text-white/50 text-sm">
                No hubo participantes registrados en esta partida.
              </div>
            ) : (
              <div className="flex items-end justify-center gap-4 max-w-2xl mx-auto my-8 pt-8">
                {/* 🥈 2do Lugar (Izquierda, solo si hay al menos 2 jugadores) */}
                {secondPlace && (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-3xl bg-slate-400/20 p-1.5 border-2 border-slate-300/40 mb-2 shadow-lg">
                      <img src={secondPlace.avatar} alt={secondPlace.nickname} className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-sm text-white truncate max-w-full">{secondPlace.nickname}</span>
                    <span className="text-xs text-slate-300 font-extrabold mb-2">{secondPlace.score.toLocaleString()} pts</span>
                    <div className="w-full h-32 rounded-t-2xl bg-gradient-to-t from-slate-600/40 to-slate-400/30 border-t-4 border-slate-300 flex flex-col items-center justify-center shadow-xl">
                      <Medal className="w-8 h-8 text-slate-300 mb-1" />
                      <span className="font-black text-3xl text-slate-300">2°</span>
                    </div>
                  </div>
                )}

                {/* 🥇 1er Lugar (Centro - Más Alto) */}
                {firstPlace && (
                  <div className="flex-1 flex flex-col items-center -mt-8">
                    <div className="w-24 h-24 rounded-3xl bg-yellow-400/30 p-2 border-4 border-yellow-400 shadow-2xl shadow-yellow-500/50 mb-2 animate-float">
                      <img src={firstPlace.avatar} alt={firstPlace.nickname} className="w-full h-full object-contain" />
                    </div>
                    <span className="font-black text-base text-yellow-300 truncate max-w-full">{firstPlace.nickname}</span>
                    <span className="text-sm text-yellow-400 font-black mb-2">{firstPlace.score.toLocaleString()} pts</span>
                    <div className="w-full h-44 rounded-t-3xl bg-gradient-to-t from-yellow-600/50 to-yellow-400/40 border-t-4 border-yellow-400 flex flex-col items-center justify-center shadow-2xl shadow-yellow-500/40">
                      <Trophy className="w-12 h-12 text-yellow-400 mb-1 animate-pulse" />
                      <span className="font-black text-4xl text-yellow-400">1°</span>
                      <span className="text-[10px] font-black text-yellow-300 uppercase tracking-wider">CAMPEÓN</span>
                    </div>
                  </div>
                )}

                {/* 🥉 3er Lugar (Derecha, solo si hay al menos 3 jugadores) */}
                {thirdPlace && (
                  <div className="flex-1 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-3xl bg-amber-700/20 p-1.5 border-2 border-amber-600/40 mb-2 shadow-md">
                      <img src={thirdPlace.avatar} alt={thirdPlace.nickname} className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-sm text-white truncate max-w-full">{thirdPlace.nickname}</span>
                    <span className="text-xs text-amber-400 font-extrabold mb-2">{thirdPlace.score.toLocaleString()} pts</span>
                    <div className="w-full h-24 rounded-t-2xl bg-gradient-to-t from-amber-800/40 to-amber-700/30 border-t-4 border-amber-600 flex flex-col items-center justify-center shadow-lg">
                      <Medal className="w-7 h-7 text-amber-400 mb-1" />
                      <span className="font-black text-2xl text-amber-400">3°</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Acciones Finales */}
            <div className="flex items-center justify-center gap-3 pt-6 border-t border-white/10">
              <Link
                to="/teacher/analytics"
                className="btn-primary py-3 px-6 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Exportar Informe a Excel y PDF</span>
              </Link>

              <button
                onClick={() => {
                  setGamePhase('waiting');
                  setLiveParticipants([]);
                  setToken(generateSessionToken());
                  hostSyncRef.current?.resetSession();
                }}
                className="btn-secondary py-3 px-5 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Nueva Partida</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: OTORGAR PODER INDIVIDUAL ── */}
      {powerModalOpen && selectedStudentForPower && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="card max-w-md w-full border-purple-500/40 p-6 shadow-2xl relative">
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="text-xl font-black text-white">
                Otorgar Super Poder a <span className="text-purple-400">{selectedStudentForPower.nickname}</span>
              </h3>
              <p className="text-white/60 text-xs mt-1">
                Selecciona la ventaja que recibirá en su pantalla para la partida:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1 mb-5">
              {(Object.keys(POWER_UPS) as PowerUpType[]).map((key) => {
                const p = POWER_UPS[key];
                return (
                  <button
                    key={key}
                    onClick={() => handleApplyPowerIndividual(key)}
                    className="p-3 rounded-xl border border-white/10 hover:border-yellow-400 bg-white/5 hover:bg-yellow-400/10 text-left transition-all flex items-center gap-2.5 group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{p.icon}</span>
                    <div>
                      <div className="font-bold text-xs text-white group-hover:text-yellow-300">{p.label}</div>
                      <div className="text-[10px] text-white/50 line-clamp-1">{p.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPowerModalOpen(false)}
              className="btn-secondary w-full py-2.5 rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: OTORGAR PODER A TODOS LOS PARTICIPANTES ── */}
      {globalPowerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="card max-w-lg w-full border-yellow-400/50 p-6 shadow-2xl shadow-yellow-500/20 relative">
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center mx-auto mb-2 text-3xl">
                ⚡
              </div>
              <h3 className="text-2xl font-black text-white">
                Activar Super Poder para <span className="text-yellow-400">TODOS</span>
              </h3>
              <p className="text-white/60 text-xs mt-1">
                Este poder se activará instantáneamente en la pantalla de cada estudiante en la sala:
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1 mb-6">
              {(Object.keys(POWER_UPS) as PowerUpType[]).map((key) => {
                const p = POWER_UPS[key];
                return (
                  <button
                    key={key}
                    onClick={() => handleApplyPowerToAll(key)}
                    className="p-3.5 rounded-xl border border-white/10 hover:border-yellow-400 bg-white/5 hover:bg-yellow-400/10 text-left transition-all flex items-center gap-3 group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">{p.icon}</span>
                    <div>
                      <div className="font-black text-xs text-white group-hover:text-yellow-300">{p.label}</div>
                      <div className="text-[10px] text-white/60 line-clamp-2">{p.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setGlobalPowerModalOpen(false)}
              className="btn-secondary w-full py-2.5 rounded-xl text-xs font-bold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
