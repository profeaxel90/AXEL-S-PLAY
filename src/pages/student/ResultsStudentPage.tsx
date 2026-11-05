import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { Trophy, Medal, Crown, ArrowLeft, Star } from 'lucide-react';
import type { ParticipantRank } from '../../types';

export default function ResultsStudentPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { currentParticipant, rankings } = useSessionStore();

  useEffect(() => {
    audioEngine.setContext('podium');
  }, []);

  // Solo participantes REALES
  const sorted: ParticipantRank[] = [...rankings].sort((a, b) => b.score - a.score);
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  // Encontrar la posición personal del participante real
  const myId = currentParticipant?.id;
  const myIndex = sorted.findIndex((p) => p.participantId === myId || p.nickname === currentParticipant?.nickname);
  const myRank = myIndex >= 0 ? myIndex + 1 : (currentParticipant?.rank || 1);
  const myScore = currentParticipant?.score || (myIndex >= 0 ? sorted[myIndex].score : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/70 to-slate-950 text-white flex flex-col items-center justify-center p-4 md:p-8 select-none">
      <div className="card max-w-lg w-full border-purple-500/30 p-6 md:p-8 text-center relative overflow-hidden shadow-2xl backdrop-blur-xl bg-slate-900/85">
        {/* Glow de victoria */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Podium Banner */}
        <div className="mb-4">
          <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-1 animate-bounce" />
          <h1 className="text-3xl font-black text-white">¡Gran Final!</h1>
          <p className="text-purple-300 font-bold text-xs mt-1">
            Partida completada • Conoce el Podio Olímpico
          </p>
        </div>

        {/* ── Podio Olímpico de los Jugadores REALES ── */}
        {sorted.length === 0 ? (
          <div className="p-8 text-white/50 text-xs">
            Partida finalizada. Esperando sincronización del podio...
          </div>
        ) : (
          <div className="flex items-end justify-center gap-2.5 my-6 pt-4">
            {/* 🥈 2do Lugar (Plata - Solo si hay al menos 2 jugadores) */}
            {second && (
              <div className="flex-1 flex flex-col items-center">
                <div className="w-13 h-13 rounded-2xl bg-slate-400/20 p-1 border border-slate-300/40 mb-1">
                  <img src={second.avatar} alt={second.nickname} className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xs text-white truncate max-w-full">{second.nickname}</span>
                <span className="text-[10px] text-slate-300 font-semibold mb-1">{second.score.toLocaleString()} pts</span>
                <div className="w-full h-20 rounded-t-xl bg-slate-400/20 border-t-2 border-slate-300/40 flex items-center justify-center shadow-lg">
                  <span className="font-black text-xl text-slate-300">2°</span>
                </div>
              </div>
            )}

            {/* 🥇 1er Lugar (Oro - Centro) */}
            {first && (
              <div className="flex-1 flex flex-col items-center -mt-4">
                <div className="w-16 h-16 rounded-3xl bg-yellow-400/30 p-1 border-2 border-yellow-400 shadow-xl shadow-yellow-500/40 mb-1 animate-float">
                  <img src={first.avatar} alt={first.nickname} className="w-full h-full object-contain" />
                </div>
                <span className="font-black text-xs text-yellow-300 truncate max-w-full">{first.nickname}</span>
                <span className="text-xs text-yellow-400 font-extrabold mb-1">{first.score.toLocaleString()} pts</span>
                <div className="w-full h-28 rounded-t-2xl bg-gradient-to-t from-yellow-600/40 to-yellow-400/30 border-t-4 border-yellow-400 flex flex-col items-center justify-center shadow-2xl shadow-yellow-500/30">
                  <Trophy className="w-7 h-7 text-yellow-400 mb-0.5 animate-pulse" />
                  <span className="font-black text-2xl text-yellow-400">1°</span>
                </div>
              </div>
            )}

            {/* 🥉 3er Lugar (Bronce - Solo si hay al menos 3 jugadores) */}
            {third && (
              <div className="flex-1 flex flex-col items-center">
                <div className="w-13 h-13 rounded-2xl bg-amber-700/20 p-1 border border-amber-600/40 mb-1">
                  <img src={third.avatar} alt={third.nickname} className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xs text-white truncate max-w-full">{third.nickname}</span>
                <span className="text-[10px] text-amber-400 font-semibold mb-1">{third.score.toLocaleString()} pts</span>
                <div className="w-full h-16 rounded-t-xl bg-amber-700/20 border-t-2 border-amber-600/40 flex items-center justify-center shadow-md">
                  <span className="font-black text-lg text-amber-400">3°</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tu Resultado Personal ── */}
        <div className="p-4 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-center mb-6">
          <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider mb-0.5">
            Tu Desempeño
          </div>
          <div className="text-xl font-black text-white flex items-center justify-center gap-1.5">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span>{currentParticipant?.nickname || 'Tú'} • Puesto #{myRank}</span>
          </div>
          <div className="text-xs text-purple-200 mt-1 font-semibold">
            {myScore.toLocaleString()} puntos acumulados
          </div>
        </div>

        {/* Botón Salir */}
        <Link
          to="/"
          className="btn-secondary w-full py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
      </div>
    </div>
  );
}
