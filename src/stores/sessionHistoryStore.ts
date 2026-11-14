import { create } from 'zustand';

export interface QuestionStat {
  name: string;
  correctos: number;
  incorrectos: number;
  tasa: string;
}

export interface StudentRanking {
  rank: number;
  name: string;
  score: number;
  aciertos: string;
  tiempoPromedio: string;
}

export interface GameSessionReport {
  id: string;
  gameTitle: string;
  subject: string;
  date: string;
  timestamp: number;
  participants: number;
  winner: string;
  mode: string;
  accuracyRate: string;
  totalQuestions: number;
  accuracyData: QuestionStat[];
  pieData: Array<{ name: string; value: number; color: string }>;
  rankings: StudentRanking[];
  weakestQuestion?: { title: string; accuracy: string };
  avgResponseTime?: string;
}

interface SessionHistoryState {
  sessions: GameSessionReport[];
  addSession: (report: GameSessionReport) => void;
  removeSession: (id: string) => void;
  clearHistory: () => void;
  getSessionById: (id: string) => GameSessionReport | undefined;
}

const STORAGE_KEY = 'axels_play_session_history';

const loadStoredSessions = (): GameSessionReport[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error loading session history:', e);
  }
  return [];
};

export const useSessionHistoryStore = create<SessionHistoryState>((set, get) => ({
  sessions: loadStoredSessions(),

  addSession: (report) => {
    const updated = [report, ...get().sessions.filter((s) => s.id !== report.id)];
    set({ sessions: updated });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving session history:', e);
      }
    }
  },

  removeSession: (id) => {
    const updated = get().sessions.filter((s) => s.id !== id);
    set({ sessions: updated });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving session history:', e);
      }
    }
  },

  clearHistory: () => {
    set({ sessions: [] });
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('Error clearing session history:', e);
      }
    }
  },

  getSessionById: (id) => {
    return get().sessions.find((s) => s.id === id);
  },
}));
