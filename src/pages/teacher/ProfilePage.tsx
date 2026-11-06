import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { User, School, Mail, Save, CheckCircle2, ShieldCheck, Lock, KeyRound, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || 'Profesor Axel');
  const [email, setEmail] = useState(user?.email || 'profe@axelsplay.edu');
  const [school, setSchool] = useState(user?.school || 'Colegio Experimental AXEL');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifica ambos campos.');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    try {
      await updateProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        school: school.trim(),
        ...(newPassword ? { newPassword: newPassword.trim() } : {}),
      });
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar cambios');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Mi Perfil y Credenciales</h1>
        <p className="text-white/60 text-sm">
          Modifica tu nombre, correo institucional y contraseña de acceso como Administrador
        </p>
      </div>

      {/* Tarjeta Informativa de Acceso Actual */}
      <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-3 shadow-lg">
        <KeyRound className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-purple-200 space-y-1">
          <p className="font-bold text-white text-sm">Credenciales de Administrador en este equipo</p>
          <p>
            Tu correo de inicio de sesión actual es: <span className="font-mono font-bold text-yellow-300">{user?.email || 'profe@axelsplay.edu'}</span>
          </p>
          <p className="text-white/70">
            Puedes cambiar tu correo y contraseña aquí abajo en cualquier momento. Los cambios se aplicarán inmediatamente para tus próximos inicios de sesión.
          </p>
        </div>
      </div>

      <div className="card p-8 border-white/10 shadow-2xl relative">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-4 pb-6 border-b border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-1 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-purple-600/30">
              {fullName ? fullName[0].toUpperCase() : 'A'}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{fullName}</h2>
              <p className="text-xs text-purple-300 font-semibold">{user?.role === 'teacher' ? 'Docente Administrador' : 'Administrador'}</p>
              <p className="text-[11px] text-white/50">{user?.email || 'profe@axelsplay.edu'}</p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase mb-1.5">
              Nombre Completo
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input pl-11"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase mb-1.5">
              Correo Electrónico (Tu usuario para Iniciar Sesión)
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-11"
                required
              />
            </div>
            <p className="text-[11px] text-white/50 mt-1">
              Si cambias este correo, lo usarás para iniciar sesión la próxima vez.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase mb-1.5">
              Institución Educativa / Empresa
            </label>
            <div className="relative">
              <School className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="Nombre del colegio o empresa"
                className="input pl-11"
              />
            </div>
          </div>

          {/* Cambio de Contraseña */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <span>Cambiar Contraseña (Opcional)</span>
            </h3>
            <p className="text-xs text-white/60">
              Déjalo en blanco si deseas conservar tu contraseña actual.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase mb-1.5">
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
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 uppercase mb-1.5">
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
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="btn-primary w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-300" />
                  <span>¡Datos y Contraseña Actualizados con Éxito!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios de Cuenta</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-white/40">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span>Tus datos y claves se mantienen cifrados y seguros para el rol de administrador.</span>
        </div>
      </div>
    </div>
  );
}
