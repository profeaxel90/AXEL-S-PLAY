import { Link } from 'react-router-dom';
import { Play, Users, Calendar, Award, ChevronRight, BarChart3, Trash2 } from 'lucide-react';
import { useSessionHistoryStore } from '../../stores/sessionHistoryStore';

export default function SessionHistoryPage() {
  const { sessions, removeSession } = useSessionHistoryStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Historial de Partidas</h1>
          <p className="text-white/60 text-sm">Registro cronológico de sesiones realizadas con sus resultados</p>
        </div>
        <Link
          to="/teacher/games"
          className="btn-primary py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 self-start sm:self-auto shadow-md shadow-purple-600/30"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Nueva Partida</span>
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="card p-12 border-dashed border-white/15 text-center flex flex-col items-center justify-center bg-white/[0.01]">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            No hay partidas registradas en el historial
          </h3>
          <p className="text-white/50 text-xs max-w-sm mb-6">
            El historial se encuentra limpio o reseteado. Cada partida que finalices con tus estudiantes aparecerá aquí con sus notas y ganadores.
          </p>
          <Link
            to="/teacher/games"
            className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Ir a la Biblioteca de Juegos</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((item) => (
            <div
              key={item.id}
              className="card p-5 border-white/10 hover:border-purple-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="badge-primary text-[10px]">{item.subject}</span>
                  <span className="badge text-[10px] bg-purple-500/20 text-purple-300 border-purple-500/30">
                    {item.mode}
                  </span>
                  <span className="text-white/40 text-xs flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.date}
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">{item.gameTitle}</h3>
                <div className="flex items-center gap-4 text-xs text-white/60 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-purple-300">
                    <Users className="w-3.5 h-3.5" />
                    {item.participants} participantes
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    Efectividad: {item.accuracyRate}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Award className="w-3.5 h-3.5" />
                    Ganador: {item.winner}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => removeSession(item.id)}
                  className="p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Eliminar del historial"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <Link
                  to={`/teacher/analytics?sessionId=${item.id}`}
                  className="btn-secondary py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-purple-600 hover:text-white transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Ver Analítica</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
