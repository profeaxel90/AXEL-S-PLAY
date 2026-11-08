import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { audioEngine, OFFICIAL_TRACK_NAME, OFFICIAL_TRACK_URL } from '../../lib/audio';
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
  Volume2, VolumeX, ShieldAlert, Award, Image as ImageIcon,
  Maximize2, Minimize2, X
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

  // Estados visuales mejorados: QR ampliado, secuencia intro y música lobby
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

        // Actualizar puntaje del estudiante real asegurando concordancia por ID o Nickname
        setLiveParticipants((prev) =>
          prev.map((p) => {
            const isMatch = (msg.participantId && p.id === msg.participantId) ||
                            (msg.nickname && p.nickname === msg.nickname);
            if (!isMatch) return p;

            const updatedScore = msg.newScore !== undefined
              ? msg.newScore
              : (p.score + (msg.pointsEarned || 0));

            const isCorrect = msg.isCorrect !== undefined
              ? msg.isCorrect
              : ((msg.pointsEarned || 0) > 0);

            return {
              ...p,
              score: updatedScore,
              correctAnswers: isCorrect ? (p.correctAnswers || 0) + 1 : (p.correctAnswers || 0),
            };
          })
        );

        audioEngine.playEffect('sfx_tick');
      } else if (msg.type === 'STEAL_RESULT') {
        if (msg.success) {
          const amt = msg.amount || 50;
          const from = msg.fromNickname || 'Estudiante';
          const to = msg.toNickname || 'Estudiante';
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
    setIntroCountNum(1);
    audioEngine.playEffect('sfx_tick');

    // Transmitir a todos los celulares la secuencia de inicio
    hostSyncRef.current?.broadcast('START_INTRO', {
      introStep: 1,
      introCount: 1,
      introTitle: gameData?.title || 'Seguridad Vial y Normas de Tránsito',
      introDescription: gameData?.description || 'Evaluación interactiva y gamificada con retos en tiempo real.',
    });

    // Secuencia de Cuenta Regresiva: 1, 2, 3
    const t2 = setTimeout(() => {
      setIntroCountNum(2);
      audioEngine.playEffect('sfx_tick');
    }, 1100);

    const t3 = setTimeout(() => {
      setIntroCountNum(3);
      audioEngine.playEffect('sfx_tick');
    }, 2200);

    // Paso 2: Mostrar TEMA DE LA PARTIDA (3.3s)
    const tTema = setTimeout(() => {
      setIntroStep(2);
      audioEngine.playEffect('sfx_power_up');
      hostSyncRef.current?.broadcast('START_INTRO', {
        introStep: 2,
        introTitle: gameData?.title || 'Seguridad Vial y Normas de Tránsito',
      });
    }, 3300);

    // Paso 3: AXEL'S PLAY EN PRESENTACIÓN CINEMATOGRÁFICA LEGIBLE (5.6s - Fanfarria limpia sin voz)
    const tZoom = setTimeout(() => {
      setIntroStep(3);
      audioEngine.playEffect('sfx_intro');
      hostSyncRef.current?.broadcast('START_INTRO', {
        introStep: 3,
        introTitle: "AXEL'S PLAY",
      });
    }, 5600);

    // Paso 4: ¡EMPIEZA EL JUEGO! (12.6s — la pantalla AXEL'S PLAY dura 7s completos para máxima legibilidad)
    const tStart = setTimeout(() => {
      handleStartQuestions();
    }, 12600);
  };

  const handleStartQuestions = () => {
    setGamePhase('question');
    setCurrentQIndex(0);
    setIsAnswerRevealed(false);
    setAnsweredCount(0);
    setIsStealAuthorized(false);
    const firstQ = questions[0];
    setTimerLeft(firstQ.timeLimit || 20);

    // Guardar puntajes y rankings iniciales para animación de subida/bajada
    const initialSorted = [...liveParticipants].sort((a, b) => b.score - a.score);
    prevRanksRef.current = new Map(initialSorted.map((p, idx) => [p.id, idx + 1]));
    roundStartScoresRef.current = new Map(liveParticipants.map((p) => [p.id, p.score]));

    // Iniciar la música repetitiva de la pregunta (se detiene cuando todos responden)
    audioEngine.playQuestionMusic();

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
    setIsStealAuthorized(false);
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

    // Guardar puntajes y rankings de la ronda anterior para calcular ascensos y descensos
    const prevSorted = [...liveParticipants].sort((a, b) => b.score - a.score);
    prevRanksRef.current = new Map(prevSorted.map((p, idx) => [p.id, idx + 1]));
    roundStartScoresRef.current = new Map(liveParticipants.map((p) => [p.id, p.score]));

    // Iniciar la música repetitiva de la siguiente pregunta
    audioEngine.playQuestionMusic();

    hostSyncRef.current?.broadcast('QUESTION', {
      question: nextQ,
      index: nextIdx,
      total: questions.length,
      timeLimit: nextQ.timeLimit || 20,
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
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nickname)}`,
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
          ptsDelta = Math.floor(550 + speedFactor * 420);
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
            return {
              ...p,
              score: Math.max(0, p.score + ptsDelta),
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

          {gamePhase === 'question' && (
            <>
              <button
                onClick={handlePauseResume}
                className="btn-secondary py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {isPaused ? <Play className="w-4 h-4 text-green-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
              </button>

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
        </div>
      )}

      {/* ── FASE INTRO: SECUENCIA CINEMATOGRÁFICA (1, 2, 3 -> TEMA -> AXEL'S PLAY EN ZOOM) ── */}
      {gamePhase === 'intro' && (
        <div className="card p-8 md:p-14 border-purple-500/50 bg-gradient-to-b from-purple-950/70 via-slate-950 to-slate-950 text-center shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col items-center justify-center">
          {/* PASO 1: CONTEO ANIMADO 1, 2, 3 */}
          {introStep === 1 && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in">
              <span className="text-xs font-black uppercase tracking-widest text-purple-300 bg-purple-500/20 px-4 py-1.5 rounded-full border border-purple-500/40">
                ¡PREPARADOS EN SUS CELULARES!
              </span>
              <div
                key={introCountNum}
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.6)] border-4 border-yellow-300 animate-bounce-in"
              >
                <span className="text-8xl sm:text-9xl font-black text-white tracking-tighter drop-shadow-2xl">
                  {introCountNum}
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-yellow-300 tracking-wider animate-pulse">
                {introCountNum === 1 ? '¡Uno!' : introCountNum === 2 ? '¡Dos!' : '¡Tres!'}
              </p>
            </div>
          )}

          {/* PASO 2: NOMBRE DEL TEMA */}
          {introStep === 2 && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in max-w-4xl mx-auto p-4">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 text-xs font-black uppercase tracking-widest shadow-lg animate-pulse">
                <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
                <span>TEMA DE LA ACTIVIDAD</span>
              </div>
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-amber-300 leading-tight drop-shadow-[0_10px_35px_rgba(234,179,8,0.4)] animate-bounce-in">
                {gameData?.title || 'Seguridad Vial y Normas de Tránsito'}
              </h1>
              <p className="text-white/70 text-sm sm:text-base max-w-2xl mx-auto">
                {gameData?.description || 'Responde con rapidez y precisión para acumular la mayor cantidad de puntos.'}
              </p>
            </div>
          )}

          {/* PASO 3: AXEL'S PLAY EN PRESENTACIÓN CINEMATOGRÁFICA LEGIBLE (7 SEGUNDOS) */}
          {introStep === 3 && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in relative max-w-4xl mx-auto py-8">
              <div className="absolute -inset-20 bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-400 rounded-full blur-3xl opacity-40 animate-pulse pointer-events-none" />
              
              <div className="relative">
                <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-4 py-1.5 rounded-full inline-block mb-4 shadow-sm animate-pulse">
                  ⭐ Plataforma de Evaluación Gamificada ⭐
                </span>
                <h1 className="text-6xl sm:text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-purple-200 to-pink-300 tracking-tight drop-shadow-[0_15px_60px_rgba(168,85,247,0.9)] select-none">
                  AXEL'S PLAY
                </h1>
              </div>

              <div className="space-y-3 pt-2 text-center">
                <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-wide drop-shadow-md">
                  ¡PREPARADOS PARA LA PRIMERA PREGUNTA!
                </p>
                <p className="text-xs sm:text-sm text-purple-200/80">
                  Mira la pantalla gigante, piensa rápido y responde en tu teléfono
                </p>

                {/* Barra de progreso de lectura pausada de 7 segundos */}
                <div className="w-64 sm:w-80 h-2 bg-white/10 rounded-full overflow-hidden mx-auto mt-4 border border-white/20">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 rounded-full animate-pulse"
                    style={{
                      width: '100%',
                      animation: 'progress7s 7s linear forwards',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botón de Salto Rápido para el Docente */}
          <div className="mt-8 pt-4">
            <button
              onClick={handleStartQuestions}
              className="py-2.5 px-6 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Iniciar Pregunta 1 Inmediatamente →
            </button>
          </div>
        </div>
      )}

      {/* ── FASE 2: PREGUNTA EN PANTALLA GIGANTE (PROYECTOR ESTILO KAHOOT) ── */}
      {gamePhase === 'question' && (
        <div className="space-y-6">
          {/* Header de Pregunta en Proyector */}
          <div className="card p-6 border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 text-center relative overflow-hidden shadow-2xl">
            {/* ── CONTADOR REGRESIVO GIGANTE Y BARRA SUPERIOR ── */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950/70 border border-purple-500/40 shadow-inner mb-4">
              {/* RELOJ GIGANTESCO */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-28 h-28 sm:w-36 sm:h-36 rounded-3xl flex flex-col items-center justify-center border-4 transition-all duration-300 shadow-2xl ${
                    timerLeft <= 5
                      ? 'bg-red-950/90 border-red-500 text-red-400 shadow-red-600/60 animate-pulse scale-105'
                      : 'bg-purple-950/70 border-purple-400/70 text-yellow-300 shadow-purple-600/40'
                  }`}
                >
                  <span className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tighter leading-none">
                    {timerLeft}
                  </span>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/70 mt-1">
                    SEGUNDOS
                  </span>
                </div>

                <div className="text-left space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-purple-600/30 border border-purple-400 text-purple-200 font-black text-xs uppercase tracking-wider">
                      Pregunta {currentQIndex + 1} de {questions.length}
                    </span>
                    {currentQ.pointsMultiplier && currentQ.pointsMultiplier > 1 && (
                      <span className="px-3 py-1 rounded-full bg-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-lg shadow-yellow-400/30 animate-bounce">
                        <Zap className="w-3.5 h-3.5 fill-slate-950" />
                        <span>¡PUNTOS {currentQ.pointsMultiplier === 2 ? 'DOBLES (2×)' : 'TRIPLES (3×)'}!</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span>
                      Respuestas Recibidas:{' '}
                      <strong className="text-yellow-400 text-xl font-black">{answeredCount}</strong> / {liveParticipants.length}
                    </span>
                  </div>

                  {isStealAuthorized ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-green-300 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/40 animate-pulse">
                      ⚡ Poder de Robo de Puntos AUTORIZADO
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/50 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                      🔒 Robo de Puntos esperando tu activación
                    </span>
                  )}
                </div>
              </div>

              {/* Controles del Docente durante la Pregunta */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={handleAuthorizeStealPower}
                  disabled={isStealAuthorized}
                  className={`py-3 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                    isStealAuthorized
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 cursor-default'
                      : 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-rose-500 text-white shadow-xl shadow-red-600/30 hover:scale-105 active:scale-95 animate-pulse'
                  }`}
                  title="Autoriza a los estudiantes para que puedan usar el botón de robo de puntos en su celular"
                >
                  <Zap className={`w-4 h-4 ${isStealAuthorized ? 'fill-yellow-400 text-yellow-400' : 'fill-white text-white'}`} />
                  <span>{isStealAuthorized ? '✓ Robo de Puntos Autorizado' : '⚡ Autorizar Robo de Puntos'}</span>
                </button>

                {!isAnswerRevealed ? (
                  <button
                    onClick={handleRevealAnswer}
                    className="py-3 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Revelar Respuesta</span>
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="py-3 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-slate-950 shadow-xl shadow-green-500/40 hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <span>Siguiente Pregunta</span>
                    <SkipForward className="w-4 h-4 fill-slate-950" />
                  </button>
                )}
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
                            <img src={p.avatar} alt={p.nickname} className="w-7 h-7 rounded-lg bg-slate-800 border border-white/10" />
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

      {/* ── TABLA DE CLASIFICACIÓN TOP 5 COMPACTA Y ANIMADA FÍSICAMENTE ── */}
      {showLeaderboard && leaderboardData.length > 0 && gamePhase === 'question' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="card max-w-md w-full p-4 sm:p-5 border-purple-500/40 bg-slate-900/95 shadow-2xl text-center space-y-2.5 rounded-2xl max-h-[92vh] overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base sm:text-lg font-black text-white">
                  Clasificación · TOP 5 🏆
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-xs px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70"
              >
                Cerrar ✕
              </button>
            </div>

            {/* Notificación compacta de Robo de Puntos si ocurrió */}
            {latestStealEvent && (
              <div className="py-1 px-3 rounded-xl bg-gradient-to-r from-red-600/30 via-amber-600/30 to-yellow-600/30 border border-yellow-400/40 text-yellow-200 text-[11px] font-black flex items-center justify-center gap-1.5 animate-bounce-in shadow-sm">
                <span>🗡️</span>
                <span>¡{latestStealEvent.from} robó {latestStealEvent.amount} pts a {latestStealEvent.to}!</span>
              </div>
            )}

            {/* Lista de Filas Compactas con Desplazamiento Físico Animado (Sin badges de texto) */}
            <div className="space-y-1.5 relative overflow-hidden py-1">
              {leaderboardData.slice(0, 5).map((p, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;
                const medal = isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`;
                const prev = p.prevScore !== undefined ? p.prevScore : Math.max(0, p.score - 100);
                const gained = p.score - prev;
                const rankDelta = p.rankDelta !== undefined ? p.rankDelta : 0;

                // Desplazamiento físico: si subió puestos parte de abajo; si bajó parte de arriba
                const rowHeight = 52;
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
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
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
                      <img
                        src={p.avatar}
                        alt={p.nickname}
                        className="w-8 h-8 rounded-lg object-contain bg-slate-800 p-0.5 border border-white/15 shrink-0"
                      />
                      <div className="text-left truncate">
                        <span className="font-extrabold text-xs sm:text-sm text-white truncate block max-w-[130px] sm:max-w-[170px]">
                          {p.nickname}
                        </span>
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
                <img
                  src={selectedStudentForReport.avatar}
                  alt={selectedStudentForReport.nickname}
                  className="w-11 h-11 rounded-2xl bg-slate-800 border border-white/15 p-0.5"
                />
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
    </div>
  );
}
