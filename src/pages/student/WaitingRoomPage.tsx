import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { getOrCreateGameClientSync, type GameEventMessage } from '../../lib/gameSync';
import { Gamepad2, Users, Sparkles, Smile, ShieldCheck, Wifi } from 'lucide-react';

export default function WaitingRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { currentParticipant, phase } = useSessionStore();

  const [connectedPeers, setConnectedPeers] = useState<number>(1);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [readyEmote, setReadyEmote] = useState(false);

  useEffect(() => {
    audioEngine.setContext('lobby');

    if (!sessionId) return;

    const sync = getOrCreateGameClientSync(sessionId);
    setIsLiveConnected(sync.isConnected);

    sync.onEvent = (msg: GameEventMessage) => {
      console.log('[WaitingRoom] Evento recibido:', msg.type);

      if (msg.type === 'JOIN' || msg.type === 'ROOM_UPDATE') {
        if (msg.participants) {
          setConnectedPeers(msg.participants.length);
        } else {
          setConnectedPeers((prev) => prev + 1);
        }
      } else if (msg.type === 'INIT' && msg.session) {
        if (msg.session.participants) {
          setConnectedPeers(msg.session.participants.length || 1);
        }
      } else if (msg.type === 'START_GAME' || msg.type === 'QUESTION') {
        audioEngine.setContext('game_start');
        if (msg.type === 'QUESTION' && msg.question) {
          useSessionStore.setState({
            currentQuestion: msg.question,
            questionIndex: msg.index || 0,
            timeRemaining: msg.timeLimit || 20,
            phase: 'question',
          });
        }
        navigate(`/game/${sessionId}`);
      }
    };

    // Asegurar suscripción a SSE
    sync.connectSSE();
    setIsLiveConnected(true);
  }, [sessionId, navigate]);

  // Si la fase cambia por el store global
  useEffect(() => {
    if (phase === 'question' && sessionId) {
      navigate(`/game/${sessionId}`);
    }
  }, [phase, sessionId, navigate]);

  const handleSendEmote = () => {
    setReadyEmote(true);
    audioEngine.playEffect('sfx_tick');
    setTimeout(() => setReadyEmote(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/70 to-slate-950 text-white flex flex-col justify-between p-4 md:p-8 select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-md mx-auto w-full pt-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/40">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <span className="font-black text-lg tracking-tight">AXEL PLAY</span>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isLiveConnected
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 animate-pulse'
          }`}>
            <Wifi className="w-3.5 h-3.5" />
            <span>{isLiveConnected ? 'En línea' : 'Conectando...'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>{connectedPeers}</span>
          </div>
        </div>
      </div>

      {/* Main Waiting Card */}
      <div className="max-w-md mx-auto w-full text-center my-auto py-4">
        {/* Animated Avatar */}
        <div className="relative inline-block mb-6">
          <div className="w-32 h-32 md:w-36 md:h-36 rounded-3xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-pink-500 p-1.5 shadow-2xl shadow-purple-600/40 animate-float">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center overflow-hidden border border-white/20">
              <img
                src={currentParticipant?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=ProfeAxel'}
                alt="Mi Avatar"
                className="w-24 h-24 md:w-28 md:h-28 object-contain"
              />
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-green-500 text-slate-950 font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-lg shadow-green-500/50">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>¡Conectado!</span>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-black mb-1">
          {currentParticipant?.nickname || 'Participante'}
        </h2>
        <p className="text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
          <span>Esperando que el docente inicie la partida...</span>
        </p>

        {/* Status Message */}
        <div className="card border-purple-500/30 p-5 bg-purple-900/20 backdrop-blur-xl mb-6">
          <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <h3 className="font-bold text-white text-base mb-1">
            Mira la pantalla del Docente
          </h3>
          <p className="text-white/60 text-xs">
            Las preguntas y opciones aparecerán aquí en cuanto el docente presione "INICIAR PARTIDA".
          </p>
        </div>

        {/* Emote button */}
        <button
          onClick={handleSendEmote}
          className={`py-3 px-6 rounded-2xl text-xs font-bold inline-flex items-center gap-2 border transition-all ${
            readyEmote
              ? 'bg-green-500/20 border-green-400 text-green-300 scale-105'
              : 'btn-secondary border-white/20 hover:border-purple-400'
          }`}
        >
          <Smile className="w-4 h-4 text-yellow-400" />
          <span>{readyEmote ? '¡El profe ya te ve listo! 🚀' : '¡Estoy Listo! 🎉'}</span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-white/40 max-w-md mx-auto pb-2">
        ⚡ Si el docente te asigna un poder especial, se activará al instante en tu celular.
      </div>
    </div>
  );
}
