import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Gamepad2, LayoutDashboard, FolderKanban, Database,
  BarChart3, History, User, LogOut, PlusCircle,
  Volume2, VolumeX, Menu, X, Settings
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { audioEngine } from '../../lib/audio';
import { useState } from 'react';

export default function TeacherLayout() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioEngine.setEffectsEnabled(next);
    audioEngine.setMusicEnabled(next);
  };

  const navItems = [
    { to: '/teacher/dashboard', label: 'Panel de Control', icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/teacher/games', label: 'Mis Juegos', icon: <FolderKanban className="w-5 h-5" /> },
    { to: '/teacher/questions', label: 'Banco de Preguntas', icon: <Database className="w-5 h-5" /> },
    { to: '/teacher/analytics', label: 'Analítica y Reportes', icon: <BarChart3 className="w-5 h-5" /> },
    { to: '/teacher/history', label: 'Historial', icon: <History className="w-5 h-5" /> },
    { to: '/teacher/settings', label: 'Configuración', icon: <Settings className="w-5 h-5" /> },
    { to: '/teacher/profile', label: 'Mi Perfil', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* ── Sidebar Desktop ── */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-slate-900/60 backdrop-blur-xl">
        {/* Brand */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-lg tracking-tight leading-none">
                <span className="text-gradient">AXEL'S</span> PLAY
              </div>
              <div className="text-[10px] text-purple-300 font-semibold tracking-wide">
                DOCENTE
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action */}
        <div className="p-4">
          <NavLink
            to="/teacher/games/new"
            className="w-full btn-primary py-2.5 px-4 rounded-xl text-sm justify-center flex items-center gap-2 shadow-md shadow-purple-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear Juego</span>
          </NavLink>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Controls */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center font-bold text-sm text-purple-300 flex-shrink-0">
                {user?.fullName ? user.fullName[0].toUpperCase() : 'D'}
              </div>
              <div className="truncate text-xs">
                <p className="font-semibold text-white truncate">{user?.fullName || 'Docente'}</p>
                <p className="text-white/40 truncate">{user?.school || 'Profesor'}</p>
              </div>
            </div>

            <button
              onClick={toggleAudio}
              className="p-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/5"
              title="Sonidos"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-white/30" />}
            </button>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Main Layout Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-white/10 bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg">AXEL'S PLAY</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAudio}
              className="p-2 rounded-lg border border-white/10 text-white/60"
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-white/30" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-white/10 text-white/80"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900 border-b border-white/10 p-4 space-y-2">
            <NavLink
              to="/teacher/games/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full btn-primary py-2.5 px-4 rounded-xl text-sm justify-center flex items-center gap-2 mb-3"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear Juego</span>
            </NavLink>

            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm ${
                    isActive ? 'bg-purple-600 text-white' : 'text-white/70 hover:bg-white/5'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-red-400 hover:bg-red-500/10 pt-3 border-t border-white/10"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}

        {/* Page Content Container */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
