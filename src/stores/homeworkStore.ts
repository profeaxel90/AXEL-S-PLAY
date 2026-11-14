import { create } from 'zustand';
import type { HomeworkAssignment, HomeworkSubmission, CourseGroup } from '../types/homework';
import { SAMPLE_GAMES } from '../data/mockGames';

const STORAGE_KEY = 'axels_play_homework_assignments';
const GROUPS_STORAGE_KEY = 'axels_play_course_groups';

// Generar PIN de 6 dígitos único
function generateHomeworkPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Grupos iniciales de demostración pedagógica
const INITIAL_GROUPS: CourseGroup[] = [
  {
    id: 'grp-demo-1',
    code: '601001',
    name: 'Grado 6°A - Ciencias y Movilidad',
    category: 'Secundaria',
    description: 'Espacio de trabajo del curso 6°A para cargar tareas, talleres y evidencias de cuaderno.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

// Datos iniciales de demostración pedagógica
const INITIAL_ASSIGNMENTS: HomeworkAssignment[] = [
  {
    id: 'hw-demo-1',
    pin: '784210',
    groupId: 'grp-demo-1',
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
        groupId: 'grp-demo-1',
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
        groupId: 'grp-demo-1',
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
        groupId: 'grp-demo-1',
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
  groups: CourseGroup[];
  assignments: HomeworkAssignment[];

  // Gestión de Grupos
  createGroup: (data: { name: string; category?: string; description?: string }) => CourseGroup;
  updateGroup: (id: string, data: Partial<CourseGroup>) => void;
  deleteGroup: (id: string, deleteAssociatedActivities?: boolean) => void;
  getGroupByIdOrCode: (idOrCode: string) => CourseGroup | undefined;

  // Gestión de Actividades
  createAssignment: (data: {
    title: string;
    description?: string;
    gradeGroupTarget?: string;
    groupId?: string;
    gameId?: string;
    dueDate?: string;
    dueTime?: string;
    maxCorrections?: number;
    assignmentType?: 'quiz' | 'pdf_guide' | 'exam_review';
    pdfUrl?: string;
    pdfName?: string;
    docUrl?: string;
    videoUrl?: string;
    externalLink?: string;
    allowPhotoUpload?: boolean;
    allowRetries?: boolean;
    customQuestions?: any[];
  }) => HomeworkAssignment;
  getAssignmentByIdOrPin: (idOrPin: string) => HomeworkAssignment | undefined;
  updateAssignment: (id: string, data: Partial<HomeworkAssignment>) => void;
  submitHomework: (assignmentId: string, submission: Omit<HomeworkSubmission, 'id' | 'submittedAt'>) => HomeworkSubmission;
  toggleAssignmentStatus: (id: string) => void;
  deleteAssignment: (id: string) => void;
  importAssignment: (assignment: HomeworkAssignment) => void;

  // Mantenimiento y Liberación de Memoria
  cleanStoragePhotos: () => number;
  clearClosedAssignments: () => number;
  clearAllHomeworkData: () => void;
}

export const useHomeworkStore = create<HomeworkState>((set, get) => {
  // Cargar Grupos desde localStorage
  const loadInitialGroups = (): CourseGroup[] => {
    if (typeof window === 'undefined') return INITIAL_GROUPS;
    try {
      const stored = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_GROUPS;
  };

  // Cargar Asignaciones desde localStorage
  const loadInitialAssignments = (): HomeworkAssignment[] => {
    if (typeof window === 'undefined') return INITIAL_ASSIGNMENTS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return INITIAL_ASSIGNMENTS;
  };

  const persistAssignments = (items: HomeworkAssignment[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.warn('LocalStorage error saving assignments:', e);
      }
    }
  };

  const persistGroups = (groups: CourseGroup[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
      } catch (e) {
        console.warn('LocalStorage error saving groups:', e);
      }
    }
  };

  return {
    groups: loadInitialGroups(),
    assignments: loadInitialAssignments(),

    // ── GESTIÓN DE GRUPOS ──
    createGroup: (data) => {
      const newGroup: CourseGroup = {
        id: `grp-${Date.now()}`,
        code: generateHomeworkPin(),
        name: data.name.trim(),
        category: data.category?.trim() || 'General',
        description: data.description?.trim() || '',
        createdAt: new Date().toISOString(),
      };
      const updated = [newGroup, ...get().groups];
      set({ groups: updated });
      persistGroups(updated);
      return newGroup;
    },

    updateGroup: (id, data) => {
      const updated = get().groups.map((g) => (g.id === id ? { ...g, ...data } : g));
      set({ groups: updated });
      persistGroups(updated);
    },

    deleteGroup: (id, deleteAssociatedActivities = true) => {
      const updatedGroups = get().groups.filter((g) => g.id !== id);
      set({ groups: updatedGroups });
      persistGroups(updatedGroups);

      if (deleteAssociatedActivities) {
        // Eliminar todas las actividades vinculadas a este grupo
        const updatedAssignments = get().assignments.filter((a) => a.groupId !== id);
        set({ assignments: updatedAssignments });
        persistAssignments(updatedAssignments);
      }
    },

    getGroupByIdOrCode: (idOrCode) => {
      const clean = idOrCode.trim();
      return get().groups.find((g) => g.id === clean || g.code === clean);
    },

    // ── GESTIÓN DE ASIGNACIONES ──
    createAssignment: (data) => {
      const newAssignment: HomeworkAssignment = {
        id: `hw-${Date.now()}`,
        pin: generateHomeworkPin(),
        groupId: data.groupId,
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
        docUrl: data.docUrl,
        videoUrl: data.videoUrl,
        externalLink: data.externalLink,
        allowPhotoUpload: data.allowPhotoUpload ?? true,
        allowRetries: data.allowRetries ?? false,
        customQuestions: data.customQuestions,
        submissions: [],
      };

      const updated = [newAssignment, ...get().assignments];
      set({ assignments: updated });
      persistAssignments(updated);
      return newAssignment;
    },

    getAssignmentByIdOrPin: (idOrPin) => {
      const list = get().assignments;
      return list.find((a) => a.id === idOrPin || a.pin === idOrPin.trim());
    },

    updateAssignment: (id, data) => {
      const updated = get().assignments.map((a) => {
        if (a.id === id) {
          return { ...a, ...data };
        }
        return a;
      });
      set({ assignments: updated });
      persistAssignments(updated);
    },

    submitHomework: (assignmentId, subData) => {
      const targetAssignment = get().assignments.find((a) => a.id === assignmentId || a.pin === assignmentId);
      const submission: HomeworkSubmission = {
        ...subData,
        id: `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        assignmentId,
        groupId: targetAssignment?.groupId,
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
      persistAssignments(updated);
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
      persistAssignments(updated);
    },

    deleteAssignment: (id) => {
      const updated = get().assignments.filter((a) => a.id !== id);
      set({ assignments: updated });
      persistAssignments(updated);
    },

    importAssignment: (assignment) => {
      const existing = get().assignments;
      const index = existing.findIndex((a) => a.id === assignment.id || a.pin === assignment.pin);
      let updated: HomeworkAssignment[];
      if (index >= 0) {
        updated = [...existing];
        updated[index] = { ...existing[index], ...assignment };
      } else {
        updated = [assignment, ...existing];
      }
      set({ assignments: updated });
      persistAssignments(updated);
    },

    // ── MANTENIMIENTO Y LIBERACIÓN DE MEMORIA ──
    cleanStoragePhotos: () => {
      let cleanedCount = 0;
      const updated = get().assignments.map((a) => ({
        ...a,
        submissions: a.submissions.map((s) => {
          if (s.studentPhotos && s.studentPhotos.length > 0) {
            cleanedCount++;
            return {
              ...s,
              studentPhotos: [],
              answers: s.answers.map((ans) => ({ ...ans, studentPhoto: undefined })),
            };
          }
          return s;
        }),
      }));
      set({ assignments: updated });
      persistAssignments(updated);
      return cleanedCount;
    },

    clearClosedAssignments: () => {
      const activeOnly = get().assignments.filter((a) => a.status === 'active');
      const removedCount = get().assignments.length - activeOnly.length;
      set({ assignments: activeOnly });
      persistAssignments(activeOnly);
      return removedCount;
    },

    clearAllHomeworkData: () => {
      set({ assignments: [], groups: [] });
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(GROUPS_STORAGE_KEY);
      }
    },
  };
});
