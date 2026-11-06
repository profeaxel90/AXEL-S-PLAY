import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-9 h-9 text-red-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">Acceso Restringido</h1>
            <p className="text-white/60 text-sm leading-relaxed">
              El registro de nuevas cuentas es exclusivo para administradores del sistema.
              Para acceder como estudiante, escanea el código QR de tu docente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors shadow-lg shadow-purple-600/30"
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
