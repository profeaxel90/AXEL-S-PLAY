import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Gamepad2, Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

export default function ResetPasswordPage() {
  const { resetPasswordWithNew, resetPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email) {
      setErrorMsg('Por favor introduce tu correo electrónico.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifica ambos campos.');
      return;
    }

    try {
      // Intentar reset en nube si está disponible
      await resetPassword(email);
      // Aplicar cambio inmediato local y en almacenamiento seguro
      await resetPasswordWithNew(email, newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al restablecer contraseña');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card border-white/15 p-8 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-600/30">
              <KeyRound className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black">Restablecer Contraseña</h1>
            <p className="text-white/60 text-sm mt-1">
              Ingresa tu correo y define directamente tu nueva clave de acceso
            </p>
          </div>

          {/* Ayuda de cuenta inicial */}
          <div className="mb-5 p-3 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center gap-2.5 text-xs text-purple-200">
            <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span>
              Cuenta de Administrador inicial: <strong className="text-white font-mono">profe@axelsplay.edu</strong>
            </span>
          </div>

          {success ? (
            <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/30 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto animate-bounce" />
              <div>
                <h3 className="font-bold text-xl text-white">¡Contraseña Restablecida!</h3>
                <p className="text-xs text-green-200 mt-1">
                  Tu contraseña para la cuenta <span className="font-mono text-white font-semibold">{email}</span> ha sido actualizada con éxito.
                </p>
              </div>
              <Link
                to="/login"
                className="w-full btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
              >
                <span>Iniciar Sesión Ahora</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

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
                    placeholder="profe@axelsplay.edu"
                    className="input pl-11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="input pl-11"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="input pl-11"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3.5 mt-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-600/30"
              >
                {isLoading ? 'Actualizando...' : 'Restablecer y Guardar Nueva Clave'}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver al inicio de sesión</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
