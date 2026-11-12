import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle2, Clock, ArrowRight, ShieldCheck,
  User, Award, FileText, Camera, ChevronRight, RotateCcw,
  Sparkles, Lock, ArrowLeft
} from 'lucide-react';
import { useHomeworkStore } from '../../stores/homeworkStore';
import MascotAvatar, { AVAILABLE_MASCOT_SEEDS } from '../../components/game/MascotAvatar';
import type { HomeworkAssignment, HomeworkSubmission } from '../../types/homework';

interface StudentProfile {
  fullName: string;
  avatar: string;
}

export default function StudentWorkspacePage() {
  const { groupCode } = useParams<{ groupCode: string }>();
  const navigate = useNavigate();
  const { groups, assignments } = useHomeworkStore();

  const currentGroup = useMemo(() => {
    if (!groupCode) return undefined;
    const clean = groupCode.trim();
    return groups.find((g) => g.code === clean || g.id === clean);
  }, [groupCode, groups]);

  // Perfil del estudiante en sessionStorage
  const [student, setStudent] = useState<StudentProfile | null>(() => {
    try {
      const raw = sessionStorage.getItem(`hw_ws_${groupCode}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  const [inputName, setInputName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVAILABLE_MASCOT_SEEDS[0]);
  const [nameError, setNameError] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<{
    assignment: HomeworkAssignment;
    submission: HomeworkSubmission;
  } | null>(null);

  // Filtrar actividades pertenecientes a este grupo
  const groupAssignments = useMemo(() => {
    if (!currentGroup) return [];
    return assignments.filter((a) => a.groupId === currentGroup.id);
  }, [currentGroup, assignments]);

  const handleRegisterStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim() || inputName.trim().split(' ').length < 2) {
      setNameError('Por favor ingresa tu nombre completo (nombre y apellido).');
      return;
    }
    const profile: StudentProfile = {
      fullName: inputName.trim(),
      avatar: selectedAvatar,
    };
    sessionStorage.setItem(`hw_ws_${groupCode}`, JSON.stringify(profile));
    setStudent(profile);
  };

  const handleStartAssignment = (assignment: HomeworkAssignment) => {
    if (!student) return;
    // Precargar datos de estudiante para HomeworkPlayPage
    sessionStorage.setItem(
      'hw_student',
      JSON.stringify({
        pin: assignment.pin,
        fullName: student.fullName,
        gradeGroup: currentGroup?.name || 'Mi Curso',
        avatar: student.avatar,
      })
    );
    navigate(`/homework/play/${assignment.pin}`);
  };

  if (!currentGroup) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Grupo no encontrado</h2>
          <p className="text-xs text-white/50 mt-2 mb-6">
            El código de curso <strong>{groupCode}</strong> no existe o fue cerrado por el docente.
          </p>
          <Link
            to="/homework"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Ingresar otro código
          </Link>
        </div>
      </div>
    );
  }

  // Si el estudiante no ha ingresado su nombre, mostrar pantalla de bienvenida
  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mx-auto mb-3">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className="text-[10px] text-emerald-400 font-black tracking-widest uppercase block">
              Espacio de Curso
            </span>
            <h2 className="text-2xl font-black text-white mt-1">{currentGroup.name}</h2>
            <p className="text-xs text-white/50 mt-1">
              Ingresa tus datos para acceder a tu espacio de trabajo personal y privado.
            </p>
          </div>

          <form onSubmit={handleRegisterStudent} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={inputName}
                onChange={(e) => {
                  setInputName(e.target.value);
                  setNameError('');
                }}
                placeholder="Ej: Camilo Andrés Gómez"
                className="w-full p-3.5 rounded-xl bg-slate-950 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                Elige tu Mascota / Avatar
              </label>
              <div className="grid grid-cols-5 gap-2 p-3 rounded-2xl bg-slate-950 border border-white/10">
                {AVAILABLE_MASCOT_SEEDS.slice(0, 10).map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setSelectedAvatar(seed)}
                    className={`p-1.5 rounded-xl transition-all flex flex-col items-center ${
                      selectedAvatar === seed
                        ? 'bg-emerald-500/30 ring-2 ring-emerald-400 scale-105'
                        : 'opacity-50 hover:opacity-100 hover:bg-white/5'
                    }`}
                  >
                    <MascotAvatar seed={seed} size="xs" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 mt-2"
            >
              <span>Entrar a Mi Espacio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 p-3 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2.5 text-[11px] text-white/60">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Tus compañeros de curso no podrán ver tus calificaciones ni tus fotos de cuaderno.</span>
          </div>
        </div>
      </div>
    );
  }

  // Modal para ver mi entrega personal
  if (selectedSubmission) {
    const { assignment, submission } = selectedSubmission;
    return (
      <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedSubmission(null)}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a mi espacio
        </button>

        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl mb-6">
          <div className="flex items-center gap-3 mb-4">
            <MascotAvatar seed={student.avatar} emotion="happy" size="md" />
            <div>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Mi Entrega Personal
              </span>
              <h2 className="text-xl font-black text-white">{assignment.title}</h2>
              <p className="text-xs text-white/50">Entregado el {new Date(submission.submittedAt).toLocaleString('es-CO')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 mb-6 text-center">
            <div>
              <span className="text-2xl font-black text-emerald-400">{submission.accuracy}%</span>
              <span className="text-[10px] text-white/40 block">Aciertos</span>
            </div>
            <div>
              <span className="text-2xl font-black text-yellow-300">{submission.score.toLocaleString()}</span>
              <span className="text-[10px] text-white/40 block">Puntaje</span>
            </div>
            <div>
              <span className="text-2xl font-black text-purple-300">{submission.correctAnswers}/{submission.totalQuestions}</span>
              <span className="text-[10px] text-white/40 block">Correctas</span>
            </div>
          </div>

          {/* Fotos de mi trabajo */}
          {submission.studentPhotos && submission.studentPhotos.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-purple-400" />
                <span>Mis Fotos de Cuaderno / Evidencias ({submission.studentPhotos.length})</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {submission.studentPhotos.map((photo, pIdx) => (
                  <a
                    key={pIdx}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl overflow-hidden border border-white/15 bg-black/40 block aspect-video"
                  >
                    <img src={photo} alt={`Foto ${pIdx + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {submission.answers.map((ans, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs ${
                  ans.isCorrect ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
                }`}
              >
                <p className="font-semibold text-white/90 mb-1">{ans.questionPrompt}</p>
                <p className="text-[11px] text-white/60">
                  Tu respuesta: <strong className={ans.isCorrect ? 'text-emerald-300' : 'text-red-300'}>{ans.selectedOptionText}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── ESPACIO DE TRABAJO PRINCIPAL DEL ALUMNO ──
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header del Estudiante */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/30 shadow-2xl mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-1.5 flex items-center justify-center shrink-0">
            <MascotAvatar seed={student.avatar} emotion="happy" size="md" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Mi Espacio de Trabajo
              </span>
              <span className="text-xs text-white/40">{currentGroup.name}</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-0.5">{student.fullName}</h1>
            <p className="text-xs text-white/50">Código del Curso: <strong className="text-emerald-300 tracking-wider">{currentGroup.code}</strong></p>
          </div>
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem(`hw_ws_${groupCode}`);
            setStudent(null);
          }}
          className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-semibold transition-colors"
        >
          Cambiar Usuario
        </button>
      </header>

      {/* Banner de Privacidad Estricta */}
      <div className="mb-6 p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-center gap-3 text-xs text-purple-200">
        <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 flex-shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <p className="leading-snug">
          <strong>Espacio 100% Personal y Confidencial:</strong> Solo tú y tu profesor pueden ver tus calificaciones y las fotos de tu trabajo. Tus compañeros de clase no tienen acceso a tus actividades.
        </p>
      </div>

      {/* Listado de Actividades del Curso */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Actividades Asignadas ({groupAssignments.length})</span>
          </h2>
        </div>

        {groupAssignments.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3 text-white/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-sm">No hay actividades publicadas todavía</h3>
            <p className="text-xs text-white/40 mt-1">Tu profesor aún no ha publicado tareas para este grupo.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groupAssignments.map((hw) => {
              // Buscar si este estudiante ya tiene entrega en esta actividad
              const mySub = hw.submissions.find(
                (s) => s.studentFullName.trim().toLowerCase() === student.fullName.trim().toLowerCase()
              );
              const isCompleted = Boolean(mySub);

              return (
                <div
                  key={hw.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isCompleted
                      ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : hw.status === 'active'
                          ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                          : 'bg-white/10 text-white/40'
                      }`}>
                        {isCompleted ? '✅ Completada' : hw.status === 'active' ? '⏳ Pendiente' : '🔴 Cerrada'}
                      </span>
                      {hw.dueDate && (
                        <span className="text-[10px] text-white/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Hasta: {new Date(hw.dueDate).toLocaleDateString('es-CO')}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug mb-1">{hw.title}</h3>
                    {hw.description && (
                      <p className="text-xs text-white/50 line-clamp-2 mb-3">{hw.description}</p>
                    )}
                  </div>

                  {isCompleted ? (
                    <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-white/40 block">Tu Calificación:</span>
                        <span className="text-base font-black text-emerald-400">{mySub?.accuracy}% ({mySub?.score.toLocaleString()} pts)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSubmission({ assignment: hw, submission: mySub! })}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1 transition-colors"
                      >
                        Ver mi entrega
                      </button>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-white/10 mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-white/40">Sin responder</span>
                      <button
                        type="button"
                        disabled={hw.status === 'closed'}
                        onClick={() => handleStartAssignment(hw)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-30 text-xs font-black text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                      >
                        <span>Comenzar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
