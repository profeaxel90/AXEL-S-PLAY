import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
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
  Clock, Eye, Wifi, Globe, Sliders, Music, Radio,
  Volume2, VolumeX, ShieldAlert, Award, Image as ImageIcon
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

  // Modos de Red: Vercel en la Nube, Túnel Público (4G/5G), Wi-Fi Local, o Localhost
  const [connectionMode, setConnectionMode] = useState<'vercel' | 'tunnel' | 'wifi' | 'local'>('vercel');
  const [vercelUrl, setVercelUrl] = useState('https://axel-s-play.vercel.app');
  const [tunnelUrl, setTunnelUrl] = useState('https://38d66d79308353.lhr.life');
  const [wifiHost, setWifiHost] = useState('192.168.100.4:5173');
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  // Consultar túnel activo del servidor local
  useEffect(() => {
    fetch('/api/tunnel')
      .then((res) => res.json())
      .then((data) => {
        if (data.tunnelUrl) setTunnelUrl(data.tunnelUrl);
      })
      .catch(() => {});
  }, []);

  const qrBaseUrl =
    connectionMode === 'vercel'
      ? vercelUrl
      : connectionMode === 'tunnel'
      ? tunnelUrl
      : connectionMode === 'wifi'
      ? `http://${wifiHost}`
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:5173';

  const qrUrl = buildQRUrl(token, qrBaseUrl);

  // Preguntas del juego seleccionado
  const gameData = SAMPLE_GAMES[gameId || 'g-1'];
  const questions: Question[] = gameData?.questions || SAMPLE_QUESTIONS_ROAD_SAFETY;

  // Estado del juego
  const [gamePhase, setGamePhase] = useState<'waiting' | 'intro' | 'question' | 'finished'>('waiting');
  const [introCountdown, setIntroCountdown] = useState(6);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timerLeft, setTimerLeft] = useState(20);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Participantes REALES conectados (100% reales)
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  const [selectedStudentForPower, setSelectedStudentForPower] = useState<Participant | null>(null);
  const [powerModalOpen, setPowerModalOpen] = useState(false);
  const [globalPowerModalOpen, setGlobalPowerModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [globalPowerSuccess, setGlobalPowerSuccess] = useState<string | null>(null);

  // Audio & Sonido
  const [isMusicActive, setIsMusicActive] = useState(() => audioEngine.getSettings().musicEnabled);
  const [musicVolume, setMusicVolume] = useState(() => audioEngine.getSettings().musicVolume ?? 0.75);
  const [effectsVolume, setEffectsVolume] = useState(() => audioEngine.getSettings().effectsVolume ?? 0.85);
  const [selectedTrack, setSelectedTrack] = useState<'lobby' | 'question' | 'suspense' | 'podium'>('lobby');
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);

  // Audio personalizado (archivo subido por el docente)
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [customIsPlaying, setCustomIsPlaying] = useState(false);

  // Leaderboard después de revelar respuesta (Top 7)
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  // Secuencia animada del Podio (1=3er, 2=2do, 3=1er con confeti, 4=finalizado)
  const [podiumStep, setPodiumStep] = useState(0);
  const [podiumConfetti, setPodiumConfetti] = useState(false);

  // Robo de Puntos
  const [stealBanner, setStealBanner] = useState<string | null>(null);
  const [stealWinnerBanner, setStealWinnerBanner] = useState<string | null>(null);

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
        setAnsweredCount((prev) => {
          const nextCount = prev + 1;

          // REVELACIÓN AUTOMÁTICA CUANDO TODOS RESPONDEN
          setLiveParticipants((currParticipants) => {
            if (currParticipants.length > 0 && nextCount >= currParticipants.length) {
              setTimeout(() => {
                handleRevealAnswer();
              }, 300);
            }
            return currParticipants;
          });

          return nextCount;
        });

        // Actualizar puntaje del estudiante real
        if (msg.participantId) {
          setLiveParticipants((prev) =>
            prev.map((p) => (p.id === msg.participantId ? { ...p, score: msg.newScore || p.score } : p))
          );
        }

        audioEngine.playEffect('sfx_tick');
      } else if (msg.type === 'STEAL_RESULT') {
        if (msg.success) {
          setStealWinnerBanner(`🗡️ ¡${msg.fromNickname} robó 50 puntos a ${msg.toNickname}!`);
          audioEngine.playEffect('sfx_steal_alert');
          setTimeout(() => setStealWinnerBanner(null), 5000);
          if (msg.participants) {
            setLiveParticipants(msg.participants);
          }
        }
      } else if (msg.type === 'LEADERBOARD') {
        if (msg.rankings) {
          setLeaderboardData(msg.rankings);
          setShowLeaderboard(true);
        }
      } else if (msg.type === 'STEAL_POINTS_CLAIMED') {
        // Soporte retrocompatible
        if (msg.winnerNickname) {
          setStealBanner(null);
          setStealWinnerBanner(`¡⚡ ${msg.winnerNickname} robó +${msg.amount || 50} puntos!`);
          audioEngine.playEffect('sfx_steal_win');
          setTimeout(() => setStealWinnerBanner(null), 5000);
        }
        if (msg.participants) {
          setLiveParticipants(msg.participants);
        }
      }
    };

    hostSync.init();

    return () => {
      hostSync.destroy();
    };
  }, [token]);

  // ── Temporizador de la fase Intro ──
  useEffect(() => {
    if (gamePhase !== 'intro') return;

    setIntroCountdown(6);
    const introTimer = setInterval(() => {
      setIntroCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(introTimer);
          handleStartQuestions();
          return 0;
        }
        audioEngine.playEffect('sfx_tick');
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(introTimer);
  }, [gamePhase]);

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

  // ── Secuencia animada del Podio cuando termina la partida ──
  useEffect(() => {
    if (gamePhase !== 'finished') {
      setPodiumStep(0);
      setPodiumConfetti(false);
      return;
    }

    // 1. Mostrar 3er puesto
    const t1 = setTimeout(() => {
      setPodiumStep(1);
      audioEngine.playEffect('sfx_tick');
    }, 1200);

    // 2. Mostrar 2do puesto
    const t2 = setTimeout(() => {
      setPodiumStep(2);
      audioEngine.playEffect('sfx_tick');
    }, 3500);

    // 3. Mostrar 1er puesto con confeti y celebración
    const t3 = setTimeout(() => {
      setPodiumStep(3);
      setPodiumConfetti(true);
      audioEngine.playEffect('sfx_victory');
    }, 6000);

    // 4. Detener automáticamente la música al finalizar la animación
    const t4 = setTimeout(() => {
      setPodiumStep(4);
      audioEngine.stopMusic();
      audioEngine.stopCustomAudio();
      setCustomIsPlaying(false);
    }, 11000);

    // Apagar confeti suavemente
    const t5 = setTimeout(() => {
      setPodiumConfetti(false);
    }, 14000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [gamePhase]);

  // Participantes ordenados estrictamente por puntaje real
  const sortedParticipants = [...liveParticipants].sort((a, b) => b.score - a.score);
  const firstPlace = sortedParticipants[0];
  const secondPlace = sortedParticipants[1];
  const thirdPlace = sortedParticipants[2];

  // ── Acciones del Docente ──
  const handleStartIntro = () => {
    if (liveParticipants.length === 0) return;

    setGamePhase('intro');
    audioEngine.setContext('intro');

    // Transmitir a todos los celulares la pantalla de bienvenida
    hostSyncRef.current?.broadcast('START_INTRO', {
      introTitle: gameData?.title || 'Seguridad Vial y Normas de Tránsito',
      introDescription: gameData?.description || 'Evaluación interactiva y gamificada con retos en tiempo real.',
    });
  };

  const handleStartQuestions = () => {
    setGamePhase('question');
    setCurrentQIndex(0);
    setIsAnswerRevealed(false);
    setAnsweredCount(0);
    const firstQ = questions[0];
    setTimerLeft(firstQ.timeLimit || 20);

    audioEngine.setContext('game_start');

    // Transmitir primera pregunta a todos los celulares
    hostSyncRef.current?.broadcast('START_GAME');
    hostSyncRef.current?.broadcast('QUESTION', {
      question: firstQ,
      index: 0,
      total: questions.length,
      timeLimit: firstQ.timeLimit || 20,
    });
  };

  const handleNextQuestion = () => {
    setShowLeaderboard(false);
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

    const top7 = [...liveParticipants]
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)
      .map((p, idx) => ({
        id: p.id,
        nickname: p.nickname,
        avatar: p.avatar,
        score: p.score,
        rank: idx + 1,
        correctAnswers: p.correctAnswers || 0,
        stealCount: p.stealCount || 0,
      }));
    setLeaderboardData(top7);
    setShowLeaderboard(true);

    hostSyncRef.current?.broadcast('REVEAL_ANSWER', {
      correctOptionId: currentQ.correctAnswer as string,
      explanation: currentQ.explanation,
    });
  };

  const handleTriggerStealPoints = () => {
    audioEngine.playEffect('sfx_steal_alert');
    setStealBanner('¡⚡ ROBO DE PUNTOS ACTIVADO! El primer estudiante que presione el botón rojo gana 500 pts.');

    hostSyncRef.current?.broadcast('STEAL_POINTS_START', {
      amount: 500,
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
    const shared = await shareSessionLink(qrUrl, "Únete a AXEL'S PLAY");
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

  const handleSaveTunnelUrl = (newUrl: string) => {
    setTunnelUrl(newUrl);
    setIsEditingUrl(false);
    fetch('/api/tunnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tunnelUrl: newUrl }),
    }).catch(() => {});
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
                gamePhase === 'finished'
                  ? 'badge-warning'
                  : gamePhase === 'question'
                  ? 'badge-success'
                  : gamePhase === 'intro'
                  ? 'badge-primary'
                  : 'badge-primary'
              } text-[10px]`}>
                {gamePhase === 'finished'
                  ? 'PARTIDA FINALIZADA'
                  : gamePhase === 'question'
                  ? 'EN VIVO'
                  : gamePhase === 'intro'
                  ? 'PRESENTACIÓN'
                  : 'SALA DE ESPERA'}
              </span>
              <span className="text-white/40 text-xs">Juego: {gameData?.title || 'Seguridad Vial'}</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              {gamePhase === 'finished'
                ? '🏆 Gran Podio de Ganadores'
                : gamePhase === 'intro'
                ? "AXEL'S PLAY — Presentación de la Actividad"
                : gamePhase === 'question'
                ? `Pregunta ${currentQIndex + 1} de ${questions.length}`
                : "AXEL'S PLAY — Partida en Tiempo Real"}
            </h1>
          </div>
        </div>

        {/* Botones de Control de la Sesión */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* BOTÓN DESPLEGABLE DE AUDIO Y VOLUMEN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                audioEngine.unlock();
                setAudioPanelOpen(!audioPanelOpen);
              }}
              className={`py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isMusicActive
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-300 hover:bg-purple-600/30 shadow-md shadow-purple-600/20'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
              }`}
              title="Ajustar Música, Efectos y Selector de Pistas"
            >
              {isMusicActive ? <Volume2 className="w-4 h-4 text-green-400 animate-pulse" /> : <VolumeX className="w-4 h-4 text-red-400" />}
              <span>🎵 Audio ({Math.round(musicVolume * 100)}%)</span>
              <Sliders className="w-3.5 h-3.5 text-purple-400 ml-0.5" />
            </button>

            {/* PANEL FLOTANTE DE CONTROL DE AUDIO */}
            {audioPanelOpen && (
              <div className="absolute right-0 top-12 z-50 w-72 p-4 rounded-2xl bg-slate-900 border border-purple-500/40 shadow-2xl space-y-4 animate-bounce-in">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-purple-400" />
                    <span>Control de Música y Sonidos</span>
                  </span>
                  <button
                    onClick={() => {
                      const active = audioEngine.toggleMusic();
                      setIsMusicActive(active);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded font-black ${
                      isMusicActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {isMusicActive ? 'ON' : 'MUTE'}
                  </button>
                </div>

                {/* Slider Volumen Música */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Volumen de Música:</span>
                    <span className="font-mono text-purple-300">{Math.round(musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={musicVolume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      setMusicVolume(vol);
                      audioEngine.setMusicVolume(vol);
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Slider Volumen Efectos */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span>Volumen de Efectos:</span>
                    <span className="font-mono text-yellow-300">{Math.round(effectsVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={effectsVolume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      setEffectsVolume(vol);
                      audioEngine.setEffectsEnabled(vol > 0);
                    }}
                    className="w-full accent-yellow-400 cursor-pointer"
                  />
                </div>

                {/* Cargar Música Manualmente desde el Computador */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-purple-300 font-black block flex items-center gap-1">
                      📁 Subir Música de Fondo
                    </label>
                    <span className="text-[9px] text-yellow-400 font-bold bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                      Solo Admin
                    </span>
                  </div>

                  {/* Sugerencia recomendada aprobada por el usuario */}
                  <div className="text-[10px] text-purple-200/80 bg-purple-950/40 p-2 rounded-lg border border-purple-500/20">
                    💡 <strong>Sugerencia aprobada:</strong> "Stranger Things" (Kyle Dixon & Michael Stein)
                  </div>

                  <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-purple-500/40 rounded-xl bg-purple-900/10 hover:bg-purple-900/20 cursor-pointer transition-all">
                    <input
                      type="file"
                      accept="audio/*,.mp3,.ogg,.wav,.m4a,.flac"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          audioEngine.playCustomAudio(file);
                          setCustomFileName(file.name);
                          setCustomIsPlaying(true);
                          setIsMusicActive(true);
                        }
                      }}
                    />
                    {customFileName ? (
                      <span className="text-[11px] text-green-400 font-bold text-center px-2 truncate w-full">
                        🎵 {customFileName}
                      </span>
                    ) : (
                      <>
                        <span className="text-[11px] text-white/70 font-semibold">Haz clic para subir música</span>
                        <span className="text-[9px] text-white/40 mt-0.5">MP3 · OGG · WAV · M4A</span>
                      </>
                    )}
                  </label>

                  {customFileName && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const isNowPlaying = audioEngine.toggleCustomAudio();
                          setCustomIsPlaying(isNowPlaying);
                        }}
                        className="flex-1 py-1.5 rounded-lg text-[11px] font-black bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300"
                      >
                        {customIsPlaying ? '⏸ Pausar' : '▶ Reanudar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.stopCustomAudio();
                          setCustomFileName(null);
                          setCustomIsPlaying(false);
                        }}
                        className="py-1.5 px-3 rounded-lg text-[11px] font-black bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400"
                        title="Detener y quitar música"
                      >
                        ⏹ Detener
                      </button>
                    </div>
                  )}

                  {!customFileName && (
                    <p className="text-[9px] text-white/40 text-center">
                      Sin música cargada (silencio de fondo total).
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOTÓN PODER PARA TODOS */}
          {gamePhase !== 'finished' && liveParticipants.length > 0 && (
            <button
              onClick={() => setGlobalPowerModalOpen(true)}
              className="btn-primary py-2 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 border border-yellow-400/40 shadow-lg shadow-yellow-500/20 text-slate-950 hover:scale-105 transition-transform"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>⚡ Super Poder</span>
            </button>
          )}

          {gamePhase === 'waiting' && (
            <button
              onClick={handleStartIntro}
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

          {gamePhase === 'intro' && (
            <button
              onClick={handleStartQuestions}
              className="py-2.5 px-5 rounded-xl text-xs font-black flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-green-500/30 hover:scale-105 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Comenzar Pregunta 1 ({introCountdown}s)</span>
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

      {/* Banner de Robo de Puntos Activo */}
      {stealBanner && (
        <div className="card p-4 border-red-500/60 bg-gradient-to-r from-red-600/30 via-rose-600/20 to-red-600/30 text-white font-black text-sm flex items-center justify-center gap-3 animate-bounce-in shadow-2xl shadow-red-600/30 ring-2 ring-red-400">
          <Zap className="w-6 h-6 fill-yellow-400 text-yellow-400 animate-pulse" />
          <span>{stealBanner}</span>
          <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
        </div>
      )}

      {/* Banner de Ganador de Robo de Puntos */}
      {stealWinnerBanner && (
        <div className="card p-4 border-yellow-400/60 bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 text-yellow-300 font-black text-base flex items-center justify-center gap-3 animate-bounce-in shadow-2xl shadow-yellow-500/30 ring-2 ring-yellow-400">
          <Award className="w-6 h-6 text-yellow-300 animate-bounce" />
          <span>{stealWinnerBanner}</span>
          <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
        </div>
      )}

      {/* Banner de Poder Global Activado */}
      {globalPowerSuccess && (
        <div className="card p-4 border-yellow-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 text-yellow-300 font-black text-sm flex items-center justify-center gap-3 animate-bounce-in shadow-xl shadow-yellow-500/20">
          <Zap className="w-6 h-6 fill-yellow-400 text-yellow-400" />
          <span>{globalPowerSuccess}</span>
          <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
        </div>
      )}

      {/* ── FASE 1: SALA DE ESPERA CON CÓDIGO QR GIGANTE Y CONEXIÓN MULTI-RED ── */}
      {gamePhase === 'waiting' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: QR Grande Proyectable y Selector de Red */}
          <div className="card p-6 border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-slate-900 text-center flex flex-col items-center justify-between shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold mb-2">
                <QrCode className="w-4 h-4 text-yellow-400" />
                <span>ACCESO CON CÁMARA DESDE CUALQUIER RED</span>
              </div>
              <h2 className="text-xl font-black text-white mb-1">
                Escanea con tu celular para unirte
              </h2>
              <p className="text-white/60 text-xs mb-3">
                Funciona desde <strong className="text-purple-300">Datos Móviles (4G/5G)</strong> o Wi-Fi.
              </p>
            </div>

            {/* Canvas QR */}
            <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-purple-600/40 border-4 border-purple-500/60 my-1">
              <QRCodeSVG
                value={qrUrl}
                size={220}
                level="H"
                includeMargin={false}
                fgColor="#1e1b4b"
              />
            </div>

            <div className="w-full mt-3 space-y-3">
              {/* Selector de Modo de Red (4G/5G vs Wi-Fi Local) */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-2 text-left">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 font-bold flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-purple-400" />
                    <span>Red de Conexión:</span>
                  </span>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-white/10 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setConnectionMode('vercel')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        connectionMode === 'vercel'
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-white/50 hover:text-white'
                      }`}
                      title="Nube Vercel en vivo: https://axel-s-play.vercel.app"
                    >
                      🚀 Vercel Nube
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectionMode('tunnel')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        connectionMode === 'tunnel'
                          ? 'bg-indigo-600 text-white shadow'
                          : 'text-white/50 hover:text-white'
                      }`}
                      title="Túnel HTTPS para datos móviles 4G/5G"
                    >
                      🌐 4G/5G Túnel
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectionMode('wifi')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        connectionMode === 'wifi'
                          ? 'bg-green-600 text-white shadow'
                          : 'text-white/50 hover:text-white'
                      }`}
                      title="Mismo router Wi-Fi local"
                    >
                      📶 Wi-Fi
                    </button>
                    <button
                      type="button"
                      onClick={() => setConnectionMode('local')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        connectionMode === 'local'
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-white/50 hover:text-white'
                      }`}
                      title="Misma PC"
                    >
                      💻 Local
                    </button>
                  </div>
                </div>

                {/* URL del QR activa y editable */}
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 p-1.5 rounded-lg bg-black/40 border border-white/10 text-[10px] text-purple-300 font-mono truncate">
                    {qrUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingUrl(!isEditingUrl)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold shrink-0"
                    title="Editar URL manual"
                  >
                    ✏️
                  </button>
                </div>

                {isEditingUrl && (
                  <div className="pt-1.5 border-t border-white/10 space-y-1">
                    <input
                      type="text"
                      defaultValue={connectionMode === 'tunnel' ? tunnelUrl : wifiHost}
                      onBlur={(e) => {
                        if (connectionMode === 'tunnel') {
                          handleSaveTunnelUrl(e.target.value);
                        } else {
                          setWifiHost(e.target.value);
                          setIsEditingUrl(false);
                        }
                      }}
                      placeholder="https://tu-tunel.loca.lt o 192.168.100.4:5173"
                      className="input py-1 text-[11px] w-full"
                    />
                    <p className="text-[9px] text-white/50">
                      Presiona fuera del campo para guardar y regenerar el QR al instante.
                    </p>
                  </div>
                )}
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
                  <span>Sala lista para recibir conexiones desde cualquier red</span>
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

      {/* ── FASE INTRO: PANTALLA DE BIENVENIDA ANTES DEL JUEGO ── */}
      {gamePhase === 'intro' && (
        <div className="card p-8 md:p-12 border-purple-500/40 bg-gradient-to-b from-purple-950/60 via-slate-950 to-slate-950 text-center shadow-2xl relative overflow-hidden animate-bounce-in">
          {/* Badge superior */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-widest mb-4">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
            <span>PARTIDA EN VIVO • AXEL'S PLAY</span>
          </div>

          {/* Título de la Plataforma */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-yellow-300 to-pink-300 tracking-tight mb-3">
            AXEL'S PLAY
          </h1>

          {/* Título del Juego */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 max-w-3xl mx-auto">
            {gameData?.title || 'Seguridad Vial y Señales de Tránsito'}
          </h2>

          <p className="text-white/70 text-sm md:text-base max-w-2xl mx-auto mb-8">
            {gameData?.description || 'Evaluación interactiva y gamificada. Prepárate para responder en tu teléfono móvil con rapidez y precisión.'}
          </p>

          {/* Tarjeta de Instrucciones Pedagógicas */}
          <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md mb-8 text-left space-y-3 shadow-xl">
            <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>¿CÓMO SE JUEGA?</span>
            </h3>
            <ul className="space-y-2 text-xs md:text-sm text-white/80">
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-300 font-black shrink-0">1</span>
                <span>Lee la pregunta y observa la imagen en esta pantalla principal proyectada.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-300 font-black shrink-0">2</span>
                <span>En tu celular, presiona la figura geométrica y el color correspondiente a tu respuesta.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-500/30 border border-amber-500/50 flex items-center justify-center text-amber-300 font-black shrink-0">3</span>
                <span>Cuanto más rápido respondas correctamente, ¡más puntos sumas!</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-300 font-black shrink-0">4</span>
                <span>⚡ ¡Atento! En cualquier momento el profe activará el <strong>ROBO DE PUNTOS</strong>. Quien toque primero el botón rojo se los lleva.</span>
              </li>
            </ul>
          </div>

          {/* Botón de inicio rápido con cuenta regresiva */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleStartQuestions}
              className="py-4 px-8 rounded-2xl text-base font-black flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-slate-950 shadow-2xl shadow-green-500/40 hover:scale-105 active:scale-95 transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>¡A JUGAR AHORA! ({introCountdown}s)</span>
            </button>
          </div>
        </div>
      )}

      {/* ── FASE 2: PREGUNTA EN PANTALLA GIGANTE (PROYECTOR ESTILO KAHOOT) ── */}
      {gamePhase === 'question' && (
        <div className="space-y-6">
          {/* Header de Pregunta en Proyector */}
          <div className="card p-6 border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 text-center relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1 rounded-full bg-purple-600/30 border border-purple-500/40 text-purple-300 font-black text-xs uppercase tracking-wider">
                  Pregunta {currentQIndex + 1} de {questions.length}
                </span>

                {/* Badge de Multiplicador de Puntos (Doble o Triple) */}
                {currentQ.pointsMultiplier && currentQ.pointsMultiplier > 1 && (
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black text-xs flex items-center gap-1 shadow-lg shadow-yellow-500/30 animate-bounce">
                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                    <span>¡PUNTOS {currentQ.pointsMultiplier === 2 ? 'DOBLES (2×)' : 'TRIPLES (3×)'}!</span>
                  </span>
                )}
              </div>

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

            {/* Imagen Opcional de la Pregunta */}
            {currentQ.imageUrl && (
              <div className="my-3 flex justify-center">
                <div className="rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl max-h-64 bg-slate-950">
                  <img
                    src={currentQ.imageUrl}
                    alt="Imagen de apoyo"
                    className="max-h-60 object-contain mx-auto rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Texto de la Pregunta en Tamaño Gigante */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight max-w-4xl mx-auto py-2">
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

            {/* Estructura del Podio de Jugadores REALES con revelación secuencial */}
            {liveParticipants.length === 0 ? (
              <div className="p-8 text-white/50 text-sm">
                No hubo participantes registrados en esta partida.
              </div>
            ) : (
              <div className="flex items-end justify-center gap-4 max-w-2xl mx-auto my-8 pt-8 min-h-60 relative">
                {/* Partículas de Confeti animadas cuando se revela el 1er lugar */}
                {podiumConfetti && (
                  <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex justify-center items-center">
                    <span className="text-4xl animate-bounce">🎉</span>
                    <span className="text-5xl animate-spin mx-6">⭐</span>
                    <span className="text-4xl animate-bounce">🎊</span>
                  </div>
                )}

                {/* 🥈 2do Lugar (Aparece en paso 2) */}
                <div className={`flex-1 flex flex-col items-center transition-all duration-700 ${
                  podiumStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}>
                  {secondPlace && (
                    <>
                      <div className="w-20 h-20 rounded-3xl bg-slate-400/20 p-1.5 border-2 border-slate-300/40 mb-2 shadow-lg">
                        <img src={secondPlace.avatar} alt={secondPlace.nickname} className="w-full h-full object-contain" />
                      </div>
                      <span className="font-bold text-sm text-white truncate max-w-full">{secondPlace.nickname}</span>
                      <span className="text-xs text-slate-300 font-extrabold mb-2">{secondPlace.score.toLocaleString()} pts</span>
                      <div className="w-full h-32 rounded-t-2xl bg-gradient-to-t from-slate-600/40 to-slate-400/30 border-t-4 border-slate-300 flex flex-col items-center justify-center shadow-xl">
                        <Medal className="w-8 h-8 text-slate-300 mb-1" />
                        <span className="font-black text-3xl text-slate-300">2°</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 🥇 1er Lugar (Aparece al final en paso 3 con celebración especial) */}
                <div className={`flex-1 flex flex-col items-center -mt-8 transition-all duration-700 ${
                  podiumStep >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-90'
                }`}>
                  {firstPlace && (
                    <>
                      <div className="w-24 h-24 rounded-3xl bg-yellow-400/30 p-2 border-4 border-yellow-400 shadow-2xl shadow-yellow-500/50 mb-2 animate-float">
                        <img src={firstPlace.avatar} alt={firstPlace.nickname} className="w-full h-full object-contain" />
                      </div>
                      <span className="font-black text-base text-yellow-300 truncate max-w-full">{firstPlace.nickname}</span>
                      <span className="text-sm text-yellow-400 font-black mb-2">{firstPlace.score.toLocaleString()} pts</span>
                      <div className="w-full h-44 rounded-t-3xl bg-gradient-to-t from-yellow-600/50 to-yellow-400/40 border-t-4 border-yellow-400 flex flex-col items-center justify-center shadow-2xl shadow-yellow-500/40">
                        <Trophy className="w-12 h-12 text-yellow-400 mb-1 animate-pulse" />
                        <span className="font-black text-4xl text-yellow-400">1°</span>
                        <span className="text-[10px] font-black text-yellow-300 uppercase tracking-wider">¡GRAN CAMPEÓN!</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 🥉 3er Lugar (Aparece primero en paso 1) */}
                <div className={`flex-1 flex flex-col items-center transition-all duration-700 ${
                  podiumStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}>
                  {thirdPlace && (
                    <>
                      <div className="w-20 h-20 rounded-3xl bg-amber-700/20 p-1.5 border-2 border-amber-600/40 mb-2 shadow-md">
                        <img src={thirdPlace.avatar} alt={thirdPlace.nickname} className="w-full h-full object-contain" />
                      </div>
                      <span className="font-bold text-sm text-white truncate max-w-full">{thirdPlace.nickname}</span>
                      <span className="text-xs text-amber-400 font-extrabold mb-2">{thirdPlace.score.toLocaleString()} pts</span>
                      <div className="w-full h-24 rounded-t-2xl bg-gradient-to-t from-amber-800/40 to-amber-700/30 border-t-4 border-amber-600 flex flex-col items-center justify-center shadow-lg">
                        <Medal className="w-7 h-7 text-amber-400 mb-1" />
                        <span className="font-black text-2xl text-amber-400">3°</span>
                      </div>
                    </>
                  )}
                </div>
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

      {/* ── BANNER VISUAL DE ROBO DE PUNTOS EN PANTALLA PRINCIPAL ── */}
      {stealWinnerBanner && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in max-w-lg w-full px-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-2xl border-2 border-yellow-300 flex items-center justify-between gap-3">
            <span className="text-2xl animate-spin">🗡️</span>
            <span className="font-black text-sm text-center flex-1">{stealWinnerBanner}</span>
            <button
              onClick={() => setStealWinnerBanner(null)}
              className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white/80"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── TABLA DE CLASIFICACIÓN TOP 7 POST-PREGUNTA EN PROYECTOR ── */}
      {showLeaderboard && leaderboardData.length > 0 && gamePhase === 'question' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-bounce-in">
          <div className="card max-w-xl w-full p-6 md:p-8 border-purple-500/50 bg-slate-900/95 shadow-2xl text-center space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl md:text-2xl font-black text-white">
                  Clasificación Actual · TOP 7
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
              >
                Cerrar ✕
              </button>
            </div>

            <p className="text-xs text-purple-200">
              Puntajes actualizados en tiempo real según rapidez de respuesta y robos de puntos
            </p>

            <div className="space-y-2">
              {leaderboardData.slice(0, 7).map((p, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <div
                    key={p.id || idx}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isTop1
                        ? 'bg-yellow-400/20 border-yellow-400/50 shadow-lg shadow-yellow-500/10'
                        : isTop2
                        ? 'bg-slate-400/15 border-slate-300/30'
                        : isTop3
                        ? 'bg-amber-600/15 border-amber-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                          isTop1
                            ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/40'
                            : isTop2
                            ? 'bg-slate-300 text-slate-950'
                            : isTop3
                            ? 'bg-amber-600 text-white'
                            : 'bg-white/10 text-white/70'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <img
                        src={p.avatar}
                        alt={p.nickname}
                        className="w-9 h-9 rounded-xl object-contain bg-slate-800 p-0.5 border border-white/15"
                      />
                      <div className="text-left">
                        <div className="font-extrabold text-sm text-white">{p.nickname}</div>
                        <div className="text-[10px] text-white/50">
                          {p.correctAnswers !== undefined ? `${p.correctAnswers} correctas` : 'Participante'}
                          {p.stealCount ? ` · ${p.stealCount} robos` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-yellow-400">
                        {p.score.toLocaleString()} pts
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowLeaderboard(false);
                  handleNextQuestion();
                }}
                className="btn-primary py-2.5 px-6 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-purple-600/30"
              >
                <span>Avanzar a Siguiente Pregunta</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
