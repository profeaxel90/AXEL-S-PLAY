import { create } from 'zustand';
import type { Game, Question, GameSettings } from '../types';
import { SAMPLE_GAMES, SAMPLE_QUESTIONS_ROAD_SAFETY } from '../data/mockGames';
import { cloudSync, isFirebaseConfigured } from '../lib/firestoreSync';

const STORAGE_KEY = 'axels_play_custom_games_v2';

const DEFAULT_GAME_SETTINGS: GameSettings = {
  timePerQuestion: 20,
  showLeaderboardAfterEach: true,
  allowReplay: true,
  showCorrectAnswer: true,
  randomizeQuestions: false,
  randomizeOptions: false,
  enablePowerUps: true,
  enableMusic: true,
  enableEffects: true,
  enableTeacherPowers: true,
};

// AXEL'S PLAY: No mostrar juegos predeterminados si el usuario desea únicamente sus propios juegos
function getInitialDefaultGames(): Record<string, Game> {
  return {};
}

interface GameStoreState {
  games: Record<string, Game>;
  getGame: (id: string) => Game | undefined;
  getGamesList: () => Game[];
  saveGame: (data: {
    id?: string;
    title: string;
    description?: string;
    subject?: string;
    topic?: string;
    gradeLevel?: Game['gradeLevel'];
    difficulty?: Game['difficulty'];
    gameMode?: Game['gameMode'];
    timePerQuestion?: number;
    isPublic?: boolean;
    questions: Question[];
  }) => Game;
  deleteGame: (id: string) => void;
  duplicateGame: (id: string) => Game | undefined;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  const loadInitial = (): Record<string, Game> => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // Filtrar cualquier juego predeterminado antiguo (g-1 a g-4 o SAMPLE_GAMES)
          const filtered: Record<string, Game> = {};
          for (const [id, g] of Object.entries(parsed)) {
            if (!/^g-[1-4]$/.test(id) && id !== 'demo' && id !== 'sample') {
              filtered[id] = g as Game;
            }
          }
          return filtered;
        }
      }
    } catch (err) {
      console.warn('Error loading games from localStorage', err);
    }
    return {};
  };

  const persist = (items: Record<string, Game>) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (err) {
        console.warn('Error saving games to localStorage', err);
      }
    }
  };

  // ── SINCRONIZACIÓN AUTOMÁTICA CON FIREBASE (background) ──
  if (typeof window !== 'undefined' && isFirebaseConfigured()) {
    setTimeout(async () => {
      try {
        const cloudGames = await cloudSync.loadAll<Game>('games');
        const localGames = get().games;

        if (!cloudGames || Object.keys(cloudGames).length === 0) {
          // Nube vacía → subir todos los juegos locales (primera migración)
          console.log('[CloudSync] ☁️ Primera sincronización: subiendo juegos a Firebase...');
          await cloudSync.saveAll('games', localGames);
          return;
        }

        // Mezclar: el más reciente (updatedAt) gana por cada ID
        // La nube es la fuente de verdad — si un juego NO está en la nube, fue eliminado en otro dispositivo
        const merged: Record<string, Game> = {};
        let changed = false;

        // 1. Agregar todos los juegos de la nube (filtrando los predeterminados si existieran)
        for (const [id, cg] of Object.entries(cloudGames)) {
          if (!/^g-[1-4]$/.test(id)) {
            merged[id] = cg;
          }
        }

        // 3. Verificar si hubo cambios respecto a lo local
        const localKeys = Object.keys(localGames).sort().join(',');
        const mergedKeys = Object.keys(merged).sort().join(',');
        if (localKeys !== mergedKeys) changed = true;
        if (!changed) {
          for (const [id, cg] of Object.entries(cloudGames)) {
            const lg = localGames[id];
            if (!lg || new Date(cg.updatedAt || '0').getTime() > new Date(lg.updatedAt || '0').getTime()) {
              changed = true;
              break;
            }
          }
        }

        if (changed) {
          set({ games: merged });
          persist(merged);
          console.log('[CloudSync] ✅ Juegos sincronizados desde Firebase');
        }
      } catch (e) {
        console.warn('[CloudSync] ⚠️ Error sincronizando juegos:', e);
      }
    }, 800);
  }

  return {
    games: loadInitial(),

    getGame: (id: string) => {
      return get().games[id];
    },

    getGamesList: () => {
      return Object.values(get().games);
    },

    saveGame: (data) => {
      const currentGames = get().games;
      const gameId = data.id && data.id !== 'new' ? data.id : `g-${Date.now()}`;
      const existing = currentGames[gameId];

      const questions = data.questions.map((q, idx) => ({
        ...q,
        gameId,
        orderIndex: idx,
      }));

      const updatedGame: Game = {
        id: gameId,
        teacherId: existing?.teacherId || 'teacher-1',
        title: data.title.trim(),
        description: data.description?.trim() || '',
        subject: data.subject || 'Educación Vial',
        topic: data.topic || '',
        gradeLevel: data.gradeLevel || 'secondary',
        difficulty: data.difficulty || 'medium',
        gameMode: data.gameMode || 'battle_live',
        scoringMode: existing?.scoringMode || 'time_based',
        isPublic: data.isPublic ?? true,
        status: 'published',
        questionsCount: questions.length,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          ...DEFAULT_GAME_SETTINGS,
          ...(existing?.settings || {}),
          timePerQuestion: data.timePerQuestion || existing?.settings?.timePerQuestion || 20,
        },
        questions,
      };

      const updatedMap = {
        ...currentGames,
        [gameId]: updatedGame,
      };

      set({ games: updatedMap });
      persist(updatedMap);
      cloudSync.saveItem('games', gameId, updatedGame).catch(() => {});
      return updatedGame;
    },

    deleteGame: (id: string) => {
      const current = { ...get().games };
      delete current[id];
      set({ games: current });
      persist(current);
      cloudSync.deleteItem('games', id).catch(() => {});
    },

    duplicateGame: (id: string) => {
      const orig = get().games[id];
      if (!orig) return undefined;

      const newId = `g-${Date.now()}`;
      const duplicatedQuestions = (orig.questions || []).map((q, idx) => ({
        ...q,
        id: `q-${newId}-${idx + 1}`,
        gameId: newId,
        orderIndex: idx,
      }));

      const duplicated: Game = {
        ...orig,
        id: newId,
        title: `${orig.title} (Copia)`,
        questionsCount: duplicatedQuestions.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: duplicatedQuestions,
      };

      const updatedMap = {
        ...get().games,
        [newId]: duplicated,
      };

      set({ games: updatedMap });
      persist(updatedMap);
      cloudSync.saveItem('games', newId, duplicated).catch(() => {});
      return duplicated;
    },
  };
});
