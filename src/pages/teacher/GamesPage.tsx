import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban, PlusCircle, Search, Filter, Play, Edit3,
  Copy, Trash2, Sparkles, BookOpen, Clock, Eye, Home
} from 'lucide-react';
import { SUBJECTS } from '../../types';
import GamePreviewModal from '../../components/teacher/GamePreviewModal';
import { useGameStore } from '../../stores/gameStore';
import type { Game } from '../../types';

export default function GamesPage() {
  const navigate = useNavigate();
  const { games: gamesMap, getGamesList, deleteGame, duplicateGame } = useGameStore();
  const games = getGamesList();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [previewGame, setPreviewGame] = useState<Game | null>(null);

  const filteredGames = games.filter((g) => {
    const matchesSearch =
      g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.topic || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || g.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleDuplicate = (id: string) => {
    duplicateGame(id);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este juego definitivamente?')) {
      deleteGame(id);
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
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <Link
            to="/teacher/games/new"
            className="btn-primary py-3 px-5 rounded-xl text-sm font-bold flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Crear Juego Manual</span>
          </Link>
        </div>
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
                  <span className="text-[11px] text-white/40">
                    {game.updatedAt ? new Date(game.updatedAt).toLocaleDateString('es-CO') : 'Reciente'}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white mb-1.5">{game.title}</h3>
                <p className="text-white/60 text-xs line-clamp-2 mb-4">{game.description || 'Sin descripción'}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-white/70 mb-5">
                  <span className="flex items-center gap-1 font-semibold text-purple-300">
                    <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                    {game.questionsCount || game.questions?.length || 0} preguntas
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    {game.settings?.timePerQuestion || 20}s por turno
                  </span>
                  <span>•</span>
                  <span className="badge-warning text-[10px] uppercase font-bold">{game.gameMode}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={`/teacher/games/${game.id}/session`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary py-2 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/30"
                    title="Lanzar partida en vivo en una nueva ventana limpia de pantalla completa"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Lanzar Partida</span>
                  </Link>

                  <Link
                    to={`/teacher/homework?gameId=${game.id}`}
                    className="py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-colors"
                    title="Asignar para responder en casa sin límite de tiempo"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Asignar Casa</span>
                  </Link>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewGame(game)}
                    className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
                    title="Vista Previa de Estudiante"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

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
                    title="Eliminar juego definitivamente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Vista Previa de Estudiante */}
      {previewGame && (
        <GamePreviewModal
          isOpen={Boolean(previewGame)}
          onClose={() => setPreviewGame(null)}
          gameTitle={previewGame.title}
          questions={(previewGame.questions || []).map((q, idx) => ({
            id: q.id || `q-${idx}`,
            type: q.type,
            content: q.content,
            timeLimit: q.timeLimit || previewGame.settings?.timePerQuestion || 20,
            points: q.points || 1000,
            pointsMultiplier: q.pointsMultiplier || 1,
            explanation: q.explanation || '',
            imageUrl: q.imageUrl,
            options: (q.options || []).map((opt, oIdx) => ({
              id: opt.id || `opt-${oIdx}`,
              text: opt.text,
              isCorrect:
                opt.isCorrect !== undefined
                  ? opt.isCorrect
                  : opt.id === q.correctAnswer || (Array.isArray(q.correctAnswer) && (q.correctAnswer as unknown as string[]).includes(opt.id)),
            })),
          }))}
        />
      )}
    </div>
  );
}
