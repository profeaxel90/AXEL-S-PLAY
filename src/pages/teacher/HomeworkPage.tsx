import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  BookOpen, Plus, Clipboard, CheckCircle2, XCircle,
  Trash2, Users, ChevronRight, Download, ArrowLeft,
  Calendar, Hash, ToggleLeft, ToggleRight, Eye, Award, FileText, Camera, Image as ImageIcon,
  QrCode, X, Clock, ExternalLink, Pencil, FolderPlus, Layers, Shield, Sparkles, Send, Video
} from 'lucide-react';
import { useHomeworkStore } from '../../stores/homeworkStore';
import { useGameStore } from '../../stores/gameStore';
import { encodeAssignmentPayload } from '../../lib/assignmentPayload';
import type { HomeworkAssignment, HomeworkSubmission, CourseGroup, HomeworkQuestion } from '../../types/homework';
import MascotAvatar from '../../components/game/MascotAvatar';
import StorageUsageBar from '../../components/common/StorageUsageBar';

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
    ['Nombre', 'Categoría', 'Puntaje', '% Aciertos', 'Correcciones usadas', 'Fecha entrega'],
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

// ── Componente: Modal Crear Nuevo Grupo ────────────────────────
function NewGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: { name: string; category?: string; description?: string }) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Secundaria');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), category: category.trim(), description: description.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
          <FolderPlus className="w-5 h-5 text-purple-400" />
          <span>Crear Grupo de Curso</span>
        </h3>
        <p className="text-xs text-white/50 mb-4">
          Tus estudiantes ingresarán con el código del grupo y verán únicamente sus actividades personales.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-white/70 mb-1">Nombre del Grupo / Curso *</label>
            <input
              type="text"
              required
              placeholder="Ej: Grado 10°A - Matemáticas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-xs w-full py-2 bg-slate-950 border-white/10"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 mb-1">Categoría / Nivel</label>
            <input
              type="text"
              placeholder="Ej: Secundaria, Primaria, Ciencias"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input text-xs w-full py-2 bg-slate-950 border-white/10"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 mb-1">Descripción / Indicaciones</label>
            <textarea
              rows={2}
              placeholder="Indicaciones generales para los alumnos de este grupo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input text-xs w-full py-2 bg-slate-950 border-white/10 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
            >
              Crear Grupo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente: Modal Nueva Asignación (Con Constructor de Preguntas) ──
interface NewAssignmentModalProps {
  defaultGameId?: string;
  initialAssignment?: HomeworkAssignment | null;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    description: string;
    gradeGroupTarget: string;
    groupId?: string;
    gameId: string;
    dueDate: string;
    dueTime?: string;
    maxCorrections: number;
    assignmentType: 'quiz' | 'pdf_guide' | 'exam_review';
    pdfUrl?: string;
    pdfName?: string;
    docUrl?: string;
    videoUrl?: string;
    externalLink?: string;
    allowPhotoUpload?: boolean;
    allowRetries?: boolean;
    customQuestions?: HomeworkQuestion[];
  }) => void;
}

function NewAssignmentModal({ defaultGameId, initialAssignment, onClose, onCreate }: NewAssignmentModalProps) {
  const gamesMap = useGameStore((state) => state.games);
  const games = useMemo(() => Object.values(gamesMap), [gamesMap]);
  const groups = useHomeworkStore((state) => state.groups);

  const [assignmentType, setAssignmentType] = useState<'quiz' | 'pdf_guide' | 'exam_review'>(
    initialAssignment?.assignmentType || 'quiz'
  );
  const [title, setTitle] = useState(initialAssignment?.title || '');
  const [description, setDescription] = useState(
    initialAssignment?.description || 'Lee con atención y responde la actividad.'
  );
  const [gradeGroupTarget, setGradeGroupTarget] = useState(initialAssignment?.gradeGroupTarget || '');
  const [groupId, setGroupId] = useState(initialAssignment?.groupId || '');
  const [gameId, setGameId] = useState(initialAssignment?.gameId || defaultGameId || (games[0]?.id ?? 'g-1'));
  const [dueDate, setDueDate] = useState(initialAssignment?.dueDate || '');
  const [dueTime, setDueTime] = useState(initialAssignment?.dueTime || '23:59');
  const [maxCorrections, setMaxCorrections] = useState(initialAssignment?.maxCorrections ?? 3);
  const [pdfUrl, setPdfUrl] = useState<string | null>(initialAssignment?.pdfUrl || null);
  const [pdfName, setPdfName] = useState<string | null>(initialAssignment?.pdfName || null);
  const [docUrl, setDocUrl] = useState<string>(initialAssignment?.docUrl || '');
  const [videoUrl, setVideoUrl] = useState<string>(initialAssignment?.videoUrl || '');
  const [externalLink, setExternalLink] = useState<string>(initialAssignment?.externalLink || '');
  const [allowPhotoUpload, setAllowPhotoUpload] = useState(initialAssignment?.allowPhotoUpload ?? true);
  const [allowRetries, setAllowRetries] = useState(initialAssignment?.allowRetries ?? false);

  // ── PREGUNTAS CREADAS DIRECTAMENTE POR EL DOCENTE EN ESTA ASIGNACIÓN ──
  const [questions, setQuestions] = useState<HomeworkQuestion[]>(() => {
    if (initialAssignment?.customQuestions && initialAssignment.customQuestions.length > 0) {
      return initialAssignment.customQuestions;
    }
    return [
      {
        id: `q-hw-${Date.now()}-1`,
        content: 'Escribe aquí la primera pregunta o instrucción...',
        allowChoice: true,
        allowTextResponse: true,
        allowPhotoUpload: true,
        options: [
          { id: 'opt-1', text: 'Opción A', isCorrect: true },
          { id: 'opt-2', text: 'Opción B', isCorrect: false },
          { id: 'opt-3', text: 'Opción C', isCorrect: false },
          { id: 'opt-4', text: 'Opción D', isCorrect: false },
        ],
      },
    ];
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPdfUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddQuestion = () => {
    const newQ: HomeworkQuestion = {
      id: `q-hw-${Date.now()}-${questions.length + 1}`,
      content: `Pregunta ${questions.length + 1}: `,
      allowChoice: false,
      allowTextResponse: true,
      allowPhotoUpload: true,
      options: [
        { id: `opt-${Date.now()}-1`, text: 'Opción A', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: 'Opción B', isCorrect: false },
        { id: `opt-${Date.now()}-3`, text: 'Opción C', isCorrect: false },
        { id: `opt-${Date.now()}-4`, text: 'Opción D', isCorrect: false },
      ],
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('La actividad debe tener al menos una pregunta.');
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, patch: Partial<HomeworkQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim() || 'Lee con atención y responde la actividad.',
      gradeGroupTarget: gradeGroupTarget.trim() || (groups.find(g => g.id === groupId)?.name || 'General'),
      groupId: groupId || undefined,
      gameId: gameId || 'g-1',
      dueDate,
      dueTime: dueTime.trim() || undefined,
      maxCorrections,
      assignmentType,
      pdfUrl: pdfUrl || undefined,
      pdfName: pdfName || undefined,
      docUrl: docUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      externalLink: externalLink.trim() || undefined,
      allowPhotoUpload: assignmentType === 'pdf_guide' ? allowPhotoUpload : true,
      allowRetries: assignmentType === 'exam_review' ? true : allowRetries,
      customQuestions: questions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-white text-base sm:text-lg">
                {initialAssignment ? 'Editar Asignación de Deberes' : 'Nueva Asignación de Deberes'}
              </h2>
              <p className="text-xs text-white/50">Crea tus preguntas y habilita texto, fotos o selección múltiple</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-full bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Datos Generales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-white/80 mb-1">Título de la Actividad *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Taller de Comprensión y Ejercicios Prácticos"
                className="input text-sm w-full py-2 bg-slate-950 border-white/10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">Vincular a Grupo / Curso</label>
              <select
                value={groupId}
                onChange={(e) => {
                  setGroupId(e.target.value);
                  const grp = groups.find(g => g.id === e.target.value);
                  if (grp && !gradeGroupTarget) setGradeGroupTarget(grp.name);
                }}
                className="input text-xs w-full py-2 bg-slate-950 border-white/10 text-emerald-300 font-bold"
              >
                <option value="">(Ninguno - Tarea Libre)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name} (PIN: {g.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">Categoría</label>
              <input
                type="text"
                value={gradeGroupTarget}
                onChange={(e) => setGradeGroupTarget(e.target.value)}
                placeholder="Ej: Secundaria, Ciencias, etc."
                className="input text-xs w-full py-2 bg-slate-950 border-white/10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">Fecha Límite</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input text-xs w-full py-2 bg-slate-950 border-white/10"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-white/80 mb-1">Hora Límite</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="input text-xs w-full py-2 bg-slate-950 border-white/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-white/80 mb-1">Instrucciones</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lee con atención y responde la actividad."
              className="input text-xs w-full py-2 bg-slate-950 border-white/10 resize-none"
            />
          </div>

          {/* ── MATERIAL ADJUNTO: SUBIR PDF/WORD O PEGAR ENLACE DE VIDEO / DOCUMENTO ── */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 via-purple-950/30 to-slate-950 border border-blue-500/30 space-y-3.5">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Material Adjunto (PDF, Word, Enlace o Video de YouTube)</span>
              </span>
              <p className="text-[11px] text-white/50 mt-0.5">
                El estudiante podrá ver el video o leer el documento de inmediato al abrir la actividad.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cargar Archivo PDF o Word */}
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-2">
                <label className="block text-[11px] font-bold text-white/80">
                  📄 Subir Archivo PDF o Word (.pdf, .doc, .docx)
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-200 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{pdfName ? 'Cambiar archivo' : 'Seleccionar archivo'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {pdfName && (
                    <button
                      type="button"
                      onClick={() => { setPdfUrl(null); setPdfName(null); }}
                      className="text-xs text-red-400 hover:text-red-300 p-1"
                      title="Quitar archivo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {pdfName ? (
                  <p className="text-xs text-emerald-400 font-bold truncate">✓ {pdfName}</p>
                ) : (
                  <p className="text-[10px] text-white/40">Sin archivo adjunto</p>
                )}
              </div>

              {/* Pegar Enlace de Video de YouTube */}
              <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                <label className="block text-[11px] font-bold text-white/80 flex items-center gap-1.5">
                  <span>🎥 Enlace de Video (YouTube o Vimeo)</span>
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="input text-xs w-full py-1.5 bg-slate-950 border-white/10 text-white placeholder-white/30"
                />
                <p className="text-[10px] text-white/40">Se reproducirá directamente dentro de la tarea del estudiante.</p>
              </div>
            </div>

            {/* Enlace o Documento Web Adicional */}
            <div className="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
              <label className="block text-[11px] font-bold text-white/80">
                🔗 Enlace Web o Documento en la Nube (Google Docs, Drive, Web externa)
              </label>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://docs.google.com/... o enlace de consulta"
                className="input text-xs w-full py-1.5 bg-slate-950 border-white/10 text-white placeholder-white/30"
              />
            </div>
          </div>

          {/* ── CONSTRUCTOR DE PREGUNTAS DIRECTO EN LA ASIGNACIÓN ── */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Preguntas de la Actividad ({questions.length})</span>
                </h3>
                <p className="text-xs text-white/50">Tú decides qué herramientas habilitar para cada pregunta.</p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Pregunta</span>
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div key={q.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center">
                      {qIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="p-1 text-white/30 hover:text-red-400 rounded-lg"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-white/60 mb-1">Enunciado o Pregunta *</label>
                    <textarea
                      rows={2}
                      value={q.content}
                      onChange={(e) => updateQuestion(qIdx, { content: e.target.value })}
                      placeholder="Escribe la pregunta o problema a resolver..."
                      className="input text-xs w-full py-2 bg-slate-950 border-white/10 resize-none font-medium"
                    />
                  </div>

                  {/* LO QUE HABILITA EL DOCENTE */}
                  <div>
                    <span className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-2">
                      ¿Qué debe responder el estudiante? (Habilitado por ti):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        q.allowChoice ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-slate-950 border-white/10 text-white/50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(q.allowChoice)}
                          onChange={(e) => updateQuestion(qIdx, { allowChoice: e.target.checked })}
                          className="w-4 h-4 accent-amber-400"
                        />
                        <span className="text-xs font-bold">🔘 Selección Múltiple</span>
                      </label>

                      <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        q.allowTextResponse ? 'bg-blue-500/20 border-blue-400 text-blue-200' : 'bg-slate-950 border-white/10 text-white/50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(q.allowTextResponse)}
                          onChange={(e) => updateQuestion(qIdx, { allowTextResponse: e.target.checked })}
                          className="w-4 h-4 accent-blue-400"
                        />
                        <span className="text-xs font-bold">✍️ Escribir Texto</span>
                      </label>

                      <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        q.allowPhotoUpload ? 'bg-purple-500/20 border-purple-400 text-purple-200' : 'bg-slate-950 border-white/10 text-white/50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={Boolean(q.allowPhotoUpload)}
                          onChange={(e) => updateQuestion(qIdx, { allowPhotoUpload: e.target.checked })}
                          className="w-4 h-4 accent-purple-400"
                        />
                        <span className="text-xs font-bold">📸 Subir Foto / Cuaderno</span>
                      </label>
                    </div>
                  </div>

                  {/* Si el docente habilitó opciones de selección múltiple */}
                  {q.allowChoice && (
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                      <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                        Opciones de Selección (Marca la correcta):
                      </span>
                      {(q.options || []).map((opt, oIdx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`corr-hw-${q.id}`}
                            checked={opt.isCorrect}
                            onChange={() => {
                              const updated = (q.options || []).map((o, idx) => ({
                                ...o,
                                isCorrect: idx === oIdx,
                              }));
                              updateQuestion(qIdx, { options: updated });
                            }}
                            className="w-4 h-4 accent-amber-400 cursor-pointer"
                          />
                          <span className="w-5 text-center text-xs font-black text-white/60">{String.fromCharCode(65 + oIdx)}</span>
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => {
                              const updated = (q.options || []).map((o, idx) =>
                                idx === oIdx ? { ...o, text: e.target.value } : o
                              );
                              updateQuestion(qIdx, { options: updated });
                            }}
                            placeholder={`Texto de la opción ${String.fromCharCode(65 + oIdx)}...`}
                            className="input text-xs py-1.5 flex-1 bg-slate-900 border-white/10"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-white/10 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
            >
              {initialAssignment ? 'Guardar Cambios' : 'Publicar Asignación'}
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
          <div className="text-xs text-purple-400 mt-0.5">🔄 {submission.correctionsUsed} correcciones usadas</div>
        </div>
      </div>

      {/* Evidencias fotográficas del estudiante si subió fotos de su cuaderno o procedimientos */}
      {submission.studentPhotos && submission.studentPhotos.length > 0 && (
        <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 mb-6 shadow-xl">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Evidencias Fotográficas del Alumno ({submission.studentPhotos.length})</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">
              Cuaderno / Procedimiento
            </span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {submission.studentPhotos.map((photo, pIdx) => (
              <a
                key={pIdx}
                href={photo}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-2xl overflow-hidden border border-white/20 bg-black/40 hover:border-purple-400 transition-all shadow-md block"
                title="Clic para ampliar foto"
              >
                <img
                  src={photo}
                  alt={`Evidencia ${pIdx + 1}`}
                  className="w-full h-36 object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                  <Eye className="w-4 h-4" />
                  <span>Ampliar</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Respuestas detalladas */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider text-white/70">
          Respuestas Entregadas ({submission.answers.length})
        </h4>
        {submission.answers.map((ans, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border transition-all ${
              ans.isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <span className="text-xs font-bold text-white/60">Pregunta {idx + 1}</span>
              {ans.isCorrect ? (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Correcta
                </span>
              ) : (
                <span className="text-xs text-red-400 font-bold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Incorrecta
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-white mb-2">{ans.questionPrompt}</p>
            <div className="text-xs space-y-1">
              <p className="text-white/70">
                Respuesta del alumno: <strong className="text-white">{ans.selectedOptionText}</strong>
              </p>
              {!ans.isCorrect && ans.correctOptionText && (
                <p className="text-emerald-400">
                  Respuesta correcta esperada: <strong>{ans.correctOptionText}</strong>
                </p>
              )}
              {ans.writtenAnswer && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-900/80 border border-blue-500/30 text-xs">
                  <span className="text-blue-300 font-bold block mb-0.5">✍️ Texto redactado por el estudiante:</span>
                  <p className="text-white whitespace-pre-wrap">{ans.writtenAnswer}</p>
                </div>
              )}
              {ans.studentPhoto && (
                <div className="mt-2 p-2.5 rounded-xl bg-slate-900/80 border border-purple-500/30 text-xs">
                  <span className="text-purple-300 font-bold block mb-1">📸 Foto de trabajo adjunta:</span>
                  <a href={ans.studentPhoto} target="_blank" rel="noopener noreferrer">
                    <img src={ans.studentPhoto} alt="Evidencia" className="max-h-48 rounded-lg object-contain border border-white/20 hover:scale-105 transition-transform" />
                  </a>
                </div>
              )}
              {ans.wasCorrected && (
                <p className="text-purple-300 text-[11px]">🔄 Esta respuesta fue corregida usando un comodín.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Componente: Detalle de Asignación ─────────────────────────
function AssignmentDetail({
  assignment,
  onBack,
  onToggleStatus,
  onExport,
  onOpenQr,
  onEdit,
}: {
  assignment: HomeworkAssignment;
  onBack: () => void;
  onToggleStatus: () => void;
  onExport: () => void;
  onOpenQr?: (assignment: HomeworkAssignment) => void;
  onEdit?: () => void;
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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

        <div className="flex gap-2 flex-wrap">
          <a
            href={`/homework/${assignment.pin}?preview=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/40 bg-blue-500/15 text-xs font-bold text-blue-300 hover:bg-blue-500/25 transition-colors"
            title="Ver la actividad exactamente como la ve el estudiante"
          >
            <Eye className="w-4 h-4 text-blue-400" />
            <span>👁️ Vista Previa</span>
          </a>
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-colors"
              title="Editar parámetros y preguntas"
            >
              <Pencil className="w-4 h-4 text-purple-400" /> Editar
            </button>
          )}
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
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Acceso y Enlace para estudiantes</h3>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          <div className="flex-1 bg-black/30 rounded-xl p-3 flex items-center gap-3">
            <Hash className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-2xl font-black text-white tracking-widest">{assignment.pin}</div>
              <div className="text-xs text-white/40 truncate">{shareUrl}</div>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(shareUrl)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
          >
            <Clipboard className="w-4 h-4" /> Copiar Enlace
          </button>
          {onOpenQr && (
            <button
              onClick={() => onOpenQr(assignment)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold transition-colors"
            >
              <QrCode className="w-4 h-4" /> Ver Código QR
            </button>
          )}
        </div>
      </div>

      {/* Entregas */}
      <h3 className="text-lg font-black text-white mb-3">Entregas de Estudiantes ({assignment.submissions.length})</h3>
      {sorted.length === 0 ? (
        <div className="p-8 text-center text-white/40 bg-white/5 rounded-2xl border border-white/5">
          No hay entregas todavía. Comparte el PIN con tus estudiantes.
        </div>
      ) : (
        <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
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

// ── Modal de Código QR ──────────────────────────────────────
function AssignmentQrModal({ assignment, onClose }: { assignment: HomeworkAssignment; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [copiedVercel, setCopiedVercel] = useState(false);

  // URL directa y limpia: https://axel-s-play.vercel.app/homework/{pin}
  const cleanVercelUrl = `https://axel-s-play.vercel.app/homework/${assignment.pin}`;

  const handleCopy = () => {
    copyToClipboard(cleanVercelUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white rounded-full bg-white/5">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-black text-white">{assignment.title}</h3>
        <p className="text-xs text-white/50 mt-1 mb-4">Escanea este código con cualquier celular para abrir la actividad</p>

        {/* QR con nivel 'L' y URL ultra limpia que garantiza 100% de éxito en cualquier celular */}
        <div className="bg-white p-4 rounded-2xl shadow-xl inline-block mx-auto mb-4 ring-4 ring-emerald-500/20">
          <QRCodeSVG value={cleanVercelUrl} size={200} level="L" includeMargin={true} />
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4">
          <span className="text-[10px] text-white/40 uppercase tracking-wider block font-bold">PIN de Acceso</span>
          <span className="text-2xl font-black text-emerald-400 tracking-widest">{assignment.pin}</span>
          <span className="text-[11px] text-white/50 block mt-1 truncate">{cleanVercelUrl}</span>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/30"
        >
          <Clipboard className="w-4 h-4" />
          <span>{copied ? '¡Enlace copiado!' : 'Copiar enlace directo'}</span>
        </button>
      </div>
    </div>
  );
}

// ── Página principal de Asignación de Deberes ─────────────────
export default function HomeworkPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    assignments, groups,
    createAssignment, updateAssignment, toggleAssignmentStatus, deleteAssignment,
    createGroup, deleteGroup
  } = useHomeworkStore();

  const [activeTab, setActiveTab] = useState<'assignments' | 'groups'>('assignments');
  const [showModal, setShowModal] = useState(searchParams.has('gameId'));
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<HomeworkAssignment | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<HomeworkAssignment | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<string | null>(null);
  const [qrModalAssignment, setQrModalAssignment] = useState<HomeworkAssignment | null>(null);
  const [viewingGroupSubmissions, setViewingGroupSubmissions] = useState<CourseGroup | null>(null);

  const defaultGameId = searchParams.get('gameId') || undefined;

  const handleCreate = (data: Parameters<typeof createAssignment>[0]) => {
    const a = createAssignment(data);
    setShowModal(false);
    setSelectedAssignment(a);
  };

  const handleUpdate = (data: Parameters<typeof createAssignment>[0]) => {
    if (!editingAssignment) return;
    updateAssignment(editingAssignment.id, data);
    setEditingAssignment(null);
  };

  const sortedAssignments = useMemo(
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
          onOpenQr={(a) => setQrModalAssignment(a)}
          onEdit={() => setEditingAssignment(live)}
        />
        {qrModalAssignment && (
          <AssignmentQrModal assignment={qrModalAssignment} onClose={() => setQrModalAssignment(null)} />
        )}
        {editingAssignment && (
          <NewAssignmentModal
            initialAssignment={editingAssignment}
            onClose={() => setEditingAssignment(null)}
            onCreate={handleUpdate}
          />
        )}
      </div>
    );
  }

  // Vista de entregas de un grupo (Solo profesor)
  if (viewingGroupSubmissions) {
    const group = viewingGroupSubmissions;
    const groupHws = assignments.filter((a) => a.groupId === group.id);
    const allSubs = groupHws.flatMap((a) => a.submissions);

    return (
      <div className="space-y-6">
        <button
          onClick={() => setViewingGroupSubmissions(null)}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Mis Grupos
        </button>

        <div className="p-6 rounded-3xl bg-slate-900 border border-purple-500/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/40">
                🔒 Panel Privado del Docente
              </span>
              <span className="text-xs text-white/40">Código: {group.code}</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">{group.name}</h2>
            <p className="text-xs text-white/50">{group.description || 'Matriz de entregas centralizada de este curso'}</p>
          </div>
          <button
            onClick={() => copyToClipboard(`${window.location.origin}/homework/group/${group.code}`)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30"
          >
            <Clipboard className="w-4 h-4" /> Copiar Enlace para Alumnos
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-2xl font-black text-white">{groupHws.length}</span>
            <span className="text-xs text-white/40 block">Actividades del Curso</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-2xl font-black text-emerald-400">{allSubs.length}</span>
            <span className="text-xs text-white/40 block">Total Entregas Recibidas</span>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <span className="text-2xl font-black text-yellow-300">
              {allSubs.length > 0 ? Math.round(allSubs.reduce((a, b) => a + b.accuracy, 0) / allSubs.length) : 0}%
            </span>
            <span className="text-xs text-white/40 block">Promedio del Grupo</span>
          </div>
        </div>

        {/* Tabla de alumnos */}
        <h3 className="text-base font-black text-white">Entregas de los Estudiantes</h3>
        {allSubs.length === 0 ? (
          <div className="p-8 text-center text-white/40 bg-white/5 rounded-2xl">
            Aún no hay entregas de estudiantes en este grupo.
          </div>
        ) : (
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
            {allSubs.map((sub) => (
              <div
                key={sub.id}
                className="p-4 border-b border-white/5 last:border-0 flex items-center justify-between gap-3 hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <MascotAvatar seed={sub.avatar} size="xs" />
                  <div>
                    <p className="text-sm font-bold text-white">{sub.studentFullName}</p>
                    <p className="text-xs text-white/40">{new Date(sub.submittedAt).toLocaleString('es-CO')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-emerald-400">{sub.accuracy}%</span>
                  <span className="text-white">{sub.score} pts</span>
                  {sub.studentPhotos && sub.studentPhotos.length > 0 && (
                    <span className="text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                      📸 {sub.studentPhotos.length} fotos
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── BARRA DE CAPACIDAD DE MEMORIA DE AXEL'S PLAY ── */}
      <StorageUsageBar />

      {/* Encabezado Principal y Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">📚 Asignación de Deberes</h1>
          <p className="text-white/50 text-sm">Gestiona tareas escolares para casa y cursos organizados.</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'assignments' ? (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm hover:opacity-90 shadow-lg shadow-emerald-600/25"
            >
              <Plus className="w-4 h-4" /> Nueva Asignación
            </button>
          ) : (
            <button
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm hover:opacity-90 shadow-lg shadow-purple-600/25"
            >
              <FolderPlus className="w-4 h-4" /> Crear Nuevo Grupo
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'assignments'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Actividades ({assignments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'groups'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Grupos y Cursos ({groups.length})</span>
        </button>
      </div>

      {/* ── PESTAÑA 1: ACTIVIDADES ── */}
      {activeTab === 'assignments' && (
        <>
          {sortedAssignments.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
              <BookOpen className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-white mb-1">Sin actividades creadas</h3>
              <p className="text-white/40 text-xs mb-5">Crea tu primera tarea con preguntas de opción múltiple, texto o fotos.</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
              >
                Crear Actividad
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedAssignments.map((hw) => (
                <div
                  key={hw.id}
                  onClick={() => setSelectedAssignment(hw)}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-emerald-500/50 hover:bg-white/[0.07] transition-all flex flex-col justify-between cursor-pointer group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        hw.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'
                      }`}>
                        {hw.status === 'active' ? '🟢 Activa' : '🔴 Cerrada'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingAssignment(hw)}
                          className="p-1.5 rounded-lg text-white/40 hover:text-purple-300 hover:bg-purple-500/10"
                          title="Editar actividad"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === hw.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => { deleteAssignment(hw.id); setConfirmDeleteId(null); }}
                              className="text-[10px] px-2 py-1 rounded bg-red-600 text-white font-bold"
                            >
                              Eliminar
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] px-2 py-1 rounded bg-white/10 text-white/60">
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(hw.id)}
                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10"
                            title="Eliminar actividad"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-sm leading-tight mb-1 group-hover:text-emerald-300 transition-colors">
                      {hw.title}
                    </h3>
                    {hw.gradeGroupTarget && (
                      <span className="text-[11px] text-purple-300 block mb-1">{hw.gradeGroupTarget}</span>
                    )}
                    {hw.description && (
                      <p className="text-xs text-white/40 line-clamp-2 mb-3">{hw.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-white/5 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span>PIN: <strong className="text-white font-mono">{hw.pin}</strong></span>
                      <span className="font-bold text-emerald-400">📋 {hw.submissions.length} entregas</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        onClick={() => copyToClipboard(`${window.location.origin}/homework/${hw.pin}`)}
                        className="py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-white/70 hover:bg-white/5 flex items-center justify-center gap-1"
                      >
                        <Clipboard className="w-3 h-3" /> Enlace
                      </button>
                      <button
                        onClick={() => setQrModalAssignment(hw)}
                        className="py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-bold text-emerald-300 flex items-center justify-center gap-1"
                      >
                        <QrCode className="w-3 h-3" /> QR
                      </button>
                      <a
                        href={`/homework/${hw.pin}?preview=true`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-[10px] font-bold text-blue-300 flex items-center justify-center gap-1 text-center hover:bg-blue-500/20"
                      >
                        <Eye className="w-3 h-3" /> Ver
                      </a>
                      <button
                        onClick={() => setSelectedAssignment(hw)}
                        className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center gap-1 shadow-sm"
                      >
                        Entregas
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── PESTAÑA 2: GRUPOS Y CURSOS ── */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
              <Users className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-lg font-bold text-white mb-1">Sin grupos de curso todavía</h3>
              <p className="text-white/40 text-xs mb-5">Crea un grupo para que tus alumnos carguen sus actividades en un espacio privado.</p>
              <button
                onClick={() => setShowGroupModal(true)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs"
              >
                Crear Primer Grupo
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((grp) => {
                const groupActivities = assignments.filter((a) => a.groupId === grp.id);
                const totalSubs = groupActivities.reduce((acc, a) => acc + a.submissions.length, 0);

                return (
                  <div
                    key={grp.id}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2.5 py-0.5 rounded-full border border-purple-500/30">
                          {grp.category || 'Curso'}
                        </span>
                        {confirmDeleteGroupId === grp.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => { deleteGroup(grp.id, true); setConfirmDeleteGroupId(null); }}
                              className="text-[10px] px-2 py-1 rounded bg-red-600 text-white font-bold"
                            >
                              Confirmar Eliminar TODO
                            </button>
                            <button onClick={() => setConfirmDeleteGroupId(null)} className="text-[10px] px-2 py-1 rounded bg-white/10 text-white/60">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteGroupId(grp.id)}
                            className="p-1 text-white/30 hover:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-red-500/10 px-2 py-1"
                            title="Eliminar TODO el grupo y sus tareas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar Grupo</span>
                          </button>
                        )}
                      </div>

                      <h3 className="text-base font-black text-white leading-tight mb-1">{grp.name}</h3>
                      {grp.description && (
                        <p className="text-xs text-white/50 line-clamp-2 mb-3">{grp.description}</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>Código / PIN: <strong className="text-emerald-300 font-black">{grp.code}</strong></span>
                        <span>{groupActivities.length} actividades · {totalSubs} entregas</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/homework/group/${grp.code}`)}
                          className="py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Clipboard className="w-3.5 h-3.5" /> Enlace Alumnos
                        </button>
                        <button
                          onClick={() => setViewingGroupSubmissions(grp)}
                          className="py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver Entregas
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Nueva Asignación */}
      {showModal && (
        <NewAssignmentModal
          defaultGameId={defaultGameId}
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Modal Editar Asignación */}
      {editingAssignment && (
        <NewAssignmentModal
          initialAssignment={editingAssignment}
          onClose={() => setEditingAssignment(null)}
          onCreate={handleUpdate}
        />
      )}

      {/* Modal Crear Grupo */}
      {showGroupModal && (
        <NewGroupModal
          onClose={() => setShowGroupModal(false)}
          onCreate={(data) => createGroup(data)}
        />
      )}

      {/* Modal QR Code */}
      {qrModalAssignment && (
        <AssignmentQrModal
          assignment={qrModalAssignment}
          onClose={() => setQrModalAssignment(null)}
        />
      )}
    </div>
  );
}
