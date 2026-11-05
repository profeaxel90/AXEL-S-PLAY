import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Gamepad2, UserPlus, Lock, Mail, User, School, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!fullName || !email || !password) {
      setLocalError('Por favor completa todos los campos requeridos.');
      return;
    }

    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    try {
      await signUp(email, password, fullName, school);
      setSuccess(true);
      setTimeout(() => {
        navigate('/teacher/dashboard');
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la cuenta';
      setLocalError(msg);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <div className="card border-white/15 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-600/30">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black">Crear Cuenta Docente</h1>
            <p className="text-white/60 text-sm mt-1">
              Únete a AXEL PLAY y empieza a crear juegos interactivos
            </p>
          </div>

          {success ? (
            <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/30 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
              <h3 className="font-bold text-lg text-white">¡Registro Exitoso!</h3>
              <p className="text-sm text-green-200">
                Tu cuenta ha sido creada. Redirigiendo al inicio de sesión...
              </p>
            </div>
          ) : (
            <>
              {(error || localError) && (
                <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
                  <span>{localError || error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Prof. Carlos Mendoza"
                      className="input pl-11"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="profesor@institucion.edu"
                      className="input pl-11"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                    Colegio / Institución (Opcional)
                  </label>
                  <div className="relative">
                    <School className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="Colegio San Ignacio / Independiente"
                      className="input pl-11"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                    Contraseña * (mínimo 6 caracteres)
                  </label>
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                    Confirmar Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                      <UserPlus className="w-5 h-5" />
                      <span>Crear Cuenta Gratuita</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-white/60">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="text-purple-400 hover:text-purple-300 font-bold underline underline-offset-4">
                  Inicia sesión aquí
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
