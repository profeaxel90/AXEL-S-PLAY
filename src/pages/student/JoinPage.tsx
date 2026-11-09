import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { getOrCreateGameClientSync } from '../../lib/gameSync';
import { Gamepad2, Sparkles, QrCode, AlertCircle, Shuffle, ArrowRight, ShieldCheck } from 'lucide-react';
import MascotAvatar, { AVAILABLE_MASCOT_SEEDS } from '../../components/game/MascotAvatar';

// Colección de Avatares divertidos 3D Cartoon
const AVATAR_SEEDS = AVAILABLE_MASCOT_SEEDS;

const RANDOM_NICKNAMES = [
  'SuperCerebro', 'VelocidadPura', 'MaestroGenio', 'LuzMental',
  'RayoCosmico', 'ExploradorX', 'SabioAstral', 'GamerPro',
  'CampeonVial', 'MegaMente', 'CazadorDeRetos', 'CapitanQuiz'
];

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setCurrentParticipant, clearError } = useSessionStore();

  const [enteredPin, setEnteredPin] = useState(token || '');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_SEEDS[0]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    clearError();
    if (token) setEnteredPin(token);
  }, [clearError, token]);

  const handleRandomizeNickname = () => {
    const random = RANDOM_NICKNAMES[Math.floor(Math.random() * RANDOM_NICKNAMES.length)];
    const number = Math.floor(Math.random() * 90 + 10);
    setNickname(`${random}${number}`);
    audioEngine.playEffect('sfx_tick');
  };

  const handleRandomizeAvatar = () => {
    const random = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
    setSelectedAvatar(random);
    audioEngine.playEffect('sfx_tick');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const activeSessionPin = (token || enteredPin).trim();

    if (!activeSessionPin) {
      setLocalError('Por favor ingresa el código PIN de la partida (ej: 482915).');
      return;
    }

    if (!nickname.trim()) {
      setLocalError('Por favor escribe tu apodo para identificarte en la partida.');
      return;
    }

    if (nickname.trim().length > 18) {
      setLocalError('El apodo no debe superar los 18 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      const avatarValue = selectedAvatar;
      const participantId = `p-${Date.now()}`;

      const newParticipant = {
        id: participantId,
        sessionId: activeSessionPin,
        nickname: nickname.trim(),
        avatar: avatarValue,
        score: 0,
        rank: 1,
        isConnected: true,
        joinedAt: new Date().toISOString(),
      };

      // Guardar en el store local
      setCurrentParticipant(newParticipant);

      // Conectar con el sincronizador en tiempo real (MQTT Cloud + BroadcastChannel + P2P)
      const sync = getOrCreateGameClientSync(activeSessionPin);
      await sync.join(newParticipant);

      audioEngine.playEffect('sfx_join');
      navigate(`/waiting/${activeSessionPin}`);
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Error al ingresar a la partida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayPin = token || enteredPin;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white flex flex-col justify-between p-4 md:p-8">
      {/* Top Bar Branding */}
      <div className="flex items-center justify-between max-w-md mx-auto w-full pt-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/40">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight">AXEL'S PLAY</span>
            <span className="text-[10px] text-purple-300 block -mt-1 font-semibold">Acceso Estudiante</span>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
          <span>PIN: {displayPin ? displayPin.toUpperCase() : 'PENDIENTE'}</span>
        </div>
      </div>

      {/* Main Join Card */}
      <div className="card max-w-md mx-auto w-full border-purple-500/30 p-6 md:p-8 my-auto shadow-2xl backdrop-blur-xl bg-slate-900/80">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>¡Bienvenido a la Partida!</span>
          </div>
          <h1 className="text-2xl font-black text-white">Configura tu Jugador</h1>
          <p className="text-white/60 text-xs mt-1">
            Elige tu avatar y apodo para competir con tus compañeros
          </p>
        </div>

        {/* Error banner */}
        {localError && (
          <div className="card p-3 border-red-500/40 bg-red-500/10 text-red-300 text-xs flex items-center gap-2 mb-5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Si no venía token por URL, permitir ingresar el PIN manualmente estilo Kahoot */}
          {!token && (
            <div>
              <label className="text-xs font-bold text-purple-300 block mb-1">
                PIN del Juego (6 dígitos)
              </label>
              <input
                type="text"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="Ej: 482915"
                maxLength={10}
                className="input text-center text-xl font-black tracking-widest uppercase border-purple-500/40 focus:border-purple-400"
                required
              />
            </div>
          )}
          {/* Avatar Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-white/80">Elige tu Avatar</label>
              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
              >
                <Shuffle className="w-3 h-3" />
                <span>Aleatorio</span>
              </button>
            </div>

            {/* Avatar Activo Grande 3D Cartoon */}
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-1 shadow-xl shadow-purple-600/30">
                  <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                    <MascotAvatar
                      seed={selectedAvatar}
                      emotion="happy"
                      size="xl"
                      className="group-hover:scale-110 transition-transform"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Carrusel de Mascotas 3D */}
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_SEEDS.slice(0, 10).map((seed) => (
                <button
                  type="button"
                  key={seed}
                  onClick={() => {
                    setSelectedAvatar(seed);
                    audioEngine.playEffect('sfx_tick');
                  }}
                  className={`p-1.5 rounded-xl border flex items-center justify-center transition-all ${
                    selectedAvatar === seed
                      ? 'border-yellow-400 bg-purple-600/30 scale-105 shadow-md shadow-yellow-500/20 ring-1 ring-yellow-400/50'
                      : 'border-white/10 hover:border-white/30 bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                  title={seed}
                >
                  <MascotAvatar seed={seed} size="sm" />
                </button>
              ))}
            </div>
          </div>

          {/* Nickname Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white/80">Tu Apodo de Juego</label>
              <button
                type="button"
                onClick={handleRandomizeNickname}
                className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
              >
                <Shuffle className="w-3 h-3" />
                <span>Generar</span>
              </button>
            </div>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej. SuperCerebro"
              maxLength={18}
              className="input text-center text-lg font-black tracking-wide"
              autoFocus
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-xl shadow-purple-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>{isSubmitting ? 'Uniéndose...' : '¡Entrar a la Sala de Juego!'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-white/40 max-w-md mx-auto pb-2">
        Conexión directa protegida • Sin registro ni contraseñas
      </div>
    </div>
  );
}
