import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Save, ArrowLeft, Plus, Trash2, Copy, Eye, Clock,
  Award, Sparkles, CheckCircle2, Image as ImageIcon,
  HelpCircle, Settings, Layers, ListOrdered, Upload, Database
} from 'lucide-react';
import { SUBJECTS } from '../../types';
import type { QuestionType, Difficulty, GameMode, GradeLevel } from '../../types';
import QuestionBankPickerModal from '../../components/teacher/QuestionBankPickerModal';
import GamePreviewModal from '../../components/teacher/GamePreviewModal';
import { useGameStore } from '../../stores/gameStore';
import type { Question } from '../../types';
import type { BankItem } from '../../data/questionBank';

interface QuestionDraft {
  id: string;
  type: QuestionType;
  content: string;
  timeLimit: number;
  points: number;
  pointsMultiplier?: 1 | 2 | 3;
  difficulty: Difficulty;
  explanation: string;
  imageUrl?: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

export default function GameEditorPage() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const isEditing = Boolean(gameId && gameId !== 'new');
  const { getGame, saveGame } = useGameStore();

  // Metadatos del Juego
  const [title, setTitle] = useState(isEditing ? 'Seguridad Vial y Normas de Tránsito' : '');
  const [description, setDescription] = useState(isEditing ? 'Evaluación interactiva de normas viales' : '');
  const [subject, setSubject] = useState<string>(SUBJECTS[11]); // Educación Vial
  const [topic, setTopic] = useState('Señales Reglamentarias');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('secondary');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameMode, setGameMode] = useState<GameMode>('battle_live');
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [isPublic, setIsPublic] = useState(true);

  // Preguntas
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      id: 'q-1',
      type: 'single_choice',
      content: '¿Cuál es el significado de una señal de tránsito octagonal con fondo rojo?',
      timeLimit: 20,
      points: 1000,
      pointsMultiplier: 1,
      difficulty: 'easy',
      explanation: 'La señal octagonal roja indica siempre la obligación absoluta de DETENERSE por completo (PARE).',
      options: [
        { id: 'opt-1', text: 'Parada obligatoria (PARE)', isCorrect: true },
        { id: 'opt-2', text: 'Ceda el paso voluntario', isCorrect: false },
        { id: 'opt-3', text: 'Zona escolar adelante', isCorrect: false },
        { id: 'opt-4', text: 'Velocidad máxima permitida', isCorrect: false },
      ],
    },
    {
      id: 'q-2',
      type: 'true_false',
      content: 'El uso del cinturón de seguridad es obligatorio únicamente en las sillas delanteras de un vehículo.',
      timeLimit: 15,
      points: 1000,
      pointsMultiplier: 1,
      difficulty: 'medium',
      explanation: 'El cinturón es de uso obligatorio para todos los ocupantes del vehículo, incluidos los asientos traseros.',
      options: [
        { id: 'opt-tf-1', text: 'Verdadero', isCorrect: false },
        { id: 'opt-tf-2', text: 'Falso', isCorrect: true },
      ],
    },
  ]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  const activeQuestion = questions[activeQuestionIndex] || questions[0];

  const handleImportFromBank = (bankItems: BankItem[]) => {
    const newDrafts: QuestionDraft[] = bankItems.map((item, idx) => {
      let options = item.options?.map((opt, oIdx) => ({
        id: `opt-bank-${Date.now()}-${idx}-${oIdx}`,
        text: opt.text,
        isCorrect: opt.isCorrect,
      }));

      if (!options || options.length === 0) {
        if (item.type === 'true_false') {
          const isV = item.correctAnswer.toLowerCase().includes('verdader');
          options = [
            { id: `opt-bank-${Date.now()}-${idx}-1`, text: 'Verdadero', isCorrect: isV },
            { id: `opt-bank-${Date.now()}-${idx}-2`, text: 'Falso', isCorrect: !isV },
          ];
        } else {
          options = [
            { id: `opt-bank-${Date.now()}-${idx}-1`, text: item.correctAnswer, isCorrect: true },
            { id: `opt-bank-${Date.now()}-${idx}-2`, text: 'Opción alternativa A', isCorrect: false },
            { id: `opt-bank-${Date.now()}-${idx}-3`, text: 'Opción alternativa B', isCorrect: false },
            { id: `opt-bank-${Date.now()}-${idx}-4`, text: 'Opción alternativa C', isCorrect: false },
          ];
        }
      }

      return {
        id: `q-bank-${Date.now()}-${idx}`,
        type: item.type,
        content: item.content,
        timeLimit: timePerQuestion || 30,
        points: 1000,
        pointsMultiplier: 1,
        difficulty: item.difficulty || 'medium',
        explanation: `Respuesta correcta: ${item.correctAnswer}`,
        options,
      };
    });

    setQuestions((prev) => [...prev, ...newDrafts]);
    setActiveQuestionIndex(questions.length);
  };

  // Cargar juego existente si estamos editando
  useEffect(() => {
    if (isEditing && gameId) {
      const existingGame = getGame(gameId);
      if (existingGame) {
        setTitle(existingGame.title || '');
        setDescription(existingGame.description || '');
        if (existingGame.subject) setSubject(existingGame.subject);
        if (existingGame.topic) setTopic(existingGame.topic);
        if (existingGame.gradeLevel) setGradeLevel(existingGame.gradeLevel);
        if (existingGame.difficulty) setDifficulty(existingGame.difficulty);
        if (existingGame.gameMode) setGameMode(existingGame.gameMode);
        if (existingGame.settings?.timePerQuestion) setTimePerQuestion(existingGame.settings.timePerQuestion);
        if (existingGame.isPublic !== undefined) setIsPublic(existingGame.isPublic);

        if (existingGame.questions && existingGame.questions.length > 0) {
          const loadedQuestions: QuestionDraft[] = existingGame.questions.map((q, idx) => {
            const rawOptions = q.options && q.options.length > 0 ? q.options : [
              { id: 'opt-1', text: 'Opción 1', isCorrect: true },
              { id: 'opt-2', text: 'Opción 2', isCorrect: false },
            ];

            const options = rawOptions.map((opt, oIdx) => {
              const isCorr = opt.isCorrect !== undefined
                ? opt.isCorrect
                : opt.id === q.correctAnswer || (Array.isArray(q.correctAnswer) && (q.correctAnswer as unknown as string[]).includes(opt.id)) || (oIdx === 0 && !q.correctAnswer);
              return {
                id: opt.id || `opt-${idx}-${oIdx}`,
                text: opt.text || '',
                isCorrect: Boolean(isCorr),
              };
            });

            // Asegurar que al menos una opción esté marcada como correcta
            if (!options.some((o) => o.isCorrect) && options.length > 0) {
              options[0].isCorrect = true;
            }

            return {
              id: q.id || `q-${idx + 1}`,
              type: q.type || 'single_choice',
              content: q.content || '',
              timeLimit: q.timeLimit || 20,
              points: q.points || 1000,
              pointsMultiplier: q.pointsMultiplier || 1,
              difficulty: q.difficulty || 'medium',
              explanation: q.explanation || '',
              imageUrl: q.imageUrl,
              options,
            };
          });

          setQuestions(loadedQuestions);
          setActiveQuestionIndex(0);
        }
      }
    }
  }, [isEditing, gameId, getGame]);

  const handleAddQuestion = () => {
    const newQ: QuestionDraft = {
      id: `q-${Date.now()}-${questions.length + 1}`,
      type: 'single_choice',
      content: `Nueva pregunta ${questions.length + 1}...`,
      timeLimit: timePerQuestion || 20,
      points: 1000,
      pointsMultiplier: 1,
      difficulty: 'medium',
      explanation: '',
      options: [
        { id: `opt-${Date.now()}-1`, text: 'Opción 1', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: 'Opción 2', isCorrect: false },
        { id: `opt-${Date.now()}-3`, text: 'Opción 3', isCorrect: false },
        { id: `opt-${Date.now()}-4`, text: 'Opción 4', isCorrect: false },
      ],
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDuplicateQuestion = (idx: number) => {
    const orig = questions[idx];
    const duplicated: QuestionDraft = {
      ...orig,
      id: `q-${Date.now()}-${Math.random()}`,
      content: `${orig.content} (Copia)`,
      options: orig.options.map((o) => ({ ...o, id: `opt-${Date.now()}-${Math.random()}` })),
    };
    const updated = [...questions];
    updated.splice(idx + 1, 0, duplicated);
    setQuestions(updated);
    setActiveQuestionIndex(idx + 1);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('El juego debe tener al menos una pregunta.');
      return;
    }
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setActiveQuestionIndex(Math.max(0, idx - 1));
  };

  const updateActiveQuestion = (patch: Partial<QuestionDraft>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === activeQuestionIndex ? { ...q, ...patch } : q))
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Por favor ingresa un título para el juego.');
      return;
    }

    if (questions.length === 0) {
      alert('El juego debe tener al menos una pregunta.');
      return;
    }

    // Convertir y estructurar todas las preguntas para almacenamiento definitivo
    const convertedQuestions: Question[] = questions.map((q, idx) => {
      const correctOptions = q.options.filter((o) => o.isCorrect);
      let correctAnswer: Question['correctAnswer'] = 'opt-1';

      if (q.type === 'multiple_choice') {
        correctAnswer = correctOptions.map((o) => o.id);
      } else {
        correctAnswer = correctOptions[0]?.id || q.options[0]?.id || 'opt-1';
      }

      return {
        id: q.id || `q-${idx + 1}`,
        teacherId: 'teacher-1',
        type: q.type,
        content: q.content.trim() || `Pregunta ${idx + 1}`,
        timeLimit: q.timeLimit || timePerQuestion || 20,
        points: q.points || 1000,
        pointsMultiplier: q.pointsMultiplier || 1,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation || '',
        imageUrl: q.imageUrl,
        orderIndex: idx,
        correctAnswer,
        createdAt: new Date().toISOString(),
        options: q.options.map((o) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      };
    });

    saveGame({
      id: isEditing ? gameId : undefined,
      title: title.trim(),
      description: description.trim(),
      subject,
      topic,
      gradeLevel,
      difficulty,
      gameMode,
      timePerQuestion,
      isPublic,
      questions: convertedQuestions,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      navigate('/teacher/games');
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/teacher/games"
            className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-white/70 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">
              {isEditing ? 'Editar Juego' : 'Crear Nuevo Juego'}
            </h1>
            <p className="text-xs text-white/50">Configuración pedagógica y editor de preguntas</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsBankModalOpen(true)}
            className="py-2.5 px-4 rounded-xl text-xs font-black flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-600/30 border border-amber-400/40 hover:scale-105 transition-all"
            title="Seleccionar preguntas del Banco de Preguntas central"
          >
            <Database className="w-4 h-4 text-amber-200" />
            <span>📚 Desde el Banco</span>
            <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.5 font-black rounded-full">POPULAR</span>
          </button>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>{showPreview ? 'Ocultar Vista Previa' : 'Vista Previa Estudiante'}</span>
          </button>

          <button
            onClick={handleSave}
            className="btn-primary py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30"
          >
            <Save className="w-4 h-4" />
            <span>{savedSuccess ? '¡Guardado!' : 'Guardar Juego'}</span>
          </button>
        </div>
      </div>

      {/* ── Metadatos del Juego (Colapsible) ── */}
      <div className="card p-6 border-white/10 bg-slate-900/40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-white/70 uppercase mb-1">
              Nombre de la Actividad *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Seguridad Vial y Señales de Tránsito"
              className="input font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase mb-1">
              Materia / Categoría
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="input bg-slate-900 border-white/10"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-white/60 mb-1">Modalidad de Juego</label>
            <select
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value as GameMode)}
              className="input text-xs bg-slate-900 border-white/10 py-2"
            >
              <option value="battle_live">⚔️ Batalla en Vivo</option>
              <option value="individual">🏋️ Individual</option>
              <option value="team_battle">🤝 Por Equipos</option>
              <option value="survival">❤️ Supervivencia</option>
              <option value="escape_room">🔐 Escape Room</option>
              <option value="wheel">🎡 Ruleta</option>
              <option value="find_error">🔍 Detecta el Error</option>
              <option value="ordering">📋 Ordena y Gana</option>
              <option value="true_false_fast">✅ Verdadero o Falso</option>
            </select>
          </div>

          <div>
            <label className="block text-white/60 mb-1">Nivel Educativo</label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value as GradeLevel)}
              className="input text-xs bg-slate-900 border-white/10 py-2"
            >
              <option value="primary">Primaria</option>
              <option value="secondary">Secundaria</option>
              <option value="highschool">Educación Media</option>
              <option value="university">Superior</option>
              <option value="technical">Técnica / Tecnológica</option>
              <option value="driving">Escuela de Conducción</option>
              <option value="corporate">Capacitación Empresarial</option>
              <option value="autonomous">Aprendizaje Autónomo</option>
            </select>
          </div>

          <div>
            <label className="block text-white/60 mb-1">Dificultad</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="input text-xs bg-slate-900 border-white/10 py-2"
            >
              <option value="easy">Fácil</option>
              <option value="medium">Intermedio</option>
              <option value="hard">Difícil</option>
              <option value="expert">Experto</option>
            </select>
          </div>

          <div>
            <label className="block text-white/60 mb-1">Tiempo base (seg)</label>
            <input
              type="number"
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(Number(e.target.value))}
              min={5}
              max={180}
              className="input text-xs py-2"
            />
          </div>
        </div>
      </div>

      {/* ── Editor de Preguntas y Navegación Lateral ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Columna Izquierda: Lista de Preguntas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
              Preguntas ({questions.length})
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsBankModalOpen(true)}
                className="btn-secondary py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                title="Seleccionar y jalar preguntas del Banco de Preguntas"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Banco</span>
              </button>
              <button
                onClick={handleAddQuestion}
                className="btn-primary py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                onClick={() => setActiveQuestionIndex(idx)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  activeQuestionIndex === idx
                    ? 'border-purple-500 bg-purple-600/20 shadow-md shadow-purple-600/20'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-medium truncate text-white/90">
                    {q.content || 'Sin enunciado...'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateQuestion(idx);
                    }}
                    className="p-1 text-white/40 hover:text-white"
                    title="Duplicar"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(idx);
                    }}
                    className="p-1 text-white/40 hover:text-red-400"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Formulario de Edición de la Pregunta Activa */}
        <div className="lg:col-span-3 space-y-4">
          <div className="card p-6 border-white/10 space-y-5">
            {/* Tipo de Pregunta & Parámetros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">
                  Tipo de Pregunta
                </label>
                <select
                  value={activeQuestion.type}
                  onChange={(e) => updateActiveQuestion({ type: e.target.value as QuestionType })}
                  className="input text-xs bg-slate-900 border-white/10 py-2 font-semibold"
                >
                  <option value="single_choice">Selección Única (4 opciones)</option>
                  <option value="multiple_choice">Selección Múltiple</option>
                  <option value="true_false">Verdadero o Falso</option>
                  <option value="short_answer">Respuesta Corta</option>
                  <option value="ordering">Ordenar Elementos (Drag & Drop)</option>
                  <option value="matching">Relacionar Columnas</option>
                  <option value="find_error">Identificar Errores</option>
                  <option value="image_based">Pregunta con Imagen</option>
                  <option value="situation">Interpretación de Casos</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">
                  Límite de Tiempo
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={activeQuestion.timeLimit}
                    onChange={(e) => updateActiveQuestion({ timeLimit: Number(e.target.value) })}
                    min={5}
                    max={180}
                    className="input text-xs pl-9 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">
                  Puntuación Base
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-yellow-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={activeQuestion.points}
                    onChange={(e) => updateActiveQuestion({ points: Number(e.target.value) })}
                    step={100}
                    min={100}
                    max={5000}
                    className="input text-xs pl-9 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1">
                  Multiplicador de Puntos
                </label>
                <select
                  value={activeQuestion.pointsMultiplier || 1}
                  onChange={(e) => updateActiveQuestion({ pointsMultiplier: Number(e.target.value) as 1 | 2 | 3 })}
                  className="input text-xs bg-slate-900 border-white/10 py-2 font-bold text-yellow-300"
                >
                  <option value={1}>1× Estándar (100%)</option>
                  <option value={2}>2× ¡Puntos Dobles! ⚡</option>
                  <option value={3}>3× ¡Puntos Triples! 🔥</option>
                </select>
              </div>
            </div>

            {/* Imagen Opcional de la Pregunta */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span>Imagen de la Pregunta (Opcional - Se proyecta y se ve en el móvil)</span>
                </label>
                {activeQuestion.imageUrl && (
                  <button
                    type="button"
                    onClick={() => updateActiveQuestion({ imageUrl: undefined })}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold"
                  >
                    Eliminar imagen
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Pega la URL de una imagen o sube un archivo..."
                  value={activeQuestion.imageUrl || ''}
                  onChange={(e) => updateActiveQuestion({ imageUrl: e.target.value })}
                  className="input text-xs py-1.5 flex-1"
                />
                <label className="btn-secondary py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer shrink-0">
                  <span>Subir Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        updateActiveQuestion({ imageUrl: event.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>

              {activeQuestion.imageUrl && (
                <div className="relative rounded-lg overflow-hidden border border-white/15 max-h-48 bg-slate-950 flex items-center justify-center p-1">
                  <img
                    src={activeQuestion.imageUrl}
                    alt="Vista previa de la pregunta"
                    className="max-h-44 object-contain rounded"
                  />
                </div>
              )}
            </div>

            {/* Enunciado */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-1.5">
                Enunciado de la Pregunta {activeQuestionIndex + 1} *
              </label>
              <textarea
                value={activeQuestion.content}
                onChange={(e) => updateActiveQuestion({ content: e.target.value })}
                rows={3}
                placeholder="Escribe aquí la pregunta que verán los estudiantes..."
                className="input text-base font-medium resize-none"
              />
            </div>

            {/* Opciones de Respuesta */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-white/70 mb-2">
                Opciones de Respuesta (Marca la casilla de la respuesta correcta)
              </label>

              <div className="space-y-2.5">
                {activeQuestion.options.map((opt, optIdx) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                      opt.isCorrect
                        ? 'border-green-500/60 bg-green-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <input
                      type={activeQuestion.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                      name={`correct-opt-${activeQuestion.id}`}
                      checked={opt.isCorrect}
                      onChange={() => {
                        const updatedOptions = activeQuestion.options.map((o, idx) => ({
                          ...o,
                          isCorrect: activeQuestion.type === 'multiple_choice'
                            ? idx === optIdx ? !o.isCorrect : o.isCorrect
                            : idx === optIdx,
                        }));
                        updateActiveQuestion({ options: updatedOptions });
                      }}
                      className="w-5 h-5 accent-green-500 cursor-pointer"
                    />

                    <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center font-bold text-xs text-white/60">
                      {String.fromCharCode(65 + optIdx)}
                    </span>

                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const updatedOptions = activeQuestion.options.map((o, idx) =>
                          idx === optIdx ? { ...o, text: e.target.value } : o
                        );
                        updateActiveQuestion({ options: updatedOptions });
                      }}
                      placeholder={`Texto de la opción ${optIdx + 1}...`}
                      className="input py-2 text-sm flex-1 bg-transparent border-none focus:ring-0"
                    />

                    {opt.isCorrect && (
                      <span className="badge-success text-[10px] flex-shrink-0">
                        Correcta
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Explicación Pedagógica */}
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>Explicación Pedagógica (Se muestra tras responder para reforzar el aprendizaje)</span>
              </label>
              <textarea
                value={activeQuestion.explanation}
                onChange={(e) => updateActiveQuestion({ explanation: e.target.value })}
                rows={2}
                placeholder="Explica por qué esta respuesta es la correcta..."
                className="input text-xs resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Selección desde el Banco de Preguntas */}
      <QuestionBankPickerModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        onImport={handleImportFromBank}
      />

      {/* Modal de Vista Previa Estudiante (Interactivo y en tiempo real) */}
      <GamePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        gameTitle={title}
        questions={questions}
        initialQuestionIndex={activeQuestionIndex}
      />
    </div>
  );
}
