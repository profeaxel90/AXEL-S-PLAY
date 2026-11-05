import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Gamepad2, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const { resetPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email) return;

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al enviar enlace');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card border-white/15 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center mx-auto mb-3">
              <Gamepad2 className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-black">Recuperar Contraseña</h1>
            <p className="text-white/60 text-sm mt-1">
              Te enviaremos un enlace seguro para restablecer tu clave
            </p>
          </div>

          {sent ? (
            <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/30 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
              <h3 className="font-bold text-lg text-white">¡Enlace Enviado!</h3>
              <p className="text-sm text-green-200">
                Revisa tu bandeja de entrada en <span className="font-semibold text-white">{email}</span> para continuar.
              </p>
              <Link to="/login" className="inline-block mt-4 btn-primary py-2 px-4 rounded-xl text-sm">
                Volver a Iniciar Sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                    placeholder="profe@escuela.edu"
                    className="input pl-11"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3 rounded-xl text-sm font-bold"
              >
                {isLoading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
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
