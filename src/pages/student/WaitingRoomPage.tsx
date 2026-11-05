import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { P2PClient } from '../../lib/p2p';
import { Gamepad2, Users, Sparkles, Smile, ShieldCheck } from 'lucide-react';

export default function WaitingRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { session, currentParticipant, participants, phase, subscribeToSession, unsubscribeFromSession } = useSessionStore();

  useEffect(() => {
    if (sessionId) {
      subscribeToSession(sessionId);
    }
    audioEngine.setContext('lobby');

    // Conexión directa P2P con el docente
    let client: P2PClient | null = null;
    if (sessionId && currentParticipant) {
      client = new P2PClient(sessionId);
      client.connect(currentParticipant);
      client.onMessage = (msg) => {
        if (msg.type === 'START_GAME' || msg.type === 'QUESTION') {
          audioEngine.setContext('game_start');
          navigate(`/game/${sessionId}`);
        }
      };
    }

    return () => {
      unsubscribeFromSession();
      client?.destroy();
    };
  }, [sessionId, subscribeToSession, unsubscribeFromSession, currentParticipant, navigate]);

  // Si la partida arranca (phase pasa a 'question'), redirigir a la pantalla de juego
  useEffect(() => {
    if (phase === 'question' && sessionId) {
      navigate(`/game/${sessionId}`);
    }
  }, [phase, sessionId, navigate]);

  const handleSendEmote = () => {
    audioEngine.playEffect('sfx_tick');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/60 to-slate-950 text-white flex flex-col justify-between p-4 md:p-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <span className="font-black text-xl">AXEL PLAY</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-semibold">
          <Users className="w-4 h-4 text-purple-400" />
          <span>{participants.length || 1} en la sala</span>
        </div>
      </div>

      {/* Main Waiting Card */}
      <div className="max-w-md mx-auto w-full text-center my-auto py-8">
        {/* Animated Avatar */}
        <div className="relative inline-block mb-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-pink-500 p-1.5 shadow-2xl shadow-purple-600/40 animate-float">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center overflow-hidden border border-white/20">
              <img
                src={currentParticipant?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ProfeAxel'}
                alt="Mi Avatar"
                className="w-28 h-28 md:w-36 md:h-36 object-contain"
              />
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-green-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-green-500/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>¡Conectado!</span>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-black mb-1">
          {currentParticipant?.nickname || 'Participante'}
        </h2>
        <p className="text-purple-300 text-sm font-semibold flex items-center justify-center gap-1 mb-8">
          <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
          <span>{session?.game?.title || 'Esperando inicio de la partida...'}</span>
        </p>

        {/* Status Message */}
        <div className="card border-purple-500/30 p-5 bg-purple-900/20 backdrop-blur-xl mb-6">
          <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h3 className="font-bold text-white text-base mb-1">
            Mira la pantalla del Docente
          </h3>
          <p className="text-white/60 text-xs">
            La actividad comenzará en cuanto el docente presione "Iniciar Partida".
          </p>
        </div>

        {/* Emote button */}
        <button
          onClick={handleSendEmote}
          className="btn-secondary py-2.5 px-6 rounded-xl text-xs font-bold inline-flex items-center gap-2 border-white/20 hover:border-purple-400"
        >
          <Smile className="w-4 h-4 text-yellow-400" />
          <span>¡Estoy Listo! 🎉</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-white/40 max-w-md mx-auto">
        Recuerda: Si el docente te concede un super-poder, aparecerá de inmediato en tu pantalla.
      </div>
    </div>
  );
}
