import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { generateSessionToken, buildQRUrl, shareSessionLink } from '../../lib/qr';
import { P2PHost } from '../../lib/p2p';
import { POWER_UPS } from '../../types';
import type { PowerUpType, Participant } from '../../types';
import {
  Play, Pause, SkipForward, Square, Users, QrCode,
  Zap, Share2, RefreshCw, Trophy, Medal, Crown,
  ArrowLeft, CheckCircle2, Sparkles, BarChart3, Star
} from 'lucide-react';

export default function SessionPage() {
  const { gameId } = useParams<{ gameId: string }>();

  // Token QR único
  const [token, setToken] = useState(() => generateSessionToken());
  const qrUrl = buildQRUrl(token);

  const {
    session,
    participants,
    currentQuestion,
    questionIndex,
    phase,
    startSession,
    pauseSession,
    resumeSession,
    nextQuestion,
    endSession,
    grantPower,
    grantPowerToAll,
  } = useSessionStore();

  const [isPaused, setIsPaused] = useState(false);
  const [selectedStudentForPower, setSelectedStudentForPower] = useState<Participant | null>(null);
  const [powerModalOpen, setPowerModalOpen] = useState(false);
  const [globalPowerModalOpen, setGlobalPowerModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [globalPowerSuccess, setGlobalPowerSuccess] = useState<string | null>(null);
  const p2pHostRef = useRef<P2PHost | null>(null);

  // Inicializar servidor P2P WebRTC para celulares en cualquier red
  useEffect(() => {
    const host = new P2PHost(token);
    p2pHostRef.current = host;
    host.init().then(() => {
      host.onMessage = (msg) => {
        if (msg.type === 'JOIN') {
          setLiveParticipants((prev) => {
            const exists = prev.some((p) => p.nickname === msg.participant.nickname);
            const updated = exists ? prev : [...prev, msg.participant];
            host.broadcast({ type: 'ROOM_UPDATE', participants: updated });
            return updated;
          });
          audioEngine.playEffect('sfx_join');
        } else if (msg.type === 'ANSWER') {
          setLiveParticipants((prev) =>
            prev.map((p) => (p.id === msg.participantId ? { ...p, score: p.score + 1000 } : p))
          );
        }
      };
    });

    return () => {
      host.destroy();
    };
  }, [token]);

  // Participantes activos (o demo si estamos en local)
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([
    {
      id: 'p-1',
      sessionId: 'sess-1',
      nickname: 'SuperMate',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Astro',
      score: 4850,
      isConnected: true,
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'p-2',
      sessionId: 'sess-1',
      nickname: 'VelocidadPro',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ninja',
      score: 4200,
      isConnected: true,
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'p-3',
      sessionId: 'sess-1',
      nickname: 'EcoGenio',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber',
      score: 3950,
      isConnected: true,
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'p-4',
      sessionId: 'sess-1',
      nickname: 'RayoCosmico',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Wizard',
      score: 3400,
      isConnected: true,
      joinedAt: new Date().toISOString(),
    },
  ]);

  const activeParticipants = participants.length > 0 ? participants : liveParticipants;

  // Ordenados para el podio
  const sortedParticipants = [...activeParticipants].sort((a, b) => b.score - a.score);
  const firstPlace = sortedParticipants[0];
  const secondPlace = sortedParticipants[1];
  const thirdPlace = sortedParticipants[2];

  useEffect(() => {
    if (phase === 'finished') {
      audioEngine.setContext('podium');
    } else {
      audioEngine.setContext('lobby');
    }
    return () => {
      audioEngine.stopMusic();
    };
  }, [phase]);

  const handleStart = async () => {
    audioEngine.setContext('game_start');
    p2pHostRef.current?.broadcast({ type: 'START_GAME' });
    await startSession();
  };

  const handleNext = async () => {
    audioEngine.playEffect('sfx_round_change');
    await nextQuestion();
  };

  const handlePauseResume = async () => {
    if (isPaused) {
      p2pHostRef.current?.broadcast({ type: 'RESUME' });
      await resumeSession();
      setIsPaused(false);
    } else {
      p2pHostRef.current?.broadcast({ type: 'PAUSE' });
      await pauseSession();
      setIsPaused(true);
    }
  };

  const handleEnd = async () => {
    audioEngine.setContext('podium');
    p2pHostRef.current?.broadcast({ type: 'GAME_OVER', rankings: sortedParticipants });
    await endSession();
  };

  const handleRegenerateQR = () => {
    const newToken = generateSessionToken();
    setToken(newToken);
    audioEngine.playEffect('sfx_tick');
  };

  const handleShareLink = async () => {
    const shared = await shareSessionLink(qrUrl, 'Únete a AXEL PLAY');
    if (shared) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleOpenPowerModal = (p: Participant) => {
    setSelectedStudentForPower(p);
    setPowerModalOpen(true);
    audioEngine.playEffect('sfx_tick');
  };

  const handleApplyPower = async (powerType: PowerUpType) => {
    if (!selectedStudentForPower) return;
    const power = POWER_UPS[powerType];
    p2pHostRef.current?.broadcast({ type: 'POWER', power, targetId: selectedStudentForPower.id });
    await grantPower(selectedStudentForPower.id, powerType);
    audioEngine.playEffect('sfx_power_up');
    setPowerModalOpen(false);
  };

  const handleApplyPowerToAll = async (powerType: PowerUpType) => {
    const power = POWER_UPS[powerType];
    p2pHostRef.current?.broadcast({ type: 'POWER', power });
    await grantPowerToAll(powerType);
    setGlobalPowerSuccess(`¡${power.label} activado para TODOS los participantes!`);
    audioEngine.playEffect('sfx_power_up');
    setGlobalPowerModalOpen(false);

    // Actualizar participantes locales también
    setLiveParticipants((prev) => prev.map((p) => ({ ...p, activePower: power })));

    setTimeout(() => setGlobalPowerSuccess(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/teacher/games"
            className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className={`badge ${phase === 'finished' ? 'badge-warning' : 'badge-primary'} text-[10px]`}>
                {phase === 'finished' ? 'PARTIDA FINALIZADA' : phase === 'question' ? 'EN JUEGO' : 'SALA DE ESPERA'}
              </span>
              <span className="text-white/40 text-xs">Token: {token.slice(0, 8)}...</span>
            </div>
            <h1 className="text-2xl font-black text-white">
              {phase === 'finished' ? '🏆 Gran Podio de Ganadores' : 'Partida en Tiempo Real'}
            </h1>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* BOTÓN PODER GLOBAL PARA TODOS */}
          {phase !== 'finished' && (
            <button
              onClick={() => setGlobalPowerModalOpen(true)}
              className="btn-primary py-2.5 px-4 rounded-xl text-xs font-black flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 border border-yellow-400/40 shadow-lg shadow-yellow-500/20 text-slate-950 hover:scale-105 transition-transform"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>⚡ Poder para TODOS</span>
            </button>
          )}

          {phase === 'waiting' && (
            <button
              onClick={handleStart}
              className="btn-success py-2.5 px-6 rounded-xl text-sm font-black flex items-center gap-2 shadow-lg shadow-green-600/30"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>INICIAR PARTIDA</span>
            </button>
          )}

          {phase === 'question' && (
            <>
              <button
                onClick={handlePauseResume}
                className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                {isPaused ? <Play className="w-4 h-4 text-green-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                <span>{isPaused ? 'Continuar' : 'Pausar'}</span>
              </button>

              <button
                onClick={handleNext}
                className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <SkipForward className="w-4 h-4" />
                <span>Siguiente Pregunta</span>
              </button>

              <button
                onClick={handleEnd}
                className="btn-danger py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                <span>Finalizar y Ver Podio</span>
              </button>
            </>
          )}

          {phase === 'finished' && (
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

      {/* ── VISTA DE PODIO OLÍMPICO (SI TERMINÓ LA PARTIDA) ── */}
      {phase === 'finished' ? (
        <div className="card p-8 md:p-12 border-purple-500/30 bg-gradient-to-b from-purple-950/60 via-slate-900 to-slate-950 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 mb-8">
            <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-2 animate-bounce" />
            <h2 className="text-4xl md:text-5xl font-black text-white">¡PODIO DE CAMPEONES!</h2>
            <p className="text-purple-300 font-semibold text-sm mt-1">
              Felicitaciones a los participantes más destacados de la partida
            </p>
          </div>

          {/* 3D Olympic Podium Structure */}
          <div className="max-w-2xl mx-auto flex items-end justify-center gap-3 md:gap-6 pt-12 pb-6">
            {/* 🥈 2do Lugar (Izquierda) */}
            {secondPlace && (
              <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-3 group animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-200 p-1 shadow-lg shadow-slate-400/30">
                    <img src={secondPlace.avatar} alt={secondPlace.nickname} className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-slate-300 text-slate-950 font-black text-[11px] shadow-md">
                    #2
                  </div>
                </div>
                <div className="font-black text-sm md:text-base text-white truncate max-w-full">
                  {secondPlace.nickname}
                </div>
                <div className="text-xs text-slate-300 font-bold mb-2">
                  {secondPlace.score.toLocaleString()} pts
                </div>

                {/* Plataforma 2do */}
                <div className="w-full h-36 md:h-44 rounded-t-2xl bg-gradient-to-b from-slate-400/30 via-slate-500/20 to-slate-800/40 border-t-4 border-l border-r border-slate-300/40 flex flex-col items-center justify-center p-3 shadow-xl">
                  <Medal className="w-8 h-8 text-slate-300 mb-1" />
                  <span className="font-black text-2xl md:text-3xl text-slate-300">2°</span>
                </div>
              </div>
            )}

            {/* 🥇 1er Lugar (Centro - Más Alto) */}
            {firstPlace && (
              <div className="flex-1 flex flex-col items-center z-10">
                <div className="relative mb-3 group animate-bounce-in">
                  <Crown className="w-8 h-8 text-yellow-400 absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce" />
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-600 p-1.5 shadow-2xl shadow-yellow-500/50">
                    <img src={firstPlace.avatar} alt={firstPlace.nickname} className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-yellow-500/40">
                    #1
                  </div>
                </div>
                <div className="font-black text-base md:text-lg text-white truncate max-w-full">
                  {firstPlace.nickname}
                </div>
                <div className="text-sm text-yellow-400 font-extrabold mb-2">
                  {firstPlace.score.toLocaleString()} pts
                </div>

                {/* Plataforma 1er */}
                <div className="w-full h-48 md:h-60 rounded-t-3xl bg-gradient-to-b from-yellow-500/40 via-amber-600/20 to-slate-800/50 border-t-4 border-l border-r border-yellow-400/60 flex flex-col items-center justify-center p-4 shadow-2xl">
                  <Trophy className="w-12 h-12 text-yellow-400 mb-2 drop-shadow-md animate-pulse" />
                  <span className="font-black text-4xl md:text-5xl text-yellow-400">1°</span>
                  <span className="text-[10px] text-yellow-200/80 uppercase font-black tracking-widest mt-1">Campeón</span>
                </div>
              </div>
            )}

            {/* 🥉 3er Lugar (Derecha) */}
            {thirdPlace && (
              <div className="flex-1 flex flex-col items-center">
                <div className="relative mb-3 group animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <div className="w-18 h-18 md:w-22 md:h-22 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 p-1 shadow-lg shadow-amber-700/30">
                    <img src={thirdPlace.avatar} alt={thirdPlace.nickname} className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-600 text-white font-black text-[11px] shadow-md">
                    #3
                  </div>
                </div>
                <div className="font-black text-sm md:text-base text-white truncate max-w-full">
                  {thirdPlace.nickname}
                </div>
                <div className="text-xs text-amber-400 font-bold mb-2">
                  {thirdPlace.score.toLocaleString()} pts
                </div>

                {/* Plataforma 3er */}
                <div className="w-full h-28 md:h-36 rounded-t-2xl bg-gradient-to-b from-amber-700/30 via-amber-800/20 to-slate-800/40 border-t-4 border-l border-r border-amber-600/40 flex flex-col items-center justify-center p-3 shadow-xl">
                  <Medal className="w-7 h-7 text-amber-500 mb-1" />
                  <span className="font-black text-xl md:text-2xl text-amber-400">3°</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/teacher/analytics"
              className="btn-primary py-3 px-6 rounded-2xl text-sm font-bold flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analítica y Exportar Informe a Excel/PDF</span>
            </Link>
          </div>
        </div>
      ) : (
        /* ── PROYECCIÓN DEL QR Y SALA DE ESPERA / PREGUNTAS ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: QR Grande Proyectable */}
          <div className="card p-8 border-purple-500/30 bg-gradient-to-b from-purple-950/40 to-slate-900 text-center flex flex-col items-center justify-between shadow-2xl">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold mb-4">
                <QrCode className="w-4 h-4 text-yellow-400" />
                <span>ACCESO EXCLUSIVO CON CÁMARA</span>
              </div>
              <h2 className="text-xl font-black text-white mb-1">
                Escanea con tu celular para unirte
              </h2>
              <p className="text-white/60 text-xs mb-6">
                Abre la cámara normal de tu teléfono móvil y apunta al código.
              </p>
            </div>

            {/* Canvas QR */}
            <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-purple-600/30 border-4 border-purple-500/50 my-2">
              <QRCodeSVG
                value={qrUrl}
                size={240}
                level="H"
                includeMargin={false}
                fgColor="#1e1b4b"
              />
            </div>

            <div className="w-full mt-6 space-y-3">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 truncate">
                {qrUrl}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleShareLink}
                  className="btn-secondary py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  title="Copiar enlace o compartir"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copyFeedback ? '¡Copiado!' : 'Compartir'}</span>
                </button>

                <button
                  onClick={handleRegenerateQR}
                  className="btn-secondary py-2 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  title="Regenerar código QR por seguridad"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Regenerar QR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Participantes Conectados */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header Participantes */}
            <div className="card p-5 border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Participantes Conectados ({activeParticipants.length})
                  </h3>
                  <p className="text-white/50 text-xs">
                    Toca en un participante para darle un <strong className="text-yellow-400">Poder Individual</strong> o usa el botón superior para dar a <strong className="text-yellow-400">TODOS ⚡</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Grid de Participantes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {activeParticipants.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleOpenPowerModal(p)}
                  className="card p-3 border-white/10 hover:border-purple-500/50 bg-white/[0.04] hover:bg-purple-600/10 cursor-pointer transition-all duration-200 flex flex-col items-center text-center relative group"
                >
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-2xl bg-purple-600/20 border border-purple-500/40 p-1 mb-2 group-hover:scale-105 transition-transform">
                    <img
                      src={p.avatar}
                      alt={p.nickname}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="font-bold text-xs text-white truncate max-w-full">
                    {p.nickname}
                  </div>

                  <div className="text-[10px] text-purple-300 font-semibold mt-0.5">
                    {p.score} pts
                  </div>

                  {/* Badge de Poder si tiene uno asignado */}
                  {p.activePower && (
                    <div className="mt-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 flex items-center gap-1">
                      <span>{p.activePower.icon}</span>
                      <span>{p.activePower.label}</span>
                    </div>
                  )}

                  {/* Botón flotante para otorgar poder */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="p-1 rounded-md bg-yellow-400 text-slate-950 font-black text-[10px] flex items-center gap-0.5 shadow-md">
                      <Zap className="w-3 h-3 fill-slate-950" />
                    </span>
                  </div>
                </div>
              ))}
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
                    onClick={() => handleApplyPower(key)}
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
