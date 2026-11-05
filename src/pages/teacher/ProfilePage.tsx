import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { User, School, Mail, Save, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateProfile } = useAuthStore();

  const [fullName, setFullName] = useState(user?.fullName || 'Profesor Axel');
  const [school, setSchool] = useState(user?.school || 'Colegio Experimental AXEL');
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ fullName, school });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Guardado local
      useAuthStore.setState({
        user: user ? { ...user, fullName, school } : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Mi Perfil Docente</h1>
        <p className="text-white/60 text-sm">Gestiona tus datos personales e institucionales</p>
      </div>

      <div className="card p-8 border-white/10 shadow-2xl relative">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center gap-4 pb-6 border-b border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-1 flex items-center justify-center font-black text-2xl text-white shadow-lg shadow-purple-600/30">
              {fullName ? fullName[0].toUpperCase() : 'A'}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{fullName}</h2>
              <p className="text-xs text-purple-300 font-semibold">{user?.role === 'teacher' ? 'Docente Titular' : 'Profesor'}</p>
            </div>
          </div>

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
              Correo Electrónico (Solo lectura)
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={user?.email || 'profe@axelplay.edu'}
                disabled
                className="input pl-11 opacity-60 cursor-not-allowed"
              />
            </div>
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

          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-300" />
                  <span>¡Cambios Guardados!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-white/40">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span>Tus datos están protegidos bajo normativa de protección de datos personales.</span>
        </div>
      </div>
    </div>
  );
}
