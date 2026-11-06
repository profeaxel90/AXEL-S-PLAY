import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Gamepad2, LogIn, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    try {
      await signIn(email, password);
      navigate('/teacher/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setLocalError(msg);
    }
  };

  // Modo Demo Rápido para que el usuario pueda probar de inmediato
  const handleDemoLogin = () => {
    useAuthStore.setState({
      user: {
        id: 'demo-teacher-01',
        userId: 'demo-user-01',
        email: 'profe@axelsplay.edu',
        fullName: 'Profesor Axel',
        school: 'Colegio Experimental AXEL',
        role: 'teacher',
        createdAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      isLoading: false,
    });
    navigate('/teacher/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card border-white/15 p-8 shadow-2xl relative overflow-hidden">
          {/* Glow backdrop */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-purple-600/30 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-600/30">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black">Acceso para Administrador</h1>
            <p className="text-white/60 text-sm mt-1">
              Controla la música, preguntas, robos de puntos y podio en AXEL'S PLAY
            </p>
          </div>

          {/* Tarjeta de credenciales por defecto / recordatorio */}
          <div className="mb-5 p-3.5 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-between text-xs text-purple-200">
            <div className="space-y-0.5">
              <p className="text-white font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>Credenciales de Administrador:</span>
              </p>
              <p className="text-[11px] text-white/70 font-mono">
                profe@axelsplay.edu / admin123
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('profe@axelsplay.edu');
                setPassword('admin123');
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-600/40 hover:bg-purple-600/60 text-[11px] font-bold text-white transition-colors"
            >
              Autocompletar
            </button>
          </div>

          {(error || localError) && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="profe@escuela.edu"
                  className="input pl-11"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70">
                  Contraseña
                </label>
                <Link to="/reset-password" className="text-xs text-purple-400 hover:text-purple-300 font-medium">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-11"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3.5 mt-2 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/40"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <div className="mt-5 pt-5 border-t border-white/10">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full btn-secondary py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 text-purple-300 border-purple-500/30 hover:bg-purple-500/10"
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Probar en Modo Demo Rápido (Sin Registro)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-white/50">
            ¿Eres estudiante?{' '}
            <Link to="/" className="text-purple-400 hover:text-purple-300 font-bold underline underline-offset-4">
              Escanea el código QR de tu docente
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
