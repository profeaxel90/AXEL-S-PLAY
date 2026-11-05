import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/sessionStore';
import { audioEngine } from '../../lib/audio';
import { Gamepad2, Sparkles, QrCode, AlertCircle, Shuffle, ArrowRight } from 'lucide-react';

// Colección de Avatares divertidos
const AVATAR_SEEDS = [
  'Astro', 'Ninja', 'Cyber', 'Wizard', 'Dragon',
  'Fox', 'Pixel', 'Rocket', 'Gamer', 'Phoenix',
  'Shadow', 'Comet', 'Titan', 'Sparky', 'Blaze'
];

const RANDOM_NICKNAMES = [
  'SuperCerebro', 'VelocidadPura', 'MaestroGenio', 'LuzMental',
  'RayoCosmico', 'ExploradorX', 'SabioAstral', 'GamerPro',
  'CampeonVial', 'MegaMente', 'CazadorDeRetos', 'CapitanQuiz'
];

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { joinSession, isLoading, error, clearError } = useSessionStore();

  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_SEEDS[0]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    clearError();
    audioEngine.setContext('lobby');
  }, [clearError]);

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

    if (!token) {
      setLocalError('No se encontró el código QR de la partida. Escanéalo nuevamente.');
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

    try {
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatar}`;
      
      // Intentar unirse via store (con backend o mock local si estamos en demo)
      try {
        const { session } = await joinSession(token, nickname.trim(), avatarUrl);
        navigate(`/waiting/${session.id}`);
      } catch {
        // Modo fallback offline / local test para cuando no hay conexión de Supabase en vivo
        const mockParticipant = {
          id: `p-${Date.now()}`,
          sessionId: `sess-${token}`,
          nickname: nickname.trim(),
          avatar: avatarUrl,
          score: 0,
          rank: 1,
          isConnected: true,
          joinedAt: new Date().toISOString(),
        };

        const mockSession = {
          id: `sess-${token}`,
          gameId: 'game-demo',
          teacherId: 'teacher-demo',
          status: 'waiting' as const,
          qrToken: token,
          qrExpiresAt: new Date(Date.now() + 3600000).toISOString(),
          qrUrl: window.location.href,
          settings: {
            timePerQuestion: 20,
            showLeaderboardAfterEach: true,
            allowReplay: false,
            showCorrectAnswer: true,
            randomizeQuestions: false,
            randomizeOptions: false,
            enablePowerUps: true,
            enableMusic: true,
            enableEffects: true,
            enableTeacherPowers: true,
          },
          createdAt: new Date().toISOString(),
        };

        useSessionStore.setState({
          session: mockSession,
          currentParticipant: mockParticipant,
          participants: [mockParticipant],
        });

        audioEngine.playEffect('sfx_join');
        navigate(`/waiting/${mockSession.id}`);
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Error al ingresar a la partida.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="card max-w-md p-8 border-purple-500/30">
          <QrCode className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-black text-white mb-2">Escaneo Requerido</h2>
          <p className="text-white/60 text-sm mb-6">
            Para unirte a una partida en AXEL PLAY debes escanear con la cámara de tu celular el código QR proyectado por tu docente.
          </p>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
            🔒 El acceso a las partidas es exclusivo mediante código QR por seguridad y control de sala.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/40 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card border-white/20 p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>Sala Lista para Jugar</span>
            </div>
            <h1 className="text-3xl font-black text-white">¡Bienvenido a la Partida!</h1>
            <p className="text-white/60 text-xs mt-1">
              Personaliza tu avatar y apodo para entrar
            </p>
          </div>

          {(error || localError) && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Selector */}
            <div className="flex flex-col items-center">
              <div className="relative group mb-3">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-1 shadow-xl shadow-purple-600/30">
                  <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center overflow-hidden border border-white/20">
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedAvatar}`}
                      alt="Avatar seleccionado"
                      className="w-20 h-20 object-contain transition-transform group-hover:scale-110"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  className="absolute -bottom-1 -right-1 p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-600/50 transition-transform active:scale-90"
                  title="Avatar aleatorio"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Avatar Selector Grid */}
              <div className="flex gap-2 overflow-x-auto max-w-full py-2 px-1 scrollbar-none">
                {AVATAR_SEEDS.slice(0, 7).map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(seed);
                      audioEngine.playEffect('sfx_tick');
                    }}
                    className={`w-11 h-11 rounded-xl p-1 flex-shrink-0 border transition-all ${
                      selectedAvatar === seed
                        ? 'border-purple-400 bg-purple-500/20 scale-105'
                        : 'border-white/10 hover:border-white/30 bg-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`}
                      alt={seed}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                  Tu Apodo de Juego *
                </label>
                <button
                  type="button"
                  onClick={handleRandomizeNickname}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                >
                  <Shuffle className="w-3 h-3" />
                  <span>Sugerir Apodo</span>
                </button>
              </div>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ej. SuperGenio23"
                maxLength={18}
                className="input text-center text-lg font-bold tracking-wide"
                autoFocus
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-4 rounded-2xl text-lg font-black tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-purple-600/40"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Gamepad2 className="w-6 h-6" />
                  <span>¡ENTRAR A LA SALA!</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Slogan */}
          <div className="mt-6 text-center text-xs text-white/40">
            AXEL PLAY • Aprender jugando. Competir. Superar retos.
          </div>
        </div>
      </div>
    </div>
  );
}
