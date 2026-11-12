import { create } from 'zustand';
import type { HomeworkAssignment, HomeworkSubmission } from '../types/homework';
import { SAMPLE_GAMES } from '../data/mockGames';

const STORAGE_KEY = 'axels_play_homework_assignments';

// Generar PIN de 6 dígitos único
function generateHomeworkPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Datos iniciales de demostración pedagógica
const INITIAL_ASSIGNMENTS: HomeworkAssignment[] = [
  {
    id: 'hw-demo-1',
    pin: '784210',
    title: 'Taller para Casa: Seguridad Vial y Movilidad Escolar',
    description: 'Responde a tu propio ritmo sin afán. Recuerda que tienes 3 oportunidades de corregir tus respuestas si dudas.',
    gradeGroupTarget: 'Grado 6°A',
    gameId: 'g-1',
    maxCorrections: 3,
    status: 'active',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    submissions: [
      {
        id: 'sub-1',
        assignmentId: 'hw-demo-1',
        studentFullName: 'Valentina Restrepo Castro',
        gradeGroup: 'Grado 6°A',
        avatar: 'Fox',
        score: 1850,
        totalQuestions: 5,
        correctAnswers: 5,
        accuracy: 100,
        correctionsUsed: 1,
        submittedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        answers: [
          {
            questionIndex: 0,
            questionPrompt: '¿Qué significa la luz roja del semáforo?',
            selectedOptionText: 'Detenerse completamente antes de la línea',
            correctOptionText: 'Detenerse completamente antes de la línea',
            isCorrect: true,
            wasCorrected: false,
          },
          {
            questionIndex: 1,
            questionPrompt: '¿Por dónde deben cruzar los peatones la calle?',
            selectedOptionText: 'Por el paso de cebra o cruce peatonal',
            correctOptionText: 'Por el paso de cebra o cruce peatonal',
            isCorrect: true,
            wasCorrected: true, // Usó corrección
          },
        ],
      },
      {
        id: 'sub-2',
        assignmentId: 'hw-demo-1',
        studentFullName: 'Camilo Andrés Gómez',
        gradeGroup: 'Grado 6°A',
        avatar: 'Dragon',
        score: 1420,
        totalQuestions: 5,
        correctAnswers: 4,
        accuracy: 80,
        correctionsUsed: 2,
        submittedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        answers: [],
      },
      {
        id: 'sub-3',
        assignmentId: 'hw-demo-1',
        studentFullName: 'Mariana Sofia Morales',
        gradeGroup: 'Grado 6°A',
        avatar: 'Wizard',
        score: 1780,
        totalQuestions: 5,
        correctAnswers: 5,
        accuracy: 100,
        correctionsUsed: 0,
        submittedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        answers: [],
      },
    ],
  },
];

interface HomeworkState {
  assignments: HomeworkAssignment[];
  createAssignment: (data: {
    title: string;
    description?: string;
    gradeGroupTarget?: string;
    gameId: string;
    dueDate?: string;
    dueTime?: string;
    maxCorrections?: number;
    assignmentType?: 'quiz' | 'pdf_guide' | 'exam_review';
    pdfUrl?: string;
    pdfName?: string;
    allowPhotoUpload?: boolean;
    allowRetries?: boolean;
  }) => HomeworkAssignment;
  getAssignmentByIdOrPin: (idOrPin: string) => HomeworkAssignment | undefined;
  submitHomework: (assignmentId: string, submission: Omit<HomeworkSubmission, 'id' | 'submittedAt'>) => HomeworkSubmission;
  toggleAssignmentStatus: (id: string) => void;
  deleteAssignment: (id: string) => void;
}

export const useHomeworkStore = create<HomeworkState>((set, get) => {
  // Cargar desde localStorage
  const loadInitial = (): HomeworkAssignment[] => {
    if (typeof window === 'undefined') return INITIAL_ASSIGNMENTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return INITIAL_ASSIGNMENTS;
  };

  const persist = (items: HomeworkAssignment[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {}
    }
  };

  return {
    assignments: loadInitial(),

    createAssignment: (data) => {
      const newAssignment: HomeworkAssignment = {
        id: `hw-${Date.now()}`,
        pin: generateHomeworkPin(),
        title: data.title,
        description: data.description || 'Lee con atención y responde la actividad.',
        gradeGroupTarget: data.gradeGroupTarget || 'General',
        gameId: data.gameId || Object.keys(SAMPLE_GAMES)[0] || 'g-1',
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        maxCorrections: data.maxCorrections ?? 3,
        status: 'active',
        createdAt: new Date().toISOString(),
        assignmentType: data.assignmentType || (data.pdfUrl ? 'pdf_guide' : 'quiz'),
        pdfUrl: data.pdfUrl,
        pdfName: data.pdfName,
        allowPhotoUpload: data.allowPhotoUpload ?? true,
        allowRetries: data.allowRetries ?? false,
        submissions: [],
      };

      const updated = [newAssignment, ...get().assignments];
      set({ assignments: updated });
      persist(updated);
      return newAssignment;
    },

    getAssignmentByIdOrPin: (idOrPin) => {
      const list = get().assignments;
      return list.find((a) => a.id === idOrPin || a.pin === idOrPin.trim());
    },

    submitHomework: (assignmentId, subData) => {
      const submission: HomeworkSubmission = {
        ...subData,
        id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        assignmentId,
        submittedAt: new Date().toISOString(),
      };

      const updated = get().assignments.map((a) => {
        if (a.id === assignmentId || a.pin === assignmentId) {
          return {
            ...a,
            submissions: [submission, ...a.submissions],
          };
        }
        return a;
      });

      set({ assignments: updated });
      persist(updated);
      return submission;
    },

    toggleAssignmentStatus: (id) => {
      const updated = get().assignments.map((a) => {
        if (a.id === id) {
          return { ...a, status: a.status === 'active' ? ('closed' as const) : ('active' as const) };
        }
        return a;
      });
      set({ assignments: updated });
      persist(updated);
    },

    deleteAssignment: (id) => {
      const updated = get().assignments.filter((a) => a.id !== id);
      set({ assignments: updated });
      persist(updated);
    },
  };
});
