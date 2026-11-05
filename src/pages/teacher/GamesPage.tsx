import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban, PlusCircle, Search, Filter, Play, Edit3,
  Copy, Trash2, Sparkles, BookOpen, Clock
} from 'lucide-react';
import { SUBJECTS } from '../../types';

interface GameItem {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  gameMode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionsCount: number;
  timePerQuestion: number;
  updatedAt: string;
}

const INITIAL_GAMES: GameItem[] = [
  {
    id: 'g-1',
    title: 'Seguridad Vial y Señales de Tránsito',
    description: 'Aprende a identificar señales reglamentarias, preventivas e informativas.',
    subject: 'Educación Vial',
    topic: 'Señales de Tránsito',
    gameMode: 'Batalla en Vivo',
    difficulty: 'medium',
    questionsCount: 10,
    timePerQuestion: 20,
    updatedAt: '2026-11-01',
  },
  {
    id: 'g-2',
    title: 'Ecosistemas y Conservación Ambiental',
    description: 'Cadena trófica, ciclos biogeoquímicos y preservación de especies.',
    subject: 'Ciencias Naturales',
    topic: 'Ecología',
    gameMode: 'Supervivencia',
    difficulty: 'easy',
    questionsCount: 12,
    timePerQuestion: 15,
    updatedAt: '2026-10-30',
  },
  {
    id: 'g-3',
    title: 'Desafío de Lógica y Fracciones',
    description: 'Resolución de problemas con números racionales y operaciones combinadas.',
    subject: 'Matemáticas',
    topic: 'Fracciones',
    gameMode: 'Por Equipos',
    difficulty: 'hard',
    questionsCount: 8,
    timePerQuestion: 30,
    updatedAt: '2026-10-28',
  },
  {
    id: 'g-4',
    title: 'Comprensión Lectora e Inferencia',
    description: 'Textos cortos, análisis de falacias y figuras literarias.',
    subject: 'Lenguaje y Literatura',
    topic: 'Comprensión',
    gameMode: 'Escape Room',
    difficulty: 'medium',
    questionsCount: 6,
    timePerQuestion: 25,
    updatedAt: '2026-10-25',
  },
];

export default function GamesPage() {
  const [games, setGames] = useState<GameItem[]>(INITIAL_GAMES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  const filteredGames = games.filter((g) => {
    const matchesSearch = g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          g.topic.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || g.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleDuplicate = (id: string) => {
    const original = games.find((g) => g.id === id);
    if (!original) return;
    const duplicated: GameItem = {
      ...original,
      id: `g-${Date.now()}`,
      title: `${original.title} (Copia)`,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setGames([duplicated, ...games]);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este juego?')) {
      setGames(games.filter((g) => g.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Mis Juegos y Cuestionarios</h1>
          <p className="text-white/60 text-sm">Gestiona tus actividades interactivas y lanza partidas con QR</p>
        </div>
        <Link
          to="/teacher/games/new"
          className="btn-primary py-3 px-5 rounded-xl text-sm font-bold flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Crear Nuevo Juego</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 border-white/10 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título o tema..."
            className="input pl-11 py-2.5 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40 flex-shrink-0" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="input py-2.5 px-3 text-sm bg-slate-900 border-white/10 cursor-pointer"
          >
            <option value="all">Todas las Materias</option>
            {SUBJECTS.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Games Grid */}
      {filteredGames.length === 0 ? (
        <div className="card p-12 text-center border-dashed border-white/20">
          <FolderKanban className="w-12 h-12 text-white/30 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No se encontraron juegos</h3>
          <p className="text-white/50 text-xs mb-4">Intenta cambiar los filtros o crea tu primer juego educativo</p>
          <Link to="/teacher/games/new" className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold">
            Crear Juego Ahora
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="card p-6 border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="badge-primary text-xs">{game.subject}</span>
                  <span className="text-[11px] text-white/40">{game.updatedAt}</span>
                </div>

                <h3 className="text-lg font-black text-white mb-1.5">{game.title}</h3>
                <p className="text-white/60 text-xs line-clamp-2 mb-4">{game.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-white/70 mb-5">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    {game.questionsCount} preguntas
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    {game.timePerQuestion}s por turno
                  </span>
                  <span>•</span>
                  <span className="badge-warning text-[10px]">{game.gameMode}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/10">
                <Link
                  to={`/teacher/games/${game.id}/session`}
                  className="btn-primary py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Lanzar Partida con QR</span>
                </Link>

                <div className="flex items-center gap-1">
                  <Link
                    to={`/teacher/games/${game.id}/edit`}
                    className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                    title="Editar preguntas"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleDuplicate(game.id)}
                    className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                    title="Duplicar juego"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(game.id)}
                    className="p-2 rounded-lg border border-white/10 hover:bg-red-500/10 text-red-400"
                    title="Eliminar juego"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
