import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { Trophy, Medal, Crown, CheckCircle2, Clock, ArrowLeft, Sparkles } from 'lucide-react';

export default function ResultsStudentPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { currentParticipant, rankings } = useSessionStore();

  useEffect(() => {
    audioEngine.setContext('podium');
  }, []);

  const participant = currentParticipant || {
    id: 'p-1',
    sessionId: sessionId || 'sess-1',
    nickname: 'Tu Apodo',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ProfeAxel',
    score: 4850,
    rank: 1,
    isConnected: true,
    joinedAt: new Date().toISOString(),
    correctAnswers: 5,
    wrongAnswers: 0,
    avgTimePerAnswer: 3.2,
  };

  const topThree = [
    { rank: 1, nickname: 'SuperMate', score: 4850, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Astro' },
    { rank: 2, nickname: 'VelocidadPro', score: 4200, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ninja' },
    { rank: 3, nickname: 'EcoGenio', score: 3950, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/70 to-slate-950 text-white flex flex-col items-center justify-center p-4 md:p-8">
      <div className="card max-w-xl w-full border-purple-500/30 p-6 md:p-8 text-center relative overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Podium Banner */}
        <div className="mb-4">
          <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-1 animate-bounce" />
          <h1 className="text-3xl md:text-4xl font-black text-white">¡Gran Final!</h1>
          <p className="text-purple-300 font-bold text-xs mt-1">
            Partida completada • Mira los 3 primeros lugares
          </p>
        </div>

        {/* ── Podio Olímpico de los 3 Primeros ── */}
        <div className="flex items-end justify-center gap-3 my-6 pt-6">
          {/* 🥈 2do Lugar */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-400/30 p-1 border border-slate-300/40 mb-1">
              <img src={topThree[1].avatar} alt={topThree[1].nickname} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xs text-white truncate max-w-full">{topThree[1].nickname}</span>
            <span className="text-[10px] text-slate-300 font-semibold mb-1">{topThree[1].score} pts</span>
            <div className="w-full h-20 rounded-t-xl bg-slate-400/20 border-t-2 border-slate-300/40 flex items-center justify-center">
              <span className="font-black text-xl text-slate-300">2°</span>
            </div>
          </div>

          {/* 🥇 1er Lugar (Centro) */}
          <div className="flex-1 flex flex-col items-center -mt-4">
            <div className="w-18 h-18 rounded-3xl bg-yellow-400/30 p-1 border-2 border-yellow-400 shadow-lg shadow-yellow-500/30 mb-1">
              <img src={topThree[0].avatar} alt={topThree[0].nickname} className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-sm text-yellow-300 truncate max-w-full">{topThree[0].nickname}</span>
            <span className="text-xs text-yellow-400 font-extrabold mb-1">{topThree[0].score} pts</span>
            <div className="w-full h-28 rounded-t-2xl bg-yellow-500/30 border-t-4 border-yellow-400 flex flex-col items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-400 mb-0.5 animate-pulse" />
              <span className="font-black text-2xl text-yellow-400">1°</span>
            </div>
          </div>

          {/* 🥉 3er Lugar */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-700/30 p-1 border border-amber-600/40 mb-1">
              <img src={topThree[2].avatar} alt={topThree[2].nickname} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xs text-white truncate max-w-full">{topThree[2].nickname}</span>
            <span className="text-[10px] text-amber-400 font-semibold mb-1">{topThree[2].score} pts</span>
            <div className="w-full h-16 rounded-t-xl bg-amber-700/20 border-t-2 border-amber-600/40 flex items-center justify-center">
              <span className="font-black text-lg text-amber-400">3°</span>
            </div>
          </div>
        </div>

        {/* Tu Resultado Personal */}
        <div className="p-4 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-center mb-6">
          <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider mb-0.5">
            Tu Desempeño
          </div>
          <div className="text-2xl font-black text-white">
            {participant.nickname} • Puesto #{participant.rank || 1}
          </div>
          <div className="text-xs text-purple-200 mt-1">
            {participant.score.toLocaleString()} puntos obtenidos • {participant.correctAnswers} aciertos
          </div>
        </div>

        {/* Back Link */}
        <Link
          to="/"
          className="btn-secondary w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Inicio</span>
        </Link>
      </div>
    </div>
  );
}
