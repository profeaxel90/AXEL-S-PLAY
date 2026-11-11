import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { useHomeworkStore } from '../../stores/homeworkStore';
import {
  Gamepad2, Users, Trophy, Play, PlusCircle, FolderKanban,
  Database, BarChart3, Clock, Sparkles, ChevronRight, CheckCircle2,
  BookOpen, HelpCircle
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const gamesMap = useGameStore((state) => state.games);
  const assignments = useHomeworkStore((state) => state.assignments);

  const gamesList = useMemo(() => Object.values(gamesMap), [gamesMap]);

  // Cálculos dinámicos en tiempo real
  const totalGames = gamesList.length;
  const totalQuestions = useMemo(() => {
    return gamesList.reduce((acc, g) => acc + (g.questionsCount || g.questions?.length || 0), 0);
  }, [gamesList]);

  const totalSubmissions = useMemo(() => {
    return assignments.reduce((acc, a) => acc + (a.submissions?.length || 0), 0);
  }, [assignments]);

  const quickStats = [
    {
      label: 'Juegos Creados',
      value: String(totalGames),
      icon: <FolderKanban className="w-5 h-5 text-purple-400" />,
      change: 'Activos en biblioteca',
    },
    {
      label: 'Preguntas Totales',
      value: String(totalQuestions),
      icon: <HelpCircle className="w-5 h-5 text-amber-400" />,
      change: 'Calculadas en tiempo real',
    },
    {
      label: 'Deberes para Casa',
      value: String(assignments.length),
      icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
      change: 'Asignaciones activas',
    },
    {
      label: 'Entregas Recibidas',
      value: String(totalSubmissions),
      icon: <Users className="w-5 h-5 text-blue-400" />,
      change: 'Alumnos evaluados',
    },
  ];

  const recentGames = useMemo(() => {
    return [...gamesList]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 3);
  }, [gamesList]);

  return (
    <div className="space-y-8">
      {/* ── Welcome Banner ── */}
      <div className="relative rounded-3xl p-6 md:p-8 overflow-hidden border border-purple-500/30 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span>Panel del Docente</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white">
              ¡Hola, {user?.fullName || 'Profesor Axel'}!
            </h1>
            <p className="text-white/60 text-sm mt-1 max-w-xl">
              Crea partidas interactivas, proyecta el código QR para tus estudiantes y dale dinamismo a tu clase con poderes en vivo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/teacher/games/new"
              className="btn-primary py-3 px-5 rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear Nuevo Juego</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Quick Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <div key={stat.label} className="card p-5 border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{stat.label}</span>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">{stat.icon}</div>
            </div>
            <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
            <div className="text-[11px] text-green-400 font-semibold">{stat.change}</div>
          </div>
        ))}
      </div>

      {/* ── Mis Juegos Recientes ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Mis Juegos Recientes</h2>
            <p className="text-white/50 text-xs">Inicia una partida con QR o edita tus preguntas</p>
          </div>
          <Link
            to="/teacher/games"
            className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
          >
            <span>Ver todos los juegos</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentGames.map((game) => (
            <div
              key={game.id}
              className="card p-5 border-white/10 hover:border-purple-500/40 transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="badge-primary text-[10px]">{game.subject}</span>
                  <span className="text-white/40 text-[11px]">
                    {game.updatedAt ? new Date(game.updatedAt).toLocaleDateString('es-CO') : 'Reciente'}
                  </span>
                </div>
                <h3 className="font-bold text-base text-white group-hover:text-purple-300 transition-colors mb-2">
                  {game.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-white/60 mb-4">
                  <span>{game.questionsCount || game.questions?.length || 0} preguntas</span>
                  <span>•</span>
                  <span className="badge-warning text-[10px] uppercase font-bold">{game.gameMode}</span>
                  <span>•</span>
                  <span className="text-purple-300 capitalize">{game.difficulty}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                <Link
                  to={`/teacher/games/${game.id}/session`}
                  className="flex-1 btn-primary py-2 px-3 rounded-lg text-xs font-bold justify-center flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Lanzar Partida</span>
                </Link>
                <Link
                  to={`/teacher/games/${game.id}/edit`}
                  className="btn-secondary py-2 px-3 rounded-lg text-xs font-semibold"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Atajos Rápidos ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6 border-white/10 bg-gradient-to-br from-indigo-950/30 to-purple-950/30">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Banco de Preguntas Reutilizable</h3>
              <p className="text-white/50 text-xs">Importa desde Excel/CSV o crea preguntas categorizadas</p>
            </div>
          </div>
          <Link
            to="/teacher/questions"
            className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 mt-2"
          >
            <span>Gestionar Banco de Preguntas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="card p-6 border-white/10 bg-gradient-to-br from-blue-950/30 to-slate-900">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Analítica y Refuerzo Pedagógico</h3>
              <p className="text-white/50 text-xs">Identifica preguntas difíciles y exporta reportes en Excel/PDF</p>
            </div>
          </div>
          <Link
            to="/teacher/analytics"
            className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 mt-2"
          >
            <span>Ver Reportes y Estadísticas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
