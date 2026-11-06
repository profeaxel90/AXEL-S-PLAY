import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { getOrCreateGameClientSync, type GameEventMessage } from '../../lib/gameSync';
import { Gamepad2, Users, Sparkles, Smile, ShieldCheck, Wifi, Volume2, VolumeX, Sliders } from 'lucide-react';

export default function WaitingRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { currentParticipant, phase } = useSessionStore();

  const [connectedPeers, setConnectedPeers] = useState<number>(1);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [readyEmote, setReadyEmote] = useState(false);
  const [isMusicActive, setIsMusicActive] = useState(() => audioEngine.getSettings().musicEnabled);
  const [musicVol, setMusicVol] = useState(() => audioEngine.getSettings().musicVolume ?? 0.75);
  const [showVolSlider, setShowVolSlider] = useState(false);

  // Estado de Intro en móvil
  const [isIntroPhase, setIsIntroPhase] = useState(false);
  const [introTitle, setIntroTitle] = useState('Seguridad Vial y Normas de Tránsito');
  const [introDescription, setIntroDescription] = useState('Evaluación interactiva y gamificada.');

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
      } else if (msg.type === 'START_INTRO') {
        setIsIntroPhase(true);
        if (msg.introTitle) setIntroTitle(msg.introTitle);
        if (msg.introDescription) setIntroDescription(msg.introDescription);
        audioEngine.setContext('intro');
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

    // Suscripción SSE
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
          <span className="font-black text-lg tracking-tight">AXEL'S PLAY</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Control de Volumen para el Celular */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                audioEngine.unlock();
                setShowVolSlider(!showVolSlider);
              }}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white"
              title="Volumen"
            >
              {isMusicActive ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            </button>

            {showVolSlider && (
              <div className="absolute right-0 top-10 z-50 p-3 rounded-xl bg-slate-900 border border-purple-500/40 shadow-xl w-44 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Volumen:</span>
                  <button
                    onClick={() => {
                      const next = audioEngine.toggleMusic();
                      setIsMusicActive(next);
                    }}
                    className="text-[10px] text-purple-300 font-bold"
                  >
                    {isMusicActive ? 'Mute' : 'Activar'}
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={musicVol}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setMusicVol(v);
                    audioEngine.setMusicVolume(v);
                  }}
                  className="w-full accent-purple-500"
                />
              </div>
            )}
          </div>

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

      {/* Main Card (Waiting o Intro) */}
      <div className="max-w-md mx-auto w-full text-center my-auto py-4">
        {isIntroPhase ? (
          <div className="card p-6 border-purple-500/40 bg-purple-950/40 backdrop-blur-xl animate-bounce-in space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
              <span>¡TODO LISTO!</span>
            </div>

            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-yellow-300 to-pink-300">
              AXEL'S PLAY
            </h1>

            <h2 className="text-xl font-bold text-white">
              {introTitle}
            </h2>

            <p className="text-xs text-white/70">
              {introDescription}
            </p>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-1.5 text-xs text-white/80">
              <div className="font-black text-yellow-400 text-xs">📱 ¿Cómo jugar?</div>
              <div>1. Mira la pregunta e imagen en la pantalla del profe.</div>
              <div>2. Elige el botón de color y símbolo correcto en tu celular.</div>
              <div>3. ⚡ Si aparece el botón rojo de <strong>ROBAR PUNTOS</strong>, ¡sé el primero en pulsarlo!</div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-purple-300 font-semibold animate-pulse pt-2">
              <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              <span>Iniciando primera pregunta...</span>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-white/40 max-w-md mx-auto pb-2">
        AXEL'S PLAY • Mantente atento a la pantalla principal
      </div>
    </div>
  );
}
