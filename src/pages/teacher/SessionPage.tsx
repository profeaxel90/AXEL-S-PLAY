import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { audioEngine, OFFICIAL_TRACK_NAME, OFFICIAL_TRACK_URL } from '../../lib/audio';
import { generateSessionToken, buildQRUrl, shareSessionLink } from '../../lib/qr';
import { GameHostSync, type GameEventMessage } from '../../lib/gameSync';
import { POWER_UPS } from '../../types';
import type { PowerUpType, Participant, Question } from '../../types';
import { SAMPLE_GAMES, SAMPLE_QUESTIONS_ROAD_SAFETY } from '../../data/mockGames';
import { useGameStore } from '../../stores/gameStore';
import MascotAvatar, { AVAILABLE_MASCOT_SEEDS } from '../../components/game/MascotAvatar';
import {
  Play, Pause, SkipForward, Square, Users, QrCode,
  Zap, Share2, RefreshCw, Trophy, Medal, Crown,
  ArrowLeft, CheckCircle2, Sparkles, BarChart3,
  Clock, Eye, Wifi, Globe, Sliders, Music, Radio,
  Volume2, VolumeX, ShieldAlert, Award, Image as ImageIcon,
  Maximize2, Minimize2, X, ShieldCheck, Flame, Shield, HelpCircle
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

function getEmbedVideoUrl(url?: string): string {
  if (!url) return '';
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return url;
}

// Componente de puntuación animada con incremento en tiempo real
function AnimatedScoreValue({ target, start = 0, duration = 1200 }: { target: number; start?: number; duration?: number }) {
  const [val, setVal] = useState(start);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const initial = start;
    const diff = target - initial;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Curva easeOutExpo para sensación de videojuego arcade
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setVal(Math.floor(initial + diff * ease));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    const req = requestAnimationFrame(step);
    return () => cancelAnimationFrame(req);
  }, [target, start, duration]);

  return <span>{val.toLocaleString()} pts</span>;
}

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

  // Preguntas del juego seleccionado (obtenidas del almacenamiento persistente de juegos)
  const savedGame = useGameStore((state) => state.getGame(gameId || 'g-1'));
  const gameData = savedGame || SAMPLE_GAMES[gameId || 'g-1'];
  const questions: Question[] =
    gameData?.questions && gameData.questions.length > 0
      ? gameData.questions
      : SAMPLE_QUESTIONS_ROAD_SAFETY;

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
  // Modalidades avanzadas (Equipos, Supervivencia 3 corazones, Ruleta) y Zoom de QR
  const [showLiveQrZoom, setShowLiveQrZoom] = useState(false);
  const [wheelSelectedStudent, setWheelSelectedStudent] = useState<Participant | null>(null);

  // Audio & Sonido Oficial
  const audioSettings = audioEngine.getSettings();
  const defaultTrackName = audioSettings.defaultTrackName || OFFICIAL_TRACK_NAME;
  const defaultTrackUrl = audioSettings.defaultTrackUrl || OFFICIAL_TRACK_URL;
  const applyMusicToAll = audioSettings.applyToAllGames ?? true;

  const [isMusicActive, setIsMusicActive] = useState(() => audioSettings.musicEnabled);
  const [musicVolume, setMusicVolume] = useState(() => audioSettings.musicVolume ?? 0.75);
  const [effectsVolume, setEffectsVolume] = useState(() => audioSettings.effectsVolume ?? 0.85);
  const [selectedTrack, setSelectedTrack] = useState<'lobby' | 'question' | 'suspense' | 'podium'>('lobby');
  const [audioPanelOpen, setAudioPanelOpen] = useState(false);

  // Audio oficial predeterminado ("Stranger Things") o personalizado
  const [customFileName, setCustomFileName] = useState<string | null>(
    () => (applyMusicToAll ? defaultTrackName : null)
  );
  const [customIsPlaying, setCustomIsPlaying] = useState(false);

  // Leaderboard después de revelar respuesta (Top 5)
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [isLeaderboardAnimated, setIsLeaderboardAnimated] = useState(false);

  // Secuencia animada del Podio (1=3er, 2=2do, 3=1er con confeti, 4=finalizado)
  const [podiumStep, setPodiumStep] = useState(0);
  const [podiumConfetti, setPodiumConfetti] = useState(false);

  // Robo de Puntos y Autorización
  const [stealBanner, setStealBanner] = useState<string | null>(null);
  const [stealWinnerBanner, setStealWinnerBanner] = useState<string | null>(null);
  const [isStealAuthorized, setIsStealAuthorized] = useState(false);
  const [shieldBlockBanner, setShieldBlockBanner] = useState<string | null>(null);

  // Nuevas Funciones de Gamificación: Ronda Dorada y Reacciones de Emojis en Vivo
  const [isGoldenRound, setIsGoldenRound] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<Array<{ id: string; emoji: string; left: number; nickname?: string }>>([]);

  // Estados visuales mejorados: QR ampliado, secuencia intro y música lobby
  const introTimeoutsRef = useRef<any[]>([]);
  const [qrExpanded, setQrExpanded] = useState(false);
  const [introStep, setIntroStep] = useState<1 | 2 | 3 | 4>(1); // 1: 1-2-3, 2: Tema, 3: AXEL'S PLAY ZOOM, 4: A jugar
  const [introCountNum, setIntroCountNum] = useState<1 | 2 | 3>(1);
  const [isLobbyMusicPlaying, setIsLobbyMusicPlaying] = useState(false);

  const hostSyncRef = useRef<GameHostSync | null>(null);
  const roundStartScoresRef = useRef<Map<string, number>>(new Map());
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [studentAnswersHistory, setStudentAnswersHistory] = useState<Record<string, Array<{
    questionIndex: number;
    questionPrompt: string;
    selectedText: string;
    isCorrect: boolean;
    isTimeout: boolean;
    correctText: string;
    explanation: string;
  }>>>({});
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<Participant | null>(null);
  const [stealHistory, setStealHistory] = useState<Array<{ from: string; to: string; amount: number; time: string }>>([]);
  const [latestStealEvent, setLatestStealEvent] = useState<{ from: string; to: string; amount: number } | null>(null);
  const currentQ = questions[currentQIndex] || questions[0];

  // ── Iniciar música de lobby automáticamente al montar con fallback de gesto ──
  useEffect(() => {
    // Intentar reproducción inmediata al entrar al lobby
    audioEngine.playLobbyMusic();
    setIsLobbyMusicPlaying(true);

    // Fallback asegurado: si el navegador restringió AudioContext sin interacción previa,
    // al primer clic o pulsación en cualquier parte de la pantalla inicia de inmediato
    const unlockAndPlay = () => {
      audioEngine.unlock();
      audioEngine.playLobbyMusic();
      setIsLobbyMusicPlaying(true);
      window.removeEventListener('pointerdown', unlockAndPlay);
      window.removeEventListener('keydown', unlockAndPlay);
    };

    window.addEventListener('pointerdown', unlockAndPlay, { once: true });
    window.addEventListener('keydown', unlockAndPlay, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAndPlay);
      window.removeEventListener('keydown', unlockAndPlay);
      audioEngine.stopLobbyMusic();
    };
  }, []);

  // ── Inicializar Motor de Sincronización en Tiempo Real (SSE Local + P2P) ──
  useEffect(() => {
    const hostSync = new GameHostSync(token);
    hostSyncRef.current = hostSync;
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
              // Detiene la música de la pregunta y suena el bit indicador de fin de tiempo
              audioEngine.stopQuestionMusic();
              audioEngine.playEffect('sfx_time_up');
              setTimeout(() => {
                handleRevealAnswer();
              }, 400);
            }
            return currParticipants;
          });

          return nextCount;
        });

        // Actualizar puntaje y racha del estudiante real asegurando concordancia por ID o Nickname
        setLiveParticipants((prev) =>
          prev.map((p) => {
            const isMatch = (msg.participantId && p.id === msg.participantId) ||
                            (msg.nickname && p.nickname === msg.nickname);
            if (!isMatch) return p;

            const isCorrect = msg.isCorrect !== undefined
              ? msg.isCorrect
              : ((msg.pointsEarned || 0) > 0);

            // En modo Supervivencia, restar un corazón en caso de respuesta errónea
            let updatedHearts = p.hearts !== undefined ? p.hearts : 3;
            if (!isCorrect && !p.hasShield && gameData?.gameMode === 'survival') {
              updatedHearts = Math.max(0, updatedHearts - 1);
            }

            const nextStreak = isCorrect ? (p.streak || 0) + 1 : 0;
            if (nextStreak >= 2 && isCorrect) {
              audioEngine.playEffect('sfx_streak');
            }

            // Aplicar multiplicador por Ronda Dorada y Racha si se calculó en local
            const updatedScore = msg.newScore !== undefined
              ? msg.newScore
              : (p.score + (msg.pointsEarned || 0));

            return {
              ...p,
              score: updatedScore,
              hearts: updatedHearts,
              isEliminated: updatedHearts <= 0,
              streak: nextStreak,
              correctAnswers: isCorrect ? (p.correctAnswers || 0) + 1 : (p.correctAnswers || 0),
            };
          })
        );

        audioEngine.playEffect('sfx_tick');
      } else if (msg.type === 'LIVE_EMOJI') {
        if (msg.emoji) {
          const id = `${Date.now()}-${Math.random()}`;
          const left = 8 + Math.random() * 84;
          setFloatingEmojis((prev) => [...prev.slice(-18), { id, emoji: msg.emoji!, left, nickname: msg.nickname }]);
          audioEngine.playEffect('sfx_emoji_pop');
          setTimeout(() => {
            setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
          }, 3200);
        }
      } else if (msg.type === 'ACTIVATE_SHIELD') {
        if (msg.participantId || msg.nickname) {
          setLiveParticipants((prev) =>
            prev.map((p) => {
              if (p.id === msg.participantId || p.nickname === msg.nickname) {
                return { ...p, hasShield: true, shieldAvailable: false };
              }
              return p;
            })
          );
          audioEngine.playEffect('sfx_shield_activate');
        }
      } else if (msg.type === 'STEAL_RESULT') {
        if (msg.success) {
          const amt = msg.amount || 50;
          const from = msg.fromNickname || 'Estudiante';
          const to = msg.toNickname || 'Estudiante';

          // Verificar si la víctima tenía Escudo Protector activo
          const victim = liveParticipants.find((p) => p.nickname === to || p.id === msg.toId);
          if (victim && victim.hasShield) {
            const blockMsg = `🛡️ ¡El Escudo Protector de ${victim.nickname} BLOQUEÓ el robo de ${from}!`;
            setShieldBlockBanner(blockMsg);
            audioEngine.playEffect('sfx_shield_block');
            setTimeout(() => setShieldBlockBanner(null), 6000);
            hostSyncRef.current?.broadcast('STEAL_RESULT', {
              success: false,
              fromNickname: from,
              toNickname: victim.nickname,
              blockedByShield: true,
              error: `🛡️ ${victim.nickname} tenía un Escudo Protector. ¡Robo bloqueado!`,
            });
            return;
          }

          const bannerMsg = `🗡️ ¡${from} le robó ${amt} puntos a ${to}!`;
          setStealWinnerBanner(bannerMsg);
          setLatestStealEvent({ from, to, amount: amt });
          setStealHistory((prev) => [
            { from, to, amount: amt, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            ...prev,
          ]);
          audioEngine.playEffect('sfx_steal_alert');
          setTimeout(() => setStealWinnerBanner(null), 7000);
          if (msg.participants) {
            setLiveParticipants(msg.participants);
          }
        }
      } else if (msg.type === 'LEADERBOARD') {
        if (msg.rankings) {
          setLeaderboardData(msg.rankings);
          setIsLeaderboardAnimated(false);
          setShowLeaderboard(true);
          setTimeout(() => setIsLeaderboardAnimated(true), 350);
        }
      } else if (msg.type === 'STEAL_POINTS_CLAIMED') {
        const amt = msg.amount || 50;
        const winner = msg.winnerNickname || 'Estudiante';
        const bannerMsg = `🗡️ ¡${winner} ejecutó el Robo de Puntos y ganó +${amt} pts!`;
        setStealBanner(null);
        setStealWinnerBanner(bannerMsg);
        setLatestStealEvent({ from: winner, to: 'Rivales', amount: amt });
        setStealHistory((prev) => [
          { from: winner, to: 'Rivales', amount: amt, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          ...prev,
        ]);
        audioEngine.playEffect('sfx_steal_win');
        setTimeout(() => setStealWinnerBanner(null), 7000);
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

  // ── Temporizador de la fase Intro (Solo indicador visual de cuenta regresiva) ──
  useEffect(() => {
    if (gamePhase !== 'intro') return;

    setIntroCountdown(12);
    const introTimer = setInterval(() => {
      setIntroCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(introTimer);
          return 0;
        }
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

    // Iniciar automáticamente música épica de podio estilo Kahoot
    audioEngine.playPodiumMusic();

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

    // Detener música de sala de espera si estaba activa
    audioEngine.stopLobbyMusic();
    setIsLobbyMusicPlaying(false);

    setGamePhase('intro');
    setIntroStep(1);
    audioEngine.playEffect('sfx_intro');

    // Transmitir a todos los celulares la secuencia de inicio rápida
    hostSyncRef.current?.broadcast('START_INTRO', {
      introStep: 1,
      introTitle: "AXEL'S PLAY",
      introDescription: 'Plataforma de gamificación',
    });

    // Limpiar timers anteriores si hubieran
    introTimeoutsRef.current.forEach(clearTimeout);
    introTimeoutsRef.current = [];

    // Paso a la primera pregunta en 3 segundos
    const tStart = setTimeout(() => {
      handleStartQuestions();
    }, 3200);

    introTimeoutsRef.current = [tStart];
  };

  const handleStartQuestions = () => {
    // Cancelar cualquier temporizador de intro pendiente si el docente salta directo
    introTimeoutsRef.current.forEach(clearTimeout);
    introTimeoutsRef.current = [];

    const mode = gameData?.gameMode || 'battle_live';

    // Preparar participantes según la modalidad seleccionada
    let updatedParticipants = [...liveParticipants];
    if (mode === 'team_battle') {
      const TEAMS = [
        { id: 't1', name: '🔴 Equipo Fuego' },
        { id: 't2', name: '🔵 Equipo Agua' },
        { id: 't3', name: '🟢 Equipo Tierra' },
        { id: 't4', name: '🟡 Equipo Relámpago' },
      ];
      const numTeams = updatedParticipants.length >= 6 ? 3 : 2;
      updatedParticipants = updatedParticipants.map((p, idx) => ({
        ...p,
        teamId: TEAMS[idx % numTeams].id,
        teamName: TEAMS[idx % numTeams].name,
      }));
      setLiveParticipants(updatedParticipants);
    } else if (mode === 'survival') {
      updatedParticipants = updatedParticipants.map((p) => ({
        ...p,
        hearts: 3,
        isEliminated: false,
      }));
      setLiveParticipants(updatedParticipants);
    }

    // Si es modo Ruleta, seleccionar un estudiante al azar:
    let wheelStudent: Participant | null = null;
    if (mode === 'wheel' && updatedParticipants.length > 0) {
      wheelStudent = updatedParticipants[Math.floor(Math.random() * updatedParticipants.length)];
      setWheelSelectedStudent(wheelStudent);
    }

    setGamePhase('question');
    setCurrentQIndex(0);
    setIsAnswerRevealed(false);
    setAnsweredCount(0);
    setIsStealAuthorized(false);
    const firstQ = questions[0];
    setTimerLeft(firstQ.timeLimit || 20);

    // Guardar puntajes y rankings iniciales para animación de subida/bajada
    const initialSorted = [...updatedParticipants].sort((a, b) => b.score - a.score);
    prevRanksRef.current = new Map(initialSorted.map((p, idx) => [p.id, idx + 1]));
    roundStartScoresRef.current = new Map(updatedParticipants.map((p) => [p.id, p.score]));

    // Iniciar la música repetitiva de la pregunta (se detiene cuando todos responden)
    audioEngine.playQuestionMusic();

    // Transmitir primera pregunta a todos los celulares con datos de modalidad
    hostSyncRef.current?.broadcast('START_GAME');
    hostSyncRef.current?.broadcast('QUESTION', {
      question: firstQ,
      index: 0,
      total: questions.length,
      timeLimit: firstQ.timeLimit || 20,
      gameMode: mode,
      selectedStudentId: wheelStudent?.id,
      selectedStudentName: wheelStudent?.nickname,
      participants: updatedParticipants,
    });
  };

  const handleNextQuestion = () => {
    setShowLeaderboard(false);
    setIsStealAuthorized(false);
    // Reiniciar escudos protectores para la nueva ronda
    setLiveParticipants((prev) => prev.map((p) => ({ ...p, hasShield: false })));

    const nextIdx = currentQIndex + 1;
    if (nextIdx >= questions.length) {
      handleEndGame();
      return;
    }

    const mode = gameData?.gameMode || 'battle_live';

    // Si es modo Ruleta, seleccionar un nuevo estudiante al azar para la siguiente pregunta:
    let wheelStudent: Participant | null = null;
    if (mode === 'wheel' && liveParticipants.length > 0) {
      wheelStudent = liveParticipants[Math.floor(Math.random() * liveParticipants.length)];
      setWheelSelectedStudent(wheelStudent);
    }

    const nextQ = questions[nextIdx];
    setCurrentQIndex(nextIdx);
    setIsAnswerRevealed(false);
    setAnsweredCount(0);
    setTimerLeft(nextQ.timeLimit || 20);

    // Guardar puntajes y rankings de la ronda anterior para calcular ascensos y descensos
    const prevSorted = [...liveParticipants].sort((a, b) => b.score - a.score);
    prevRanksRef.current = new Map(prevSorted.map((p, idx) => [p.id, idx + 1]));
    roundStartScoresRef.current = new Map(liveParticipants.map((p) => [p.id, p.score]));

    // Iniciar la música de la siguiente pregunta
    audioEngine.playQuestionMusic();

    // Transmitir nueva pregunta a los celulares
    hostSyncRef.current?.broadcast('QUESTION', {
      question: nextQ,
      index: nextIdx,
      total: questions.length,
      timeLimit: nextQ.timeLimit || 20,
      isGoldenRound,
      gameMode: mode,
      selectedStudentId: wheelStudent?.id,
      selectedStudentName: wheelStudent?.nickname,
      participants: liveParticipants,
    });
  };

  const handleToggleGoldenRound = () => {
    setIsGoldenRound((prev) => {
      const next = !prev;
      if (next) {
        audioEngine.playEffect('sfx_golden_round');
      }
      hostSyncRef.current?.broadcast('GOLDEN_ROUND', { isGoldenRound: next });
      return next;
    });
  };

  const handleRevealAnswer = () => {
    setIsAnswerRevealed(true);
    // Detener la música de la pregunta y sonar campanas de fin de tiempo
    audioEngine.stopQuestionMusic();
    audioEngine.playEffect('sfx_time_up');

    // Registrar en el historial pedagógico a quienes se les agotó el tiempo sin responder
    setStudentAnswersHistory((prev) => {
      const nextHist = { ...prev };
      const correctOptText = currentQ.options?.find((o) => o.isCorrect)?.text || String(currentQ.correctAnswer);
      liveParticipants.forEach((p) => {
        const studentList = nextHist[p.id] ? [...nextHist[p.id]] : [];
        const hasAnswer = studentList.some((a) => a.questionIndex === currentQIndex);
        if (!hasAnswer) {
          studentList.push({
            questionIndex: currentQIndex,
            questionPrompt: currentQ.content,
            selectedText: '⏰ Tiempo Agotado (No respondió)',
            isCorrect: false,
            isTimeout: true,
            correctText: correctOptText,
            explanation: currentQ.explanation || 'Se acabó el tiempo límite antes de que enviara una opción.',
          });
          nextHist[p.id] = studentList;
        }
      });
      return nextHist;
    });

    // Reproducir sonido de monedas digitales cayendo para la tabla de clasificación
    setTimeout(() => audioEngine.playEffect('sfx_digital_coins'), 200);
    setTimeout(() => audioEngine.playEffect('sfx_digital_coins'), 600);
    setTimeout(() => audioEngine.playEffect('sfx_digital_coins'), 1000);

    // Calcular el ranking Top 5 con los puntajes más actualizados y animación de subida/bajada
    setLiveParticipants((latest) => {
      const sorted = [...latest].sort((a, b) => b.score - a.score);

      const top5 = sorted.slice(0, 5).map((p, idx) => {
        const prevScore = roundStartScoresRef.current.get(p.id) ?? p.score;
        const prevRank = prevRanksRef.current.get(p.id) ?? idx + 1;
        const rankNow = idx + 1;
        const rankDelta = prevRank - rankNow; // > 0 subió, < 0 bajó

        return {
          id: p.id,
          nickname: p.nickname,
          avatar: p.avatar,
          score: p.score,
          prevScore,
          gained: p.score - prevScore,
          rank: rankNow,
          prevRank,
          rankDelta,
          correctAnswers: p.correctAnswers || 0,
          stealCount: p.stealCount || 0,
        };
      });

      // Detectar participantes que cayeron del Top 5 al puesto 6 o posterior
      const fallen = sorted.slice(5).filter((p) => {
        const oldRank = prevRanksRef.current.get(p.id) ?? 99;
        return oldRank <= 5;
      });

      // Detectar participantes que entraron al Top 5 viniendo de afuera
      const climbedIn = top5.filter((p) => (p.prevRank ?? 99) > 5);

      setLeaderboardData(top5);
      setIsLeaderboardAnimated(false);
      setShowLeaderboard(true);
      setTimeout(() => setIsLeaderboardAnimated(true), 350);

      // Sincronizar tabla de clasificación con todos los participantes
      hostSyncRef.current?.broadcast('LEADERBOARD', {
        rankings: top5,
      });

      hostSyncRef.current?.broadcast('REVEAL_ANSWER', {
        correctOptionId: currentQ.correctAnswer as string,
        explanation: currentQ.explanation,
        rankings: top5,
      });

      return latest;
    });
  };

  // Autorización de Robo de Puntos como Poder por el Docente
  const handleAuthorizeStealPower = () => {
    setIsStealAuthorized(true);
    audioEngine.playEffect('sfx_power_up');
    setStealBanner('🗡️ ¡PODER ACTIVADO! Has autorizado el Robo de Puntos (50 pts) para los estudiantes.');
    setTimeout(() => setStealBanner(null), 6000);

    hostSyncRef.current?.broadcast('STEAL_POWER_AUTHORIZED', {
      authorized: true,
      amount: 50,
    });

    // Simular que un bot intenta robar a otro si hay participantes en la sala
    const bots = liveParticipants.filter((p) => p.id.startsWith('bot-'));
    if (bots.length >= 2) {
      setTimeout(() => {
        const thief = bots[0];
        const victim = bots[1];
        const amt = 50;
        setLiveParticipants((prev) =>
          prev.map((p) => {
            if (p.id === thief.id) return { ...p, score: p.score + amt, stealCount: (p.stealCount || 0) + 1 };
            if (p.id === victim.id) return { ...p, score: Math.max(0, p.score - amt) };
            return p;
          })
        );
        const bannerMsg = `🗡️ ¡${thief.nickname} le robó ${amt} puntos a ${victim.nickname}!`;
        setStealWinnerBanner(bannerMsg);
        setLatestStealEvent({ from: thief.nickname, to: victim.nickname, amount: amt });
        setStealHistory((prev) => [
          { from: thief.nickname, to: victim.nickname, amount: amt, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          ...prev,
        ]);
        audioEngine.playEffect('sfx_steal_alert');
        setTimeout(() => setStealWinnerBanner(null), 7000);
      }, 3000);
    }
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

  const handleAddTestBot = () => {
    const studentNames = [
      'Mateo 🚀', 'Sofía ✨', 'Lucas ⚡', 'Valeria 🌟',
      'Santiago 🎯', 'Camila 💡', 'Alejandro 🧠', 'Isabella 🔥',
      'Daniel 🎮', 'Mariana 🎨', 'Sebastián 🏆', 'Lucía 🦄'
    ];
    const existingCount = liveParticipants.filter((p) => p.id.startsWith('bot-')).length;
    const nickname = studentNames[existingCount % studentNames.length] || `Estudiante_${existingCount + 1}`;
    const newBot: Participant = {
      id: `bot-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sessionId: token,
      nickname,
      avatar: AVAILABLE_MASCOT_SEEDS[existingCount % AVAILABLE_MASCOT_SEEDS.length],
      score: 0,
      rank: liveParticipants.length + 1,
      isConnected: true,
      joinedAt: new Date().toISOString(),
    };
    setLiveParticipants((prev) => {
      const next = [...prev, newBot];
      hostSyncRef.current?.broadcast('ROOM_UPDATE', { participants: next });
      return next;
    });
    audioEngine.playEffect('sfx_join');
  };

  // ── Simulación psicológica de aula (estudiantes apurados, nerviosos, y a los que se les acaba el tiempo) ──
  useEffect(() => {
    if (gamePhase !== 'question' || isAnswerRevealed || isPaused) return;
    const bots = liveParticipants.filter((p) => p.id.startsWith('bot-'));
    if (bots.length === 0) return;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const questionDuration = currentQ.timeLimit || 20;

    bots.forEach((bot, bIdx) => {
      // Perfiles psicológicos de aula:
      // 1. Al que se le acaba el tiempo por dudar (aprox 20% de los bots)
      const willTimeout = (bIdx % 5 === 2) || (Math.random() < 0.18);
      if (willTimeout) {
        // Este estudiante no alcanza a responder antes de que el reloj llegue a 0
        return;
      }

      // 2. El precipitado por el impulso inicial (1.2s - 2.8s)
      const isImpulsive = (bIdx % 4 === 0) && Math.random() < 0.7;
      // 3. El presionado por el reloj que responde en los últimos segundos (12s - 18s)
      const isPanic = (bIdx % 4 === 3) || Math.random() < 0.35;

      let delay: number;
      let accuracy: number;

      if (isImpulsive) {
        // Responde rapidísimo pero se equivoca frecuentemente por apurado
        delay = Math.floor(1200 + Math.random() * 1600);
        accuracy = 0.52; // 48% de error por leer apurado
      } else if (isPanic) {
        // Responde con el reloj casi en cero bajo pánico
        delay = Math.floor((questionDuration - 4.5) * 1000 + Math.random() * 3200);
        delay = Math.min(delay, (questionDuration - 0.8) * 1000); // antes del corte
        accuracy = 0.38; // 62% de error por cliquear a la loca con el tiempo encima
      } else {
        // Concentrado normal
        delay = Math.floor(3200 + Math.random() * 5500);
        accuracy = 0.82; // Más reflexivo
      }

      const t = setTimeout(() => {
        const isCorrect = Math.random() < accuracy;

        // Cálculo de puntos por velocidad o penalización de racha
        let ptsDelta = 0;
        let roundReason: 'correct' | 'panic_error' | 'timeout' = 'correct';

        if (isCorrect) {
          const speedFactor = Math.max(0.3, (questionDuration * 1000 - delay) / (questionDuration * 1000));
          const basePts = Math.floor(550 + speedFactor * 420);
          const currentStreak = bot.streak || 0;
          const nextStreak = currentStreak + 1;
          const streakMultiplier = nextStreak >= 4 ? 1.5 : nextStreak === 3 ? 1.3 : nextStreak === 2 ? 1.15 : 1.0;
          ptsDelta = Math.floor(basePts * (isGoldenRound ? 2 : 1) * streakMultiplier);
          roundReason = 'correct';
        } else {
          ptsDelta = 0;
          roundReason = 'panic_error';
        }

        // Guardar detalle pedagógico de la respuesta del bot para el Reporte Final
        const correctOptText = currentQ.options?.find((o) => o.isCorrect)?.text || String(currentQ.correctAnswer);
        const wrongOpt = currentQ.options?.find((o) => !o.isCorrect)?.text || 'Opción distractora';
        const selectedText = isCorrect ? correctOptText : wrongOpt;

        setStudentAnswersHistory((prev) => {
          const list = prev[bot.id] ? [...prev[bot.id]] : [];
          list.push({
            questionIndex: currentQIndex,
            questionPrompt: currentQ.content,
            selectedText,
            isCorrect,
            isTimeout: false,
            correctText: correctOptText,
            explanation: currentQ.explanation || 'Se analizó el contenido conceptual de la pregunta.',
          });
          return { ...prev, [bot.id]: list };
        });

        setLiveParticipants((prev) =>
          prev.map((p) => {
            if (p.id !== bot.id) return p;
            const nextStreak = isCorrect ? (p.streak || 0) + 1 : 0;
            return {
              ...p,
              score: Math.max(0, p.score + ptsDelta),
              streak: nextStreak,
              correctAnswers: isCorrect ? (p.correctAnswers || 0) + 1 : (p.correctAnswers || 0),
            };
          })
        );

        audioEngine.playEffect('sfx_tick');

        // Incrementar contador de respuestas
        setAnsweredCount((prev) => {
          const nextCount = prev + 1;
          setLiveParticipants((currParticipants) => {
            // Si todos respondieron (bots + humanos), detener música y sonar fin de tiempo
            if (currParticipants.length > 0 && nextCount >= currParticipants.length) {
              audioEngine.stopQuestionMusic();
              audioEngine.playEffect('sfx_time_up');
              setTimeout(() => handleRevealAnswer(), 400);
            }
            return currParticipants;
          });
          return nextCount;
        });
      }, delay);

      timeouts.push(t);
    });

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [gamePhase, currentQIndex, isAnswerRevealed, isPaused]);

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
    <div className="space-y-4 select-none">
      {/* ── Top Bar de Control Docente (Oculto en pregunta activa para maximizar espacio 100vh) ── */}
      {gamePhase !== 'question' && (
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
                  : 'badge-primary'
              } text-[10px]`}>
                {gamePhase === 'finished'
                  ? 'PARTIDA FINALIZADA'
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

                {/* Música Oficial Configurada para Todos los Juegos */}
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-purple-300 font-black flex items-center gap-1">
                      🎵 Música Oficial de la Partida
                    </label>
                    <span className="text-[9px] text-yellow-400 font-bold bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                      Solo en tu PC
                    </span>
                  </div>

                  {/* Tarjeta de la Canción Asignada */}
                  <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase tracking-wider text-purple-300 font-bold block">
                          Pista Asignada para Todas las Partidas:
                        </span>
                        <p className="text-xs font-black text-white truncate">
                          {customFileName || defaultTrackName}
                        </p>
                      </div>
                      {customIsPlaying && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/20 text-green-300 border border-green-500/30 animate-pulse">
                          Sonando en PC
                        </span>
                      )}
                    </div>

                    {/* Controles Directos de Música */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (customIsPlaying) {
                            const isNowPlaying = audioEngine.toggleCustomAudio();
                            setCustomIsPlaying(isNowPlaying);
                          } else {
                            audioEngine.playTrackByUrl(defaultTrackUrl, customFileName || defaultTrackName);
                            setCustomIsPlaying(true);
                            setIsMusicActive(true);
                          }
                        }}
                        className="flex-1 py-2 px-3 rounded-lg text-xs font-black bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition-all"
                      >
                        {customIsPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pausar Música</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Reproducir Música</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.stopMusic();
                          setCustomIsPlaying(false);
                        }}
                        disabled={!customIsPlaying}
                        className={`py-2 px-3 rounded-lg text-xs font-black border transition-all ${
                          customIsPlaying
                            ? 'bg-red-600/20 hover:bg-red-600/40 border-red-500/40 text-red-400'
                            : 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                        }`}
                        title="Detener música"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[9px] text-white/50 leading-tight">
                      🛡️ Los celulares de los estudiantes nunca reproducen música. La música se apaga automáticamente al terminar el podio.
                    </div>
                  </div>

                  {/* Opción secundaria: Subir otra canción para esta ronda específica */}
                  <div className="pt-1 flex items-center justify-between text-[10px]">
                    <label className="text-purple-300 hover:text-purple-200 cursor-pointer flex items-center gap-1">
                      <span>📁 Cambiar por otro archivo local</span>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.ogg,.wav,.m4a"
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
                    </label>
                    <Link
                      to="/teacher/settings"
                      className="text-white/50 hover:text-purple-300 underline"
                      target="_blank"
                    >
                      Ajustes generales
                    </Link>
                  </div>
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
      )}

      {/* Banner de Robo de Puntos Activo (Oculto en pregunta activa para evitar scroll) */}
      {gamePhase !== 'question' && stealBanner && (
        <div className="card p-3 border-red-500/60 bg-gradient-to-r from-red-600/30 via-rose-600/20 to-red-600/30 text-white font-black text-xs flex items-center justify-center gap-2 animate-bounce-in shadow-xl">
          <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400 animate-pulse" />
          <span>{stealBanner}</span>
        </div>
      )}

      {/* Banner de Ganador de Robo de Puntos (Oculto en pregunta activa para evitar scroll) */}
      {gamePhase !== 'question' && stealWinnerBanner && (
        <div className="card p-3 border-yellow-400/60 bg-gradient-to-r from-amber-500/30 via-yellow-500/20 to-amber-500/30 text-yellow-300 font-black text-xs flex items-center justify-center gap-2 animate-bounce-in shadow-xl">
          <Award className="w-5 h-5 text-yellow-300 animate-bounce" />
          <span>{stealWinnerBanner}</span>
        </div>
      )}

      {/* Banner de Poder Global Activado (Oculto en pregunta activa para evitar scroll) */}
      {gamePhase !== 'question' && globalPowerSuccess && (
        <div className="card p-3 border-yellow-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-600/20 text-yellow-300 font-black text-xs flex items-center justify-center gap-2 animate-bounce-in shadow-xl">
          <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          <span>{globalPowerSuccess}</span>
        </div>
      )}

      {/* ── FASE 1: SALA DE ESPERA CON CÓDIGO QR GIGANTE Y CONEXIÓN MULTI-RED ── */}
      {gamePhase === 'waiting' && (
        <div className="space-y-4">
          {/* Banner Principal Kahoot: URL + PIN GIGANTE */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border-2 border-purple-500/50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <span className="text-xs uppercase font-extrabold tracking-widest text-purple-300 flex items-center justify-center md:justify-start gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Unirse a la partida desde cualquier celular o navegador:
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-white mt-0.5">
                axel-s-play.vercel.app/join
              </h2>
              <p className="text-xs text-white/60 mt-1">O escanea el código QR proyectado en pantalla gigante</p>
            </div>
            <div className="bg-slate-950 border-2 border-yellow-400 px-8 py-3 rounded-2xl shadow-2xl flex flex-col items-center">
              <span className="text-xs font-black uppercase tracking-wider text-yellow-300">PIN DE JUEGO</span>
              <span className="text-4xl md:text-6xl font-black tracking-widest text-yellow-300 font-mono">{token}</span>
            </div>
          </div>

          {/* Barra de Música de la Sala de Espera (Exclusiva en PC Docente) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-500/30 flex items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
                <Music className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>Música de la Sala de Espera</span>
                  <span className="text-[10px] text-yellow-300 font-extrabold bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                    Solo en tu PC
                  </span>
                </h3>
                <p className="text-xs text-purple-300">
                  {isLobbyMusicPlaying
                    ? '🎵 Sonando en tu computador mientras se unen los participantes'
                    : 'Activa la música ambiental mientras tus alumnos escanean el código QR'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isLobbyMusicPlaying) {
                  audioEngine.stopLobbyMusic();
                  setIsLobbyMusicPlaying(false);
                } else {
                  audioEngine.playLobbyMusic();
                  setIsLobbyMusicPlaying(true);
                }
              }}
              className={`py-2 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md ${
                isLobbyMusicPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
              }`}
            >
              {isLobbyMusicPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pausar Música</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>▶ Iniciar Música de Espera</span>
                </>
              )}
            </button>
          </div>

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

              {/* Canvas QR - Clic para Expandir a Pantalla Completa */}
              <div
                onClick={() => setQrExpanded(true)}
                className="p-4 bg-white rounded-3xl shadow-2xl shadow-purple-600/40 border-4 border-purple-500/60 my-1 cursor-pointer hover:scale-105 transition-all group relative"
                title="Haz clic para ver el código QR en tamaño gigante"
              >
                <QRCodeSVG
                  value={qrUrl}
                  size={220}
                  level="H"
                  includeMargin={false}
                  fgColor="#1e1b4b"
                />
                <div className="absolute inset-0 bg-purple-950/30 opacity-0 group-hover:opacity-100 rounded-3xl flex items-center justify-center transition-opacity">
                  <span className="bg-purple-900 text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-xl border border-purple-400 flex items-center gap-1.5 animate-bounce">
                    <Maximize2 className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Clic para Ampliar QR</span>
                  </span>
                </div>
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
            <div className="card p-5 border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      ? 'Nadie se ha unido aún. Los estudiantes aparecerán aquí conforme escaneen el QR o ingresen el PIN.'
                      : 'Toca en cualquier alumno para darle un poder individual o dale a TODOS ⚡'}
                  </p>
                </div>
              </div>

              {/* Botón para probar la partida con bots */}
              <button
                type="button"
                onClick={handleAddTestBot}
                className="btn-secondary py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto border-purple-500/30 hover:bg-purple-500/20 text-purple-300"
                title="Añadir un jugador simulado para probar la partida"
              >
                <span>🤖 +1 Jugador de Prueba</span>
              </button>
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
                    <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 p-1 mb-2 group-hover:scale-105 transition-transform flex items-center justify-center">
                      <MascotAvatar avatar={p.avatar} size="lg" emotion="idle" />
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
        </div>
      )}

      {/* ── FASE INTRO: PRESENTACIÓN RÁPIDA (SOLO AXEL'S PLAY - PLATAFORMA DE GAMIFICACIÓN) ── */}
      {gamePhase === 'intro' && (
        <div className="card p-8 md:p-14 border-purple-500/50 bg-gradient-to-b from-purple-950/70 via-slate-950 to-slate-950 text-center shadow-2xl relative overflow-hidden min-h-[460px] flex flex-col items-center justify-center select-none animate-fade-in">
          <div className="absolute -inset-32 bg-gradient-to-r from-purple-600/30 via-pink-600/20 to-yellow-400/20 rounded-full blur-3xl opacity-50 animate-pulse pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-4xl py-6">
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-purple-200 to-pink-300 tracking-tight drop-shadow-[0_15px_60px_rgba(168,85,247,0.9)] animate-bounce-in">
              AXEL'S PLAY
            </h1>
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-purple-200 tracking-wide uppercase drop-shadow-md">
              Plataforma de gamificación
            </p>
          </div>

          <div className="mt-8 z-10">
            <button
              onClick={handleStartQuestions}
              className="py-2.5 px-6 rounded-xl text-xs font-bold text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Comenzar Inmediatamente →
            </button>
          </div>
        </div>
      )}

      {/* ── FASE 2: PREGUNTA EN PANTALLA COMPLETA 100VH SIN SCROLL (ESTILO KAHOOT) ── */}
      {gamePhase === 'question' && (
        <div className="h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] flex flex-col justify-between overflow-hidden gap-2 sm:gap-3 select-none pr-12 sm:pr-14">
          {/* Header Superior Compacto */}
          <div className="card p-2 sm:p-2.5 border-purple-500/30 bg-slate-900/90 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 rounded-2xl shadow-xl">
            {/* Izquierda: Indicador de Pregunta, PIN y Botón Zoom QR */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-purple-600/30 border border-purple-400 text-purple-200 font-black text-xs uppercase tracking-wider">
                Pregunta {currentQIndex + 1} / {questions.length}
              </span>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-mono font-bold">
                <span>PIN:</span>
                <span className="text-yellow-400 tracking-wider">{token}</span>
              </div>
              {/* Botón QR Pequeño al lado del PIN con Zoom en pantalla completa */}
              <button
                type="button"
                onClick={() => setShowLiveQrZoom(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 text-xs font-bold transition-all shadow-md group cursor-pointer"
                title="Ampliar QR para que nuevos estudiantes puedan unirse durante la partida"
              >
                <div className="w-5 h-5 bg-white p-0.5 rounded flex items-center justify-center shrink-0">
                  <QRCodeSVG value={qrUrl} size={16} />
                </div>
                <span className="hidden md:inline">Ver QR</span>
                <Maximize2 className="w-3.5 h-3.5 text-purple-300 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Centro: Título sutil de la partida */}
            <div className="hidden md:flex items-center gap-2 text-white/60 text-xs font-bold truncate max-w-xs">
              <span className="truncate">{gameData?.title || "Partida en Vivo"}</span>
            </div>

            {/* Derecha: Botones de Acción (Ronda Dorada, Robo y Revelar/Siguiente) */}
            <div className="flex items-center gap-2">
              {/* Botón Toggle de Ronda Dorada 2X */}
              <button
                type="button"
                onClick={handleToggleGoldenRound}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  isGoldenRound
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/40 scale-105 animate-pulse'
                    : 'bg-white/10 hover:bg-white/15 text-yellow-300 border border-yellow-400/30'
                }`}
                title="Ronda Dorada con puntos dobles (2X)"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGoldenRound ? 'fill-slate-950 text-slate-950' : 'fill-yellow-400 text-yellow-400'}`} />
                <span>{isGoldenRound ? '★ 2X ACTIVA' : '★ 2X'}</span>
              </button>

              {/* Botón de Robo de Puntos (integrado en el propio botón sin banners) */}
              <button
                type="button"
                onClick={handleAuthorizeStealPower}
                disabled={isStealAuthorized}
                className={`py-2 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  isStealAuthorized
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 cursor-default'
                    : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-600/30 hover:scale-105 active:scale-95 animate-pulse'
                }`}
                title="Habilita el botón de robo en los celulares de los estudiantes"
              >
                <Zap className={`w-3.5 h-3.5 ${isStealAuthorized ? 'fill-yellow-400 text-yellow-400' : 'fill-white text-white'}`} />
                <span>{isStealAuthorized ? 'Robo Autorizado' : 'Autorizar Robo'}</span>
              </button>

              {/* Botón Revelar Respuesta / Siguiente Pregunta */}
              {!isAnswerRevealed ? (
                <button
                  onClick={handleRevealAnswer}
                  className="py-2 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 hover:scale-105 transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Revelar</span>
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="py-2 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-slate-950 shadow-lg shadow-green-500/40 hover:scale-105 transition-all flex items-center gap-1.5"
                >
                  <span>Siguiente</span>
                  <SkipForward className="w-4 h-4 fill-slate-950" />
                </button>
              )}

              {/* Controles de Pausa y Fin de Partida */}
              <button
                type="button"
                onClick={handlePauseResume}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                title={isPaused ? 'Reanudar partida' : 'Pausar partida'}
              >
                {isPaused ? <Play className="w-4 h-4 text-green-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
              </button>
              <button
                type="button"
                onClick={handleEndGame}
                className="p-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
                title="Terminar partida anticipadamente"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Banner especial según Modo de Juego Activo */}
          {gameData?.gameMode === 'team_battle' && (
            <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-900/40 via-purple-900/40 to-indigo-900/40 border border-blue-400/30 flex items-center justify-center gap-2 text-xs font-bold text-white shrink-0 shadow-md">
              <span className="text-base">🤝</span>
              <span className="text-blue-300 font-black uppercase">MODO POR EQUIPOS:</span>
              <span className="text-white/80">Turno activo alternado en cada equipo para responder desde sus celulares</span>
            </div>
          )}
          {gameData?.gameMode === 'survival' && (
            <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-950/60 via-rose-950/60 to-pink-950/60 border border-red-500/40 flex items-center justify-center gap-2.5 text-xs font-bold text-white shrink-0 shadow-md">
              <span className="text-base animate-pulse">❤️</span>
              <span className="text-red-400 font-black uppercase">MODO SUPERVIVENCIA:</span>
              <span className="text-white/80">Cada jugador tiene 3 corazones. Un fallo resta 1 vida.</span>
              <span className="bg-red-500/20 px-2 py-0.5 rounded-lg border border-red-400/30 text-red-300 font-black">
                Sobrevivientes: {liveParticipants.filter(p => (p.hearts ?? 3) > 0).length} / {liveParticipants.length}
              </span>
            </div>
          )}
          {gameData?.gameMode === 'wheel' && wheelSelectedStudent && (
            <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/70 via-yellow-950/70 to-amber-950/70 border border-yellow-400/40 flex items-center justify-center gap-2 text-xs font-bold text-white shrink-0 shadow-md animate-fade-in">
              <span className="text-base animate-bounce">🎡</span>
              <span className="text-amber-300 font-black uppercase">RULETA DEL CONOCIMIENTO:</span>
              <span className="text-white/80">¡El sistema seleccionó a</span>
              <span className="text-yellow-300 font-black bg-yellow-400/20 px-2 py-0.5 rounded-lg border border-yellow-400/40 text-sm">
                {wheelSelectedStudent.nickname}
              </span>
              <span className="text-white/80">para responder esta pregunta!</span>
            </div>
          )}

          {/* Área Central: Reloj Gigante de Impacto + Pregunta + Tarjeta Gigante de Respuestas */}
          <div className="flex items-stretch justify-between gap-3 sm:gap-4 flex-1 min-h-[140px] max-h-[40vh]">
            {/* RELOJ CIRCULAR GIGANTE DE ALTO IMPACTO (Estilo Kahoot) */}
            <div className="shrink-0 flex items-center justify-center">
              <div
                className={`relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full flex items-center justify-center transition-all duration-300 select-none ${
                  timerLeft <= 5
                    ? 'bg-red-600 shadow-[0_0_50px_rgba(239,68,68,0.9)] animate-pulse scale-105 ring-4 ring-yellow-400'
                    : 'bg-slate-900/95 border-4 border-purple-500/50 shadow-2xl shadow-purple-900/50'
                }`}
              >
                {/* SVG Radial Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 p-1" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke={timerLeft <= 5 ? '#ffffff' : '#fbbf24'}
                    strokeWidth="8"
                    strokeDasharray="276"
                    strokeDashoffset={`${((currentQ.timeLimit || 20) - timerLeft) / (currentQ.timeLimit || 20) * 276}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>

                {/* Número Gigante de Tiempo */}
                <div className="relative z-10 flex flex-col items-center justify-center">
                  <span
                    className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none ${
                      timerLeft <= 5 ? 'text-white' : 'text-yellow-300 drop-shadow-[0_2px_10px_rgba(250,204,21,0.5)]'
                    }`}
                  >
                    {timerLeft}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white/70 mt-0.5">
                    SEG
                  </span>
                </div>
              </div>
            </div>

            {/* Centro: Multimedia (Video o Imagen sin distorsión) y Pregunta */}
            <div className="card p-3 sm:p-4 border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-slate-900 flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl rounded-2xl">
              {currentQ.videoUrl ? (
                <div className="mb-2 w-full max-w-md rounded-2xl overflow-hidden border border-white/20 bg-black shadow-lg aspect-video max-h-[26vh]">
                  <iframe
                    src={getEmbedVideoUrl(currentQ.videoUrl)}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video de la pregunta"
                  />
                </div>
              ) : currentQ.imageUrl ? (
                <div className="mb-2 flex items-center justify-center rounded-2xl overflow-hidden border border-white/20 bg-black/40 p-1 shadow-lg max-h-[26vh] sm:max-h-[28vh] w-auto">
                  <img
                    src={currentQ.imageUrl}
                    alt="Imagen de apoyo"
                    className="max-h-[24vh] sm:max-h-[27vh] max-w-full w-auto h-auto object-contain rounded-xl"
                  />
                </div>
              ) : null}

              <h2 className="text-sm sm:text-base md:text-lg font-bold text-white leading-snug max-w-3xl px-2">
                {currentQ.content}
              </h2>

              {/* Barra de progreso de tiempo delgada complementaria */}
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 overflow-hidden max-w-2xl">
                <div
                  className={`h-full transition-all duration-1000 ${
                    timerLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-indigo-400'
                  }`}
                  style={{ width: `${(timerLeft / (currentQ.timeLimit || 20)) * 100}%` }}
                />
              </div>
            </div>

            {/* TARJETA GIGANTE DE RESPUESTAS (Estilo Kahoot) */}
            <div className="shrink-0 flex items-center justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-3xl bg-slate-900/95 border-4 border-indigo-500/50 shadow-2xl shadow-indigo-900/50 flex flex-col items-center justify-center select-none text-center p-2">
                <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-indigo-300 tracking-tight leading-none">
                  {answeredCount}
                </span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white/80 mt-1">
                  Respuestas
                </span>
                <span className="text-[8px] sm:text-[9px] text-white/50 font-bold mt-0.5">
                  de {liveParticipants.length}
                </span>
              </div>
            </div>
          </div>

          {/* Opciones o Respuestas (Segmentos Estilizados y de Altura Moderada) */}
          {currentQ.type === 'short_answer' ? (
            <div className="w-full max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-blue-950/40 border border-blue-500/40 text-center shadow-lg">
              <span className="text-2xl sm:text-3xl mb-1 block">✍️</span>
              <h3 className="text-base sm:text-lg font-bold text-white">Pregunta de Respuesta Abierta</h3>
              <p className="text-xs sm:text-sm text-blue-200 mt-1">
                Los estudiantes están redactando sus respuestas desde sus dispositivos móviles o computadores.
              </p>
              {isAnswerRevealed && (
                <div className="mt-3 p-3 rounded-xl bg-black/40 border border-blue-400/40 text-left">
                  <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider block">Respuesta modelo / sugerida:</span>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    {currentQ.options?.[0]?.text || currentQ.explanation || 'Respuesta abierta recibida'}
                  </p>
                </div>
              )}
            </div>
          ) : currentQ.type === 'photo_only' ? (
            <div className="w-full max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-purple-950/40 border border-purple-500/40 text-center shadow-lg">
              <span className="text-2xl sm:text-3xl mb-1 block">📸</span>
              <h3 className="text-base sm:text-lg font-bold text-white">Pregunta de Evidencia Fotográfica</h3>
              <p className="text-xs sm:text-sm text-purple-200 mt-1">
                Los estudiantes están tomando una foto de su trabajo o cuaderno y subiéndola en tiempo real.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 flex-1 max-h-[34vh] max-w-4xl mx-auto w-full">
              {(currentQ.options || []).map((option, idx) => {
                const style = OPTION_STYLES[idx % OPTION_STYLES.length];
                const isCorrect = currentQ.correctAnswer === option.id;

                return (
                  <div
                    key={option.id}
                    className={`py-2 sm:py-2.5 px-3 sm:px-4 rounded-xl border-2 transition-all flex items-center gap-2.5 relative shadow-md select-none ${
                      isAnswerRevealed
                        ? isCorrect
                          ? 'bg-emerald-600 border-yellow-400 text-white scale-[1.01] shadow-emerald-500/40 ring-4 ring-yellow-400'
                          : 'opacity-25 bg-slate-900 border-white/10'
                        : `${style.bg} ${style.border}`
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-sm sm:text-base shrink-0 ${style.symbolBg}`}>
                      {style.icon}
                    </div>

                    <span className="text-xs sm:text-sm md:text-base font-bold leading-snug flex-1 truncate-none">
                      {option.text}
                    </span>

                    {isAnswerRevealed && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-yellow-300 shrink-0 animate-bounce" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── BARRA LATERAL EN EL COSTADO: TODOS LOS PODERES (SOLO ICONOS COMPACTOS) ── */}
          <div className="fixed right-2 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5 p-1.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-purple-500/40 shadow-2xl">
            {/* 1. Doble Puntos (2X) a Todos */}
            <button
              type="button"
              onClick={() => handleApplyPowerToAll('double_points')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-400/40 text-amber-300 flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-amber-600/20"
              title="Doble Puntos (2X) en siguiente respuesta"
            >
              <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
            </button>

            {/* 2. +10 Segundos Extra para Todos */}
            <button
              type="button"
              onClick={() => {
                setTimerLeft((t) => t + 10);
                handleApplyPowerToAll('extra_time');
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/40 text-cyan-300 flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-cyan-600/20"
              title="Dar +10 Segundos Extra a Todos"
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* 3. Escudo Protector a Todos */}
            <button
              type="button"
              onClick={() => handleApplyPowerToAll('shield')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-300 flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-blue-600/20"
              title="Otorgar Escudo Protector Anti-Error a Todos"
            >
              <Shield className="w-4 h-4" />
            </button>

            {/* 4. Comodín 50:50 a Todos */}
            <button
              type="button"
              onClick={() => handleApplyPowerToAll('eliminate_two')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-400/40 text-emerald-300 flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-emerald-600/20"
              title="Activar 50:50 (Eliminar 2 opciones incorrectas)"
            >
              <Award className="w-4 h-4" />
            </button>

            {/* 5. Pista Pedagógica a Todos */}
            <button
              type="button"
              onClick={() => handleApplyPowerToAll('hint')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-400/40 text-yellow-300 flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-yellow-600/20"
              title="Dar Pista a Todos los Estudiantes"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* 6. Protagonista (Spotlight) */}
            <button
              type="button"
              onClick={() => handleApplyPowerToAll('spotlight')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-pink-600/30 hover:bg-pink-600/50 border border-pink-400/40 text-pink-300 flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-pink-600/20"
              title="Destacar a los estudiantes en pantalla"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {/* 7. Congelar Tiempo (Freeze) */}
            <button
              type="button"
              onClick={() => handleApplyPowerToAll('freeze')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 border border-sky-400/40 text-sky-300 flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-sky-600/20"
              title="Congelar tiempo 5 segundos para todos"
            >
              <Flame className="w-4 h-4" />
            </button>

            {/* 8. Saltar Pregunta */}
            <button
              type="button"
              onClick={() => handleApplyPowerToAll('skip_question')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-300 flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-purple-600/20"
              title="Permitir saltar pregunta sin penalización"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* 9. Puntos Bonus (+500 pts) */}
            <button
              type="button"
              onClick={() => handleApplyPowerToAll('bonus_points')}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 border border-amber-300/40 text-yellow-300 flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-amber-500/20"
              title="Otorgar +500 Puntos Bonus a Todos"
            >
              <Crown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── FASE 3: GRAN PODIO OLÍMPICO DE GANADORES REALES (COLORES ALEGRES Y BOMBA DE CONFETI) ── */}
      {gamePhase === 'finished' && (
        <div className="space-y-8 animate-bounce-in relative overflow-hidden">
          {/* BOMBA DE CONFETI EXPLOSIVA AL REVELAR EL NÚMERO 1 */}
          {(podiumStep >= 3 || podiumConfetti) && (
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
              {[...Array(60)].map((_, i) => {
                const colors = ['#facc15', '#ef4444', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];
                const randomColor = colors[i % colors.length];
                const left = (i * 1.65) % 100;
                const size = 8 + (i % 8) * 2;
                const animDuration = 2.5 + (i % 5) * 0.4;
                const delay = (i % 10) * 0.1;
                return (
                  <div
                    key={i}
                    className="absolute top-0 rounded-sm animate-confetti-drop"
                    style={{
                      left: `${left}%`,
                      width: `${size}px`,
                      height: `${size * 1.4}px`,
                      backgroundColor: randomColor,
                      animationDuration: `${animDuration}s`,
                      animationDelay: `${delay}s`,
                      transform: `rotate(${i * 25}deg)`,
                      boxShadow: `0 0 10px ${randomColor}`,
                    }}
                  />
                );
              })}
            </div>
          )}

          <div className="card border-purple-500/30 p-8 text-center relative overflow-hidden bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 shadow-2xl">
            <div className="mb-4">
              <Crown className="w-16 h-16 text-yellow-300 mx-auto mb-2 animate-bounce drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
              <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400">
                ¡Gran Podio de Campeones!
              </h2>
              <p className="text-yellow-300/80 font-bold text-sm mt-1">
                Resultados finales y celebración de la partida
              </p>
            </div>

            {/* Estructura del Podio de Jugadores REALES con revelación secuencial y colores alegres */}
            {liveParticipants.length === 0 ? (
              <div className="p-8 text-white/50 text-sm">
                No hubo participantes registrados en esta partida.
              </div>
            ) : (
              <div className="flex items-end justify-center gap-4 sm:gap-6 max-w-3xl mx-auto my-8 pt-8 min-h-64 relative">
                {/* 🥈 2do Lugar (Aparece en paso 2 - Plata Luminosa y Alegre) */}
                <div className={`flex-1 flex flex-col items-center transition-all duration-700 ${
                  podiumStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}>
                  {secondPlace && (
                    <>
                      <div className="w-20 h-20 rounded-3xl bg-cyan-500/30 p-1.5 border-3 border-cyan-300 mb-2 shadow-xl shadow-cyan-500/30 flex items-center justify-center">
                        <MascotAvatar avatar={secondPlace.avatar} emotion="happy" size="lg" />
                      </div>
                      <span className="font-bold text-sm text-cyan-200 truncate max-w-full drop-shadow">{secondPlace.nickname}</span>
                      <span className="text-xs text-white font-extrabold mb-2">{secondPlace.score.toLocaleString()} pts</span>
                      <div className="w-full h-36 rounded-t-3xl bg-gradient-to-t from-sky-600 via-cyan-400 to-indigo-200 border-t-4 border-cyan-200 flex flex-col items-center justify-center shadow-2xl shadow-cyan-500/40">
                        <Medal className="w-9 h-9 text-slate-950 mb-1" />
                        <span className="font-black text-4xl text-slate-950">2°</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 🥇 1er Lugar (Aparece en paso 3 - Oro Brillante y Bomba de Confeti) */}
                <div className={`flex-1 flex flex-col items-center -mt-10 transition-all duration-700 ${
                  podiumStep >= 3 ? 'opacity-100 translate-y-0 scale-105' : 'opacity-0 translate-y-12 scale-90'
                }`}>
                  {firstPlace && (
                    <>
                      <div className="w-26 h-26 rounded-3xl bg-yellow-400/40 p-2 border-4 border-yellow-300 shadow-2xl shadow-yellow-400/80 mb-2 animate-bounce ring-4 ring-yellow-300/40 flex items-center justify-center">
                        <MascotAvatar avatar={firstPlace.avatar} emotion="victory" size="xl" />
                      </div>
                      <span className="font-black text-base text-yellow-300 truncate max-w-full drop-shadow-[0_2px_10px_rgba(250,204,21,0.5)]">
                        {firstPlace.nickname}
                      </span>
                      <span className="text-sm text-white font-black mb-2">{firstPlace.score.toLocaleString()} pts</span>
                      <div className="w-full h-48 rounded-t-3xl bg-gradient-to-t from-amber-500 via-yellow-400 to-yellow-200 border-t-4 border-yellow-200 flex flex-col items-center justify-center shadow-2xl shadow-yellow-400/70">
                        <Trophy className="w-14 h-14 text-slate-950 mb-1 animate-pulse" />
                        <span className="font-black text-5xl text-slate-950">1°</span>
                        <span className="text-[11px] font-black text-slate-950 uppercase tracking-widest bg-yellow-300/80 px-2 py-0.5 rounded-full mt-0.5">
                          ¡GRAN CAMPEÓN!
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* 🥉 3er Lugar (Aparece en paso 1 - Bronce Radiante y Alegre) */}
                <div className={`flex-1 flex flex-col items-center transition-all duration-700 ${
                  podiumStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}>
                  {thirdPlace && (
                    <>
                      <div className="w-20 h-20 rounded-3xl bg-orange-500/30 p-1.5 border-3 border-orange-300 mb-2 shadow-xl shadow-orange-500/30 flex items-center justify-center">
                        <MascotAvatar avatar={thirdPlace.avatar} emotion="happy" size="lg" />
                      </div>
                      <span className="font-bold text-sm text-orange-200 truncate max-w-full drop-shadow">{thirdPlace.nickname}</span>
                      <span className="text-xs text-white font-extrabold mb-2">{thirdPlace.score.toLocaleString()} pts</span>
                      <div className="w-full h-28 rounded-t-3xl bg-gradient-to-t from-orange-600 via-amber-500 to-rose-400 border-t-4 border-orange-300 flex flex-col items-center justify-center shadow-2xl shadow-orange-500/40">
                        <Medal className="w-8 h-8 text-slate-950 mb-1" />
                        <span className="font-black text-3xl text-slate-950">3°</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ── TABLA COMPLETA DE REPORTE PEDAGÓGICO DE TODOS LOS PARTICIPANTES ── */}
            <div className="mt-8 text-left space-y-4 pt-6 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>📋 Reporte Pedagógico de Todos los Participantes</span>
                    <span className="text-xs text-purple-300 font-semibold bg-purple-900/40 px-2 py-0.5 rounded-full border border-purple-500/30">
                      {sortedParticipants.length} estudiantes
                    </span>
                  </h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    Selecciona el nombre de cualquier estudiante para diagnosticar en qué preguntas se equivocó y ver la retroalimentación
                  </p>
                </div>
              </div>

              {/* Historial de Robos de Puntos si ocurrieron durante la partida */}
              {stealHistory.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <span>🗡️ Registro de Robos de Puntos en la Partida</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {stealHistory.map((s, sIdx) => (
                      <span key={sIdx} className="text-[11px] bg-slate-900/80 border border-amber-500/30 text-amber-200 px-2.5 py-1 rounded-xl">
                        {s.time} · <strong>{s.from}</strong> le robó {s.amount} pts a <strong>{s.to}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-white/60">
                      <th className="py-3 px-3 text-left">Puesto</th>
                      <th className="py-3 px-4 text-left">Estudiante (Clic para ver errores)</th>
                      <th className="py-3 px-3 text-center">Puntaje Total</th>
                      <th className="py-3 px-3 text-center">Aciertos / Fallos</th>
                      <th className="py-3 px-3 text-center">% Precisión</th>
                      <th className="py-3 px-3 text-right">Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sortedParticipants.map((p, idx) => {
                      const history = studentAnswersHistory[p.id] || [];
                      const correctCount = p.correctAnswers || history.filter((h) => h.isCorrect).length;
                      const totalQ = questions.length;
                      const wrongCount = Math.max(0, totalQ - correctCount);
                      const accuracy = Math.round((correctCount / totalQ) * 100);

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedStudentForReport(p)}
                          className="hover:bg-purple-600/15 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-3 font-black text-white/80">
                            {idx === 0 ? '🥇 1°' : idx === 1 ? '🥈 2°' : idx === 2 ? '🥉 3°' : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-4 font-bold text-white flex items-center gap-2.5">
                            <MascotAvatar avatar={p.avatar} size="xs" />
                            <span className="group-hover:text-yellow-300 underline-offset-2 group-hover:underline">
                              {p.nickname}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-black text-yellow-400">
                            {p.score.toLocaleString()} pts
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-emerald-400 font-bold">{correctCount} ✅</span>
                            <span className="text-white/30 mx-1">/</span>
                            <span className="text-rose-400 font-bold">{wrongCount} ❌</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md font-extrabold ${accuracy >= 70 ? 'bg-emerald-500/20 text-emerald-300' : accuracy >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                              {accuracy}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentForReport(p);
                              }}
                              className="py-1 px-2.5 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white transition-all text-[11px] font-bold"
                            >
                              Ver errores 🔍
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

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

      {/* ── EMOJIS FLOTANTES EN VIVO (REACCIONES DE ALUMNOS EN TIEMPO REAL) ── */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingEmojis.map((e) => (
          <div
            key={e.id}
            style={{
              left: `${e.left}%`,
              bottom: '30px',
              animation: 'floatEmoji 3.2s ease-out forwards',
            }}
            className="absolute flex flex-col items-center pointer-events-none select-none drop-shadow-2xl"
          >
            <span className="text-4xl sm:text-5xl filter drop-shadow-md">{e.emoji}</span>
            {e.nickname && (
              <span className="text-[10px] font-black bg-black/70 text-white px-2 py-0.5 rounded-full mt-1 border border-white/20">
                {e.nickname}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── BANNER VISUAL DE ESCUDO PROTECTOR BLOQUEANDO ATAQUE ── */}
      {shieldBlockBanner && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in max-w-lg w-full px-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-2xl border-2 border-cyan-300 flex items-center justify-between gap-3 shadow-cyan-500/50">
            <ShieldCheck className="w-8 h-8 text-cyan-200 animate-pulse" />
            <span className="font-black text-sm text-center flex-1">{shieldBlockBanner}</span>
            <button
              onClick={() => setShieldBlockBanner(null)}
              className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white/80"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── TABLA DE CLASIFICACIÓN TOP 5 ULTRA COMPACTA Y ANIMADA FÍSICAMENTE (CERO SCROLL) ── */}
      {showLeaderboard && leaderboardData.length > 0 && gamePhase === 'question' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="card max-w-sm sm:max-w-md w-full p-3 sm:p-3.5 border-purple-500/40 bg-slate-900/95 shadow-2xl text-center space-y-2 rounded-2xl max-h-[75vh] overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm sm:text-base font-black text-white">
                  Clasificación · TOP 5 🏆
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
              >
                Cerrar ✕
              </button>
            </div>

            {/* Notificación compacta de Robo de Puntos si ocurrió */}
            {latestStealEvent && (
              <div className="py-0.5 px-2.5 rounded-xl bg-gradient-to-r from-red-600/30 via-amber-600/30 to-yellow-600/30 border border-yellow-400/40 text-yellow-200 text-[10px] font-black flex items-center justify-center gap-1 animate-bounce-in shadow-sm">
                <span>🗡️</span>
                <span>¡{latestStealEvent.from} robó {latestStealEvent.amount} pts a {latestStealEvent.to}!</span>
              </div>
            )}

            {/* Lista de Filas Compactas con Desplazamiento Físico Animado (Sin badges de texto) */}
            <div className="space-y-1 relative overflow-hidden py-0.5">
              {leaderboardData.slice(0, 5).map((p, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;
                const medal = isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`;
                const prev = p.prevScore !== undefined ? p.prevScore : Math.max(0, p.score - 100);
                const gained = p.score - prev;
                const rankDelta = p.rankDelta !== undefined ? p.rankDelta : 0;

                // Desplazamiento físico: si subió puestos parte de abajo; si bajó parte de arriba
                const rowHeight = 44;
                const initialOffsetY = !isLeaderboardAnimated ? rankDelta * rowHeight : 0;

                return (
                  <div
                    key={p.id || idx}
                    style={{
                      transform: `translateY(${initialOffsetY}px)`,
                      transition: isLeaderboardAnimated
                        ? 'transform 850ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 400ms ease, border-color 400ms ease'
                        : 'none',
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border ${
                      rankDelta > 0 && isLeaderboardAnimated
                        ? 'ring-2 ring-emerald-400/60 shadow-lg shadow-emerald-500/25 border-emerald-400/50'
                        : rankDelta < 0 && isLeaderboardAnimated
                        ? 'border-white/10 opacity-95'
                        : ''
                    } ${
                      isTop1
                        ? 'bg-yellow-400/20 border-yellow-400/50 shadow-md shadow-yellow-500/10'
                        : isTop2
                        ? 'bg-slate-400/15 border-slate-300/30'
                        : isTop3
                        ? 'bg-amber-600/15 border-amber-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                          isTop1
                            ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/50'
                            : isTop2
                            ? 'bg-slate-300 text-slate-950'
                            : isTop3
                            ? 'bg-amber-600 text-white'
                            : 'bg-white/10 text-white/80'
                        }`}
                      >
                        {medal}
                      </span>
                      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                        <MascotAvatar
                          avatar={p.avatar}
                          emotion={isTop1 ? 'victory' : isLeaderboardAnimated && rankDelta > 0 ? 'happy' : rankDelta < 0 ? 'sad' : 'idle'}
                          size="sm"
                        />
                      </div>
                      <div className="text-left truncate">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[110px] sm:max-w-[150px]">
                            {p.nickname}
                          </span>
                          {p.streak && p.streak >= 2 ? (
                            <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/40 px-1.5 py-0.2 rounded-md flex items-center gap-0.5 animate-pulse shadow-sm">
                              🔥 {p.streak}
                            </span>
                          ) : null}
                          {p.hasShield && (
                            <span className="text-[10px] font-black text-cyan-300 bg-cyan-500/20 border border-cyan-400/40 px-1 py-0.2 rounded-md flex items-center">
                              🛡️
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/50 flex items-center gap-1">
                          <span>{p.correctAnswers !== undefined ? `${p.correctAnswers} aciertos` : 'Participante'}</span>
                          {p.stealCount ? <span className="text-amber-300">· ⚡{p.stealCount}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2 shrink-0">
                      {gained > 0 ? (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-md animate-pulse">
                          +{gained}
                        </span>
                      ) : gained < 0 ? (
                        <span className="text-[10px] font-black text-rose-400 bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 rounded-md">
                          {gained}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-300/70 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded-md">
                          +0
                        </span>
                      )}
                      <div className="text-sm sm:text-base font-black text-yellow-400 min-w-16">
                        <AnimatedScoreValue target={p.score} start={prev} duration={1200} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/5">
              <button
                onClick={() => {
                  setShowLeaderboard(false);
                  handleNextQuestion();
                }}
                className="btn-primary py-2 px-5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-purple-600/30 ml-auto"
              >
                <span>Siguiente Pregunta</span>
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL QR GIGANTE EXPANDIDO PARA PROYECTAR A TODA LA CLASE ── */}
      {qrExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in"
          onClick={() => setQrExpanded(false)}
        >
          <div
            className="card max-w-lg w-full p-8 border-purple-500/60 bg-slate-900 shadow-2xl text-center space-y-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrExpanded(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
              title="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black uppercase tracking-widest mb-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>CÓDIGO QR GIGANTE • AXEL'S PLAY</span>
              </div>
              <h2 className="text-2xl font-black text-white">Escanea para Entrar a la Partida</h2>
              <p className="text-white/60 text-xs mt-1">
                Apunta la cámara de tu celular a este código para unirte inmediatamente
              </p>
            </div>

            {/* Código QR Gigante */}
            <div className="p-6 bg-white rounded-3xl shadow-2xl border-4 border-purple-500 inline-block mx-auto">
              <QRCodeSVG
                value={qrUrl}
                size={320}
                level="H"
                includeMargin={false}
                fgColor="#1e1b4b"
              />
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5 text-center">
              <span className="text-xs text-white/60 font-semibold block uppercase tracking-wider">
                Código PIN de la Partida:
              </span>
              <div className="text-4xl font-black tracking-widest text-yellow-400 font-mono">
                {token}
              </div>
              <p className="text-[11px] text-white/40 truncate">{qrUrl}</p>
            </div>

            <button
              onClick={() => setQrExpanded(false)}
              className="w-full btn-primary py-3 rounded-xl text-sm font-bold shadow-lg shadow-purple-600/30"
            >
              Cerrar Vista Ampliada
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DE DIAGNÓSTICO PEDAGÓGICO INDIVIDUAL (ERRORES Y ACIERTOS) ── */}
      {selectedStudentForReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedStudentForReport(null)}
        >
          <div
            className="card max-w-2xl w-full max-h-[85vh] flex flex-col p-6 border-purple-500/40 shadow-2xl bg-slate-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <MascotAvatar avatar={selectedStudentForReport.avatar} size="md" />
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{selectedStudentForReport.nickname}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 font-extrabold">
                      {selectedStudentForReport.score.toLocaleString()} pts
                    </span>
                  </h3>
                  <p className="text-xs text-white/50">
                    Diagnóstico pedagógico: preguntas acertadas y respuestas en las que se equivocó
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentForReport(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
              >
                ✕
              </button>
            </div>

            {/* Lista detallada de preguntas y respuestas */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {questions.map((q, qIdx) => {
                const history = studentAnswersHistory[selectedStudentForReport.id] || [];
                const ans = history.find((h) => h.questionIndex === qIdx);
                const isCorrect = ans ? ans.isCorrect : false;
                const isTimeout = ans ? ans.isTimeout : true;
                const selectedText = ans ? ans.selectedText : '⏰ Tiempo Agotado (No respondió)';
                const correctText = q.options?.find((o) => o.isCorrect)?.text || String(q.correctAnswer);

                return (
                  <div
                    key={q.id || qIdx}
                    className={`p-4 rounded-xl border ${
                      isCorrect
                        ? 'border-emerald-500/30 bg-emerald-950/20'
                        : 'border-rose-500/40 bg-rose-950/20'
                    } space-y-2`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-black text-white/90">
                        Pregunta {qIdx + 1}: {q.content}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-500/30 text-emerald-300'
                            : isTimeout
                            ? 'bg-amber-500/30 text-amber-300'
                            : 'bg-rose-500/30 text-rose-300'
                        }`}
                      >
                        {isCorrect ? '✅ ACERTÓ' : isTimeout ? '⏰ TIEMPO AGOTADO' : '❌ SE EQUIVOCÓ'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div
                        className={`p-2.5 rounded-lg border ${
                          isCorrect
                            ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-200'
                            : 'bg-rose-900/30 border-rose-500/40 text-rose-200'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold text-white/50 block">
                          Marcó el estudiante:
                        </span>
                        <span className="font-semibold">{selectedText}</span>
                      </div>
                      {!isCorrect && (
                        <div className="p-2.5 rounded-lg border bg-emerald-900/30 border-emerald-500/40 text-emerald-200">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                            Respuesta Correcta:
                          </span>
                          <span className="font-semibold">{correctText}</span>
                        </div>
                      )}
                    </div>

                    {q.explanation && (
                      <div className="p-2.5 rounded-lg bg-white/5 text-[11px] text-purple-200 border border-white/5">
                        💡 <strong>Explicación docente:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedStudentForReport(null)}
                className="btn-secondary py-2 px-5 rounded-xl text-xs font-bold"
              >
                Cerrar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FULLSCREEN ZOOM QR PARA UNIRSE EN VIVO DURANTE LA PARTIDA ── */}
      {showLiveQrZoom && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-purple-500/50 rounded-3xl p-6 sm:p-10 max-w-md w-full text-center shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowLiveQrZoom(false)}
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              title="Cerrar QR"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mx-auto mb-3">
              <QrCode className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-white">¡Únete a la Partida en Vivo!</h3>
            <p className="text-sm text-purple-200 mt-1 mb-6">Escanea con tu cámara o celular para ingresar de inmediato</p>

            <div className="bg-white p-5 rounded-3xl shadow-2xl inline-block mx-auto mb-6">
              <QRCodeSVG value={qrUrl} size={260} level="M" />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-around">
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-widest block font-bold">CÓDIGO PIN</span>
                <span className="text-3xl font-black text-yellow-400 tracking-widest">{token}</span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-widest block font-bold">ENLACE DIRECTO</span>
                <span className="text-xs text-white/70 font-mono">{qrUrl}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
