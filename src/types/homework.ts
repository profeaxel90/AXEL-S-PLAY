// ============================================================
// AXEL'S PLAY - Tipos para Asignación de Deberes (Homework Mode)
// Actividades asíncronas sin límite de tiempo para responder en casa
// Captura de datos escolares y 3 comodines de corrección
// ============================================================

export interface HomeworkAnswerSubmission {
  questionIndex: number;
  questionPrompt: string;
  selectedOptionText: string;
  correctOptionText: string;
  isCorrect: boolean;
  wasCorrected: boolean;
}

export interface HomeworkSubmission {
  id: string;
  assignmentId: string;
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
  title: string;
  description?: string;
  gradeGroupTarget?: string;
  gameId: string;
  teacherId?: string;
  dueDate?: string;
  maxCorrections: number; // Por defecto 3
  status: 'active' | 'closed';
  createdAt: string;
  // Modalidades avanzadas de asignación
  assignmentType?: 'quiz' | 'pdf_guide' | 'exam_review';
  pdfUrl?: string; // Guía o taller en PDF adjunto por el docente
  pdfName?: string; // Nombre del archivo PDF
  allowPhotoUpload?: boolean; // Permite a los estudiantes subir fotos de su trabajo
  allowRetries?: boolean; // Permite reintentar para mejorar nota (Modo Repaso)
  submissions: HomeworkSubmission[];
}
