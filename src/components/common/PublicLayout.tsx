import { Outlet, Link, useLocation } from 'react-router-dom';
import { Gamepad2, Volume2, VolumeX, LogIn, UserPlus } from 'lucide-react';
import { audioEngine } from '../../lib/audio';
import { useState } from 'react';

export default function PublicLayout() {
  const location = useLocation();
  const [audioEnabled, setAudioEnabled] = useState(true);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioEngine.setEffectsEnabled(next);
    audioEngine.setMusicEnabled(next);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-xl tracking-tight leading-none">
                <span className="text-gradient">AXEL'S</span> PLAY
              </div>
              <div className="text-[10px] text-purple-300 font-medium tracking-wide">
                APRENDER JUGANDO
              </div>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            <button
              onClick={toggleAudio}
              title={audioEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
              className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white/70 hover:text-white transition-colors"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-white/40" />}
            </button>

            {location.pathname !== '/login' && (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-white/15 hover:bg-white/10 transition-colors inline-flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Ingresar</span>
              </Link>
            )}

            {location.pathname !== '/register' && (
              <Link
                to="/register"
                className="btn-primary py-2 px-4 rounded-xl text-sm inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrarse</span>
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
