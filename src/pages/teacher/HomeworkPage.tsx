import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Plus, Clipboard, CheckCircle2, XCircle,
  Trash2, Users, ChevronRight, Download, ArrowLeft,
  Calendar, Hash, ToggleLeft, ToggleRight, Eye, Award
} from 'lucide-react';
import { useHomeworkStore } from '../../stores/homeworkStore';
import { useGameStore } from '../../stores/gameStore';
import type { HomeworkAssignment, HomeworkSubmission } from '../../types/homework';
import MascotAvatar from '../../components/game/MascotAvatar';

// ── Utilidades ────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function exportCSV(assignment: HomeworkAssignment) {
  const rows = [
    ['Nombre', 'Grado/Grupo', 'Puntaje', '% Aciertos', 'Correcciones usadas', 'Fecha entrega'],
    ...assignment.submissions.map((s) => [
      s.studentFullName,
      s.gradeGroup,
      s.score,
      `${s.accuracy}%`,
      s.correctionsUsed,
      new Date(s.submittedAt).toLocaleString('es-CO'),
    ]),
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${assignment.title.replace(/\s+/g, '_')}_resultados.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Componente: Modal Nueva Asignación ────────────────────────
interface NewAssignmentModalProps {
  defaultGameId?: string;
  onClose: () => void;
  onCreate: (data: {
    title: string; description: string; gradeGroupTarget: string;
    gameId: string; dueDate: string; maxCorrections: number;
  }) => void;
}

function NewAssignmentModal({ defaultGameId, onClose, onCreate }: NewAssignmentModalProps) {
  const games = useGameStore((state) => state.getGamesList());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gradeGroupTarget, setGradeGroupTarget] = useState('');
  const [gameId, setGameId] = useState(defaultGameId || (games[0]?.id ?? ''));
  const [dueDate, setDueDate] = useState('');
  const [maxCorrections, setMaxCorrections] = useState(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !gameId) return;
    onCreate({ title: title.trim(), description: description.trim(), gradeGroupTarget: gradeGroupTarget.trim(), gameId, dueDate, maxCorrections });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-bold text-white text-lg">Nueva Asignación de Deberes</h2>
            <p className="text-xs text-white/50">Los estudiantes responden en casa, sin tiempo límite</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">Título de la asignación *</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500"
              placeholder="Ej: Taller para Casa - Matemáticas Capítulo 3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">Instrucciones para el estudiante</label>
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500 resize-none"
              rows={2}
              placeholder="Ej: Responde con calma. Recuerda que tienes comodines de corrección."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Grado/Grupo */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">Grado / Grupo objetivo</label>
            <input
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500"
              placeholder="Ej: Grado 7°A"
              value={gradeGroupTarget}
              onChange={(e) => setGradeGroupTarget(e.target.value)}
            />
          </div>

          {/* Juego */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">Cuestionario a asignar *</label>
            <select
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              required
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>{g.title}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Fecha límite */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">Fecha límite (opcional)</label>
              <input
                type="date"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            {/* Correcciones */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">Comodines de corrección</label>
              <select
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                value={maxCorrections}
                onChange={(e) => setMaxCorrections(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} corrección{n !== 1 ? 'es' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 text-sm font-semibold">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition-opacity">
              Crear Asignación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente: Detalle de un estudiante ─────────────────────
function StudentDetail({ submission, onBack }: { submission: HomeworkSubmission; onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a la asignación
      </button>

      <div className="flex items-center gap-4 mb-6">
        <MascotAvatar seed={submission.avatar} emotion="happy" size="lg" />
        <div>
          <h3 className="text-xl font-bold text-white">{submission.studentFullName}</h3>
          <p className="text-sm text-white/50">{submission.gradeGroup}</p>
          <p className="text-xs text-white/30 mt-0.5">Entregado: {fmtDate(submission.submittedAt)}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-3xl font-black text-emerald-400">{submission.accuracy}%</div>
          <div className="text-xs text-white/50">{submission.correctAnswers}/{submission.totalQuestions} correctas</div>
          <div className="text-xs text-purple-400 mt-0.5">🔄 {submission.correctionsUsed} corrección{submission.correctionsUsed !== 1 ? 'es' : ''} usada{submission.correctionsUsed !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {submission.answers.length === 0 ? (
        <div className="bg-white/5 rounded-2xl p-8 text-center text-white/40">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Sin detalle de respuestas disponible</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submission.answers.map((ans, i) => (
            <div key={i} className={`rounded-2xl border p-4 ${ans.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex items-start gap-3">
                {ans.isCorrect
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white/80 mb-1">
                    <span className="text-white/40 font-normal">P{i + 1}. </span>
                    {ans.questionPrompt}
                  </p>
                  <p className="text-sm text-white">
                    <span className="text-white/40 text-xs">Respondió: </span>
                    {ans.selectedOptionText}
                  </p>
                  {!ans.isCorrect && (
                    <p className="text-sm text-emerald-400 mt-0.5">
                      <span className="text-white/40 text-xs">Correcta: </span>
                      {ans.correctOptionText}
                    </p>
                  )}
                  {ans.wasCorrected && (
                    <span className="inline-block mt-1.5 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                      🔄 Corregida con comodín
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente: Detalle de Asignación ────────────────────────
function AssignmentDetail({
  assignment,
  onBack,
  onToggleStatus,
  onExport,
}: {
  assignment: HomeworkAssignment;
  onBack: () => void;
  onToggleStatus: () => void;
  onExport: () => void;
}) {
  const [selectedStudent, setSelectedStudent] = useState<HomeworkSubmission | null>(null);
  const shareUrl = `${window.location.origin}/homework/${assignment.pin}`;

  if (selectedStudent) {
    return <StudentDetail submission={selectedStudent} onBack={() => setSelectedStudent(null)} />;
  }

  const sorted = [...assignment.submissions].sort((a, b) => b.score - a.score);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Asignación de Deberes
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${assignment.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
              {assignment.status === 'active' ? 'Activa' : 'Cerrada'}
            </span>
            {assignment.gradeGroupTarget && (
              <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{assignment.gradeGroupTarget}</span>
            )}
          </div>
          <h2 className="text-2xl font-black text-white">{assignment.title}</h2>
          {assignment.description && <p className="text-sm text-white/50 mt-1">{assignment.description}</p>}
        </div>

        <div className="flex gap-2">
          <button onClick={onToggleStatus} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:bg-white/5">
            {assignment.status === 'active' ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
            {assignment.status === 'active' ? 'Cerrar' : 'Reabrir'}
          </button>
          <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:bg-white/5">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Acceso */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 rounded-2xl p-5 mb-6">
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Enlace para estudiantes</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 bg-black/30 rounded-xl p-3 flex items-center gap-3">
            <Hash className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-2xl font-black text-white tracking-widest">{assignment.pin}</div>
              <div className="text-xs text-white/40 truncate">{shareUrl}</div>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(shareUrl)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
          >
            <Clipboard className="w-4 h-4" /> Copiar enlace
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-white">{assignment.submissions.length}</div>
          <div className="text-xs text-white/40 mt-0.5">Entregas</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-emerald-400">
            {assignment.submissions.length > 0
              ? Math.round(assignment.submissions.reduce((acc, s) => acc + s.accuracy, 0) / assignment.submissions.length)
              : 0}%
          </div>
          <div className="text-xs text-white/40 mt-0.5">Promedio</div>
        </div>
        <div className="bg-white/5 rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-purple-400">{assignment.maxCorrections}</div>
          <div className="text-xs text-white/40 mt-0.5">Comodines</div>
        </div>
      </div>

      {/* Tabla de resultados */}
      {sorted.length === 0 ? (
        <div className="bg-white/5 rounded-2xl p-10 text-center text-white/30">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Aún no hay entregas</p>
          <p className="text-sm mt-1">Comparte el PIN con tus estudiantes</p>
        </div>
      ) : (
        <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-0 text-xs font-bold text-white/40 uppercase tracking-wide px-4 py-3 border-b border-white/5">
            <span>Estudiante</span>
            <span className="text-center">Puntaje</span>
            <span className="text-center">Aciertos</span>
            <span className="text-center">Corr. usadas</span>
            <span />
          </div>
          {sorted.map((sub, idx) => (
            <button
              key={sub.id}
              onClick={() => setSelectedStudent(sub)}
              className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-0 items-center px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 text-left"
            >
              <div className="flex items-center gap-3">
                {idx === 0 && <Award className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                <MascotAvatar seed={sub.avatar} emotion="idle" size="xs" />
                <div>
                  <p className="text-sm font-semibold text-white">{sub.studentFullName}</p>
                  <p className="text-xs text-white/40">{sub.gradeGroup} · {fmtDate(sub.submittedAt)}</p>
                </div>
              </div>
              <div className="text-center font-bold text-white">{sub.score.toLocaleString()}</div>
              <div className="text-center">
                <span className={`text-sm font-bold ${sub.accuracy >= 80 ? 'text-emerald-400' : sub.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {sub.accuracy}%
                </span>
              </div>
              <div className="text-center text-sm text-purple-300">
                🔄 {sub.correctionsUsed}/{assignment.maxCorrections}
              </div>
              <ChevronRight className="w-4 h-4 text-white/30" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function HomeworkPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { assignments, createAssignment, toggleAssignmentStatus, deleteAssignment } = useHomeworkStore();
  const [showModal, setShowModal] = useState(searchParams.has('gameId'));
  const [selectedAssignment, setSelectedAssignment] = useState<HomeworkAssignment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const defaultGameId = searchParams.get('gameId') || undefined;

  const handleCreate = (data: Parameters<typeof createAssignment>[0]) => {
    const a = createAssignment(data);
    setShowModal(false);
    setSelectedAssignment(a);
  };

  const sorted = useMemo(
    () => [...assignments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [assignments]
  );

  if (selectedAssignment) {
    const live = assignments.find((a) => a.id === selectedAssignment.id) || selectedAssignment;
    return (
      <div>
        <AssignmentDetail
          assignment={live}
          onBack={() => setSelectedAssignment(null)}
          onToggleStatus={() => toggleAssignmentStatus(live.id)}
          onExport={() => exportCSV(live)}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">📚 Asignación de Deberes</h1>
          <p className="text-white/50 text-sm">Crea actividades para que tus estudiantes respondan en casa, a su ritmo.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-emerald-600/25"
        >
          <Plus className="w-4 h-4" /> Nueva Asignación
        </button>
      </div>

      {/* Lista */}
      {sorted.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Sin asignaciones todavía</h3>
          <p className="text-white/40 text-sm mb-6">Crea tu primera actividad para casa y comparte el PIN con tus estudiantes.</p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold"
          >
            <Plus className="w-4 h-4" /> Crear primera asignación
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((hw) => (
            <div
              key={hw.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 hover:bg-white/[0.07] transition-all group flex flex-col"
            >
              {/* Status badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${hw.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                  {hw.status === 'active' ? '🟢 Activa' : '🔴 Cerrada'}
                </span>
                {confirmDelete === hw.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => { deleteAssignment(hw.id); setConfirmDelete(null); }}
                      className="text-xs px-2 py-1 rounded-lg bg-red-600 text-white font-bold"
                    >
                      Eliminar
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/60">
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(hw.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Info */}
              <h3 className="font-bold text-white text-sm leading-tight mb-1">{hw.title}</h3>
              {hw.gradeGroupTarget && (
                <p className="text-xs text-purple-300 mb-1">{hw.gradeGroupTarget}</p>
              )}
              {hw.description && (
                <p className="text-xs text-white/40 leading-relaxed mb-3 line-clamp-2">{hw.description}</p>
              )}

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-white/40 mb-4 mt-auto pt-3 border-t border-white/5">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" /> PIN: <strong className="text-white/70">{hw.pin}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {hw.submissions.length} entregas
                </span>
                {hw.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {fmtDate(hw.dueDate)}
                  </span>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/homework/${hw.pin}`)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-xs font-semibold text-white/60 hover:bg-white/5"
                >
                  <Clipboard className="w-3.5 h-3.5" /> Copiar enlace
                </button>
                <button
                  onClick={() => setSelectedAssignment(hw)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/30"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver resultados
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <NewAssignmentModal
          defaultGameId={defaultGameId}
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Botón volver */}
      <div className="mt-8">
        <button onClick={() => navigate('/teacher/games')} className="text-sm text-white/40 hover:text-white flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a Mis Juegos
        </button>
      </div>
    </div>
  );
}
