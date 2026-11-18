import { create } from 'zustand';
import { cloudSync, isFirebaseConfigured } from '../lib/firestoreSync';

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

export const useSessionHistoryStore = create<SessionHistoryState>((set, get) => {
  // ── Sincronización inicial desde Firebase ──
  if (typeof window !== 'undefined' && isFirebaseConfigured()) {
    setTimeout(async () => {
      try {
        const cloud = await cloudSync.loadAll<GameSessionReport>('session_history');
        if (cloud && Object.keys(cloud).length > 0) {
          const cloudArr = Object.values(cloud).sort((a, b) => b.timestamp - a.timestamp);
          const local = get().sessions;
          const merged = [...cloudArr];
          local.forEach((s) => { if (!cloud[s.id]) merged.push(s); });
          merged.sort((a, b) => b.timestamp - a.timestamp);
          if (merged.length !== local.length) {
            set({ sessions: merged });
            if (typeof window !== 'undefined') {
              try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
            }
          }
          console.log('[CloudSync] ✅ Historial de sesiones sincronizado');
        } else {
          // Primera vez: subir historial local
          const local = get().sessions;
          if (local.length > 0) {
            const map: Record<string, GameSessionReport> = {};
            local.forEach((s) => { map[s.id] = s; });
            await cloudSync.saveAll('session_history', map);
          }
        }
      } catch (e) {
        console.warn('[CloudSync] ⚠️ Error sync session_history:', e);
      }
    }, 1500);
  }

  return {
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
    cloudSync.saveItem('session_history', report.id, report).catch(() => {});
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
    cloudSync.deleteItem('session_history', id).catch(() => {});
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
    cloudSync.clearCollection('session_history').catch(() => {});
  },

  getSessionById: (id) => {
    return get().sessions.find((s) => s.id === id);
  },
  };
});
