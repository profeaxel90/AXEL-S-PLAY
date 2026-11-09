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
  submissions: HomeworkSubmission[];
}
