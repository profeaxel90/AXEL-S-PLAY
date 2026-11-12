// ============================================================
// AXEL'S PLAY - Tipos para Asignación de Deberes (Homework Mode)
// Actividades asíncronas sin límite de tiempo para responder en casa
// Captura de datos escolares y 3 comodines de corrección
// ============================================================

export interface CourseGroup {
  id: string;
  code: string; // PIN o código del curso de 6 dígitos
  name: string; // ej: "Grado 6°A", "Biología 9°B"
  category: string; // ej: "Secundaria", "Primaria", "Ciencias"
  description?: string;
  teacherId?: string;
  createdAt: string;
}

export interface HomeworkQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface HomeworkQuestion {
  id: string;
  content: string; // Enunciado
  imageUrl?: string;
  videoUrl?: string;
  // Lo que habilita el docente para esta pregunta:
  allowChoice?: boolean; // Opciones de selección múltiple (A, B, C, D)
  allowTextResponse?: boolean; // Espacio para que el estudiante escriba
  allowPhotoUpload?: boolean; // Espacio para que el estudiante suba fotos de cuaderno/procedimiento
  options?: HomeworkQuestionOption[];
  expectedAnswer?: string; // Respuesta esperada o palabra clave (opcional)
  explanation?: string; // Explicación pedagógica
  points?: number;
}

export interface HomeworkAnswerSubmission {
  questionIndex: number;
  questionPrompt: string;
  selectedOptionText: string;
  correctOptionText: string;
  isCorrect: boolean;
  wasCorrected: boolean;
  questionType?: string;
  studentPhoto?: string; // Si la pregunta requería subir foto
  writtenAnswer?: string; // Si la pregunta era de escribir texto
}

export interface HomeworkSubmission {
  id: string;
  assignmentId: string;
  groupId?: string; // Grupo al que pertenece la entrega si aplica
  studentFullName: string;
  gradeGroup: string;
  avatar: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  correctionsUsed: number;
  submittedAt: string;
  answers: HomeworkAnswerSubmission[];
  studentPhotos?: string[]; // Fotos tomadas/subidas por el estudiante (procedimientos o cuaderno)
}

export interface HomeworkAssignment {
  id: string;
  pin: string;
  groupId?: string; // Grupo asociado opcional
  title: string;
  description?: string;
  gradeGroupTarget?: string; // Ahora denominado Categoría en la interfaz
  gameId: string;
  teacherId?: string;
  dueDate?: string;
  dueTime?: string; // Hora límite (ej: 18:00, 23:59)
  maxCorrections: number; // Por defecto 3
  status: 'active' | 'closed';
  createdAt: string;
  // Modalidades avanzadas de asignación
  assignmentType?: 'quiz' | 'pdf_guide' | 'exam_review';
  pdfUrl?: string; // Guía o taller en PDF adjunto por el docente
  pdfName?: string; // Nombre del archivo PDF
  allowPhotoUpload?: boolean; // Permite a los estudiantes subir fotos de su trabajo
  allowRetries?: boolean; // Permite reintentar para mejorar nota (Modo Repaso)
  customQuestions?: HomeworkQuestion[]; // Preguntas creadas directamente por el docente en la asignación
  submissions: HomeworkSubmission[];
}
