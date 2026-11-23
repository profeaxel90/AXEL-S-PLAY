import { create } from 'zustand';
import type { HomeworkAssignment, HomeworkSubmission, CourseGroup } from '../types/homework';
import { SAMPLE_GAMES } from '../data/mockGames';
import { cloudSync, isFirebaseConfigured } from '../lib/firestoreSync';

const STORAGE_KEY = 'axels_play_homework_assignments';
const GROUPS_STORAGE_KEY = 'axels_play_course_groups';

// Generar PIN de 6 dígitos único
function generateHomeworkPin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Grupos iniciales (vacíos para que el docente solo vea los creados por él)
const INITIAL_GROUPS: CourseGroup[] = [];

// Asignaciones iniciales (vacías para que el docente solo vea las creadas por él)
const INITIAL_ASSIGNMENTS: HomeworkAssignment[] = [];

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
    teacherName?: string;
    dueDate?: string;
    dueTime?: string;
    maxCorrections?: number;
    assignmentType?: 'quiz' | 'pdf_guide' | 'exam_review';
    documentText?: string;
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
  addTeacherFeedback: (assignmentId: string, submissionId: string, feedback: string) => void;
  deleteSubmission: (assignmentId: string, submissionId: string) => void;
  clearAllSubmissions: (assignmentId: string) => void;

  // Mantenimiento y Liberación de Memoria
  cleanStoragePhotos: () => number;
  clearClosedAssignments: () => number;
  clearAllHomeworkData: () => void;
}

export const useHomeworkStore = create<HomeworkState>((set, get) => {
  // Cargar Grupos desde localStorage
  const loadInitialGroups = (): CourseGroup[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CourseGroup[];
        if (Array.isArray(parsed)) {
          // Filtrar grupo demo si existía
          return parsed.filter((g) => g.id !== 'grp-demo-1');
        }
      }
    } catch {}
    return [];
  };

  // Cargar Asignaciones desde localStorage
  const loadInitialAssignments = (): HomeworkAssignment[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as HomeworkAssignment[];
        if (Array.isArray(parsed)) {
          // Filtrar tarea demo si existía
          return parsed.filter((a) => a.id !== 'hw-demo-1');
        }
      }
    } catch {}
    return [];
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

  // ── SINCRONIZACIÓN CON FIREBASE (background) ──
  // La nube es la FUENTE DE VERDAD: si algo se eliminó en la nube, NO se re-sube desde local.
  if (typeof window !== 'undefined' && isFirebaseConfigured()) {
    setTimeout(async () => {
      try {
        // --- Grupos ---
        const cloudGroups = await cloudSync.loadAll<CourseGroup>('groups');
        const localGroups = get().groups;
        if (!cloudGroups || Object.keys(cloudGroups).length === 0) {
          // Primera vez: subir todo a la nube si hay locales
          if (localGroups.length > 0) {
            const map: Record<string, CourseGroup> = {};
            localGroups.forEach((g) => { map[g.id] = g; });
            await cloudSync.saveAll('groups', map);
          }
        } else {
          // La nube tiene datos → usarla como fuente de verdad (filtrando demos)
          const cloudArr = Object.values(cloudGroups).filter((g) => g.id !== 'grp-demo-1');
          persistGroups(cloudArr);
          set({ groups: cloudArr });
        }

        // --- Tareas (Assignments) ---
        const cloudAssign = await cloudSync.loadAll<HomeworkAssignment>('assignments');
        const localAssign = get().assignments;
        if (!cloudAssign || Object.keys(cloudAssign).length === 0) {
          // Primera vez: subir todo a la nube si hay locales
          if (localAssign.length > 0) {
            const map: Record<string, HomeworkAssignment> = {};
            localAssign.forEach((a) => { map[a.id] = a; });
            await cloudSync.saveAll('assignments', map);
          }
        } else {
          // La nube tiene datos → usarla como fuente de verdad (filtrando demos)
          const cloudArr = Object.values(cloudAssign).filter((a) => a.id !== 'hw-demo-1');
          persistAssignments(cloudArr);
          set({ assignments: cloudArr });
        }
        console.log('[CloudSync] ✅ Tareas y grupos sincronizados (nube = fuente de verdad)');
      } catch (e) {
        console.warn('[CloudSync] ⚠️ Error sincronizando homework:', e);
      }
    }, 1200);
  }

  // Auto-reparar asignaciones existentes en background (si tienen pdfUrl pero no documentText)
  if (typeof window !== 'undefined') {
    setTimeout(async () => {
      try {
        const assignments = get().assignments;
        let needsUpdate = false;
        const updated = await Promise.all(
          assignments.map(async (a) => {
            if (a.pdfUrl && !a.documentText && a.pdfUrl.startsWith('data:')) {
              try {
                const base64 = a.pdfUrl.split(',')[1];
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const { extractTextFromPdf } = await import('../lib/documentQuestionExtractor');
                const extracted = await extractTextFromPdf(bytes.buffer);
                if (extracted && extracted.trim().length > 10) {
                  needsUpdate = true;
                  return { ...a, documentText: extracted.trim() };
                }
              } catch (e) {
                console.warn('[AutoHeal] Error reparando texto PDF:', e);
              }
            }
            return a;
          })
        );
        if (needsUpdate) {
          set({ assignments: updated });
          persistAssignments(updated);
          console.log('[AutoHeal] ✓ Texto de asignaciones existentes reparado y sincronizado');
        }
      } catch {}
    }, 500);
  }

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
      cloudSync.saveItem('groups', newGroup.id, newGroup).catch(() => {});
      return newGroup;
    },

    updateGroup: (id, data) => {
      const updated = get().groups.map((g) => (g.id === id ? { ...g, ...data } : g));
      set({ groups: updated });
      persistGroups(updated);
      const updatedGroup = updated.find((g) => g.id === id);
      if (updatedGroup) cloudSync.saveItem('groups', id, updatedGroup).catch(() => {});
    },

    deleteGroup: (id, deleteAssociatedActivities = true) => {
      const updatedGroups = get().groups.filter((g) => g.id !== id);
      set({ groups: updatedGroups });
      persistGroups(updatedGroups);
      cloudSync.deleteItem('groups', id).catch(() => {});

      if (deleteAssociatedActivities) {
        // Eliminar todas las actividades vinculadas a este grupo
        const toDelete = get().assignments.filter((a) => a.groupId === id);
        const updatedAssignments = get().assignments.filter((a) => a.groupId !== id);
        set({ assignments: updatedAssignments });
        persistAssignments(updatedAssignments);
        toDelete.forEach((a) => cloudSync.deleteItem('assignments', a.id).catch(() => {}));
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
        teacherName: data.teacherName,
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        maxCorrections: data.maxCorrections ?? 3,
        status: 'active',
        createdAt: new Date().toISOString(),
        assignmentType: data.assignmentType || (data.pdfUrl ? 'pdf_guide' : 'quiz'),
        documentText: data.documentText,
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
      cloudSync.saveItem('assignments', newAssignment.id, newAssignment).catch(() => {});
      return newAssignment;
    },

    getAssignmentByIdOrPin: (idOrPin) => {
      const list = get().assignments;
      return list.find((a) => a.id === idOrPin || a.pin === idOrPin.trim());
    },

    updateAssignment: (id, data) => {
      const updatedA = get().assignments.map((a) => {
        if (a.id === id) {
          return { ...a, ...data };
        }
        return a;
      });
      set({ assignments: updatedA });
      persistAssignments(updatedA);
      const saved = updatedA.find((a) => a.id === id);
      if (saved) cloudSync.saveItem('assignments', id, saved).catch(() => {});
    },

    submitHomework: (assignmentId, subData) => {
      const targetAssignment = get().assignments.find((a) => a.id === assignmentId || a.pin === assignmentId);
      const subId = (subData as any).id || `sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const submittedAt = (subData as any).submittedAt || new Date().toISOString();
      const submission: HomeworkSubmission = {
        ...subData,
        id: subId,
        assignmentId: targetAssignment?.id || assignmentId,
        groupId: targetAssignment?.groupId,
        submittedAt,
      };

      const updated = get().assignments.map((a) => {
        if (a.id === assignmentId || a.pin === assignmentId) {
          const filtered = a.submissions.filter(
            (s) => s.id !== subId && s.studentFullName.toLowerCase() !== submission.studentFullName.toLowerCase()
          );
          return {
            ...a,
            submissions: [submission, ...filtered],
          };
        }
        return a;
      });

      set({ assignments: updated });
      persistAssignments(updated);
      const saved = updated.find((a) => a.id === (targetAssignment?.id || assignmentId));
      if (saved) cloudSync.saveItem('assignments', saved.id, saved).catch(() => {});
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
      const saved = updated.find((a) => a.id === id);
      if (saved) cloudSync.saveItem('assignments', id, saved).catch(() => {});
    },

    deleteAssignment: (id) => {
      const updated = get().assignments.filter((a) => a.id !== id);
      set({ assignments: updated });
      persistAssignments(updated);
      cloudSync.deleteItem('assignments', id).catch(() => {});
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
      cloudSync.saveItem('assignments', assignment.id, assignment).catch(() => {});
    },

    addTeacherFeedback: (assignmentId, submissionId, feedback) => {
      const updated = get().assignments.map((a) => {
        if (a.id === assignmentId || a.pin === assignmentId) {
          const updatedSubs = a.submissions.map((s) => {
            if (s.id === submissionId || s.studentFullName === submissionId) {
              return {
                ...s,
                teacherFeedback: feedback.trim(),
                teacherFeedbackDate: new Date().toISOString(),
              };
            }
            return s;
          });
          return { ...a, submissions: updatedSubs };
        }
        return a;
      });
      set({ assignments: updated });
      persistAssignments(updated);
      const saved = updated.find((a) => a.id === assignmentId || a.pin === assignmentId);
      if (saved) cloudSync.saveItem('assignments', saved.id, saved).catch(() => {});
    },

    deleteSubmission: (assignmentId, submissionId) => {
      const updated = get().assignments.map((a) => {
        if (a.id === assignmentId || a.pin === assignmentId) {
          return {
            ...a,
            submissions: a.submissions.filter((s) => s.id !== submissionId),
          };
        }
        return a;
      });
      set({ assignments: updated });
      persistAssignments(updated);
      const saved = updated.find((a) => a.id === assignmentId || a.pin === assignmentId);
      if (saved) cloudSync.saveItem('assignments', saved.id, saved).catch(() => {});
    },

    clearAllSubmissions: (assignmentId) => {
      const updated = get().assignments.map((a) => {
        if (a.id === assignmentId || a.pin === assignmentId) {
          return { ...a, submissions: [] };
        }
        return a;
      });
      set({ assignments: updated });
      persistAssignments(updated);
      const saved = updated.find((a) => a.id === assignmentId || a.pin === assignmentId);
      if (saved) cloudSync.saveItem('assignments', saved.id, saved).catch(() => {});
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
      cloudSync.clearCollection('assignments').catch(() => {});
      cloudSync.clearCollection('groups').catch(() => {});
    },
  };
});
