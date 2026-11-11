import { create } from 'zustand';
import type { Game, Question, GameSettings } from '../types';
import { SAMPLE_GAMES, SAMPLE_QUESTIONS_ROAD_SAFETY } from '../data/mockGames';

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

// Generar juegos predeterminados completos y estructurados
function getInitialDefaultGames(): Record<string, Game> {
  const defaults: Record<string, Game> = {};

  const entries: Array<{
    id: string;
    title: string;
    description: string;
    subject: string;
    topic: string;
    gameMode: Game['gameMode'];
    difficulty: Game['difficulty'];
    questions: Question[];
  }> = [
    {
      id: 'g-1',
      title: 'Seguridad Vial y Señales de Tránsito',
      description: 'Aprende a identificar señales reglamentarias, preventivas e informativas con retos en tiempo real.',
      subject: 'Educación Vial',
      topic: 'Señales de Tránsito',
      gameMode: 'battle_live',
      difficulty: 'medium',
      questions: SAMPLE_QUESTIONS_ROAD_SAFETY,
    },
    {
      id: 'g-2',
      title: 'Ecosistemas y Conservación Ambiental',
      description: 'Cadena trófica, ciclos biogeoquímicos y preservación de especies.',
      subject: 'Ciencias Naturales',
      topic: 'Ecología',
      gameMode: 'survival',
      difficulty: 'easy',
      questions: SAMPLE_QUESTIONS_ROAD_SAFETY.map((q, idx) => ({
        ...q,
        id: `q-g2-${idx + 1}`,
      })),
    },
    {
      id: 'g-3',
      title: 'Desafío de Lógica y Fracciones',
      description: 'Resolución de problemas con números racionales y operaciones combinadas.',
      subject: 'Matemáticas',
      topic: 'Fracciones',
      gameMode: 'team_battle',
      difficulty: 'hard',
      questions: SAMPLE_QUESTIONS_ROAD_SAFETY.map((q, idx) => ({
        ...q,
        id: `q-g3-${idx + 1}`,
      })),
    },
    {
      id: 'g-4',
      title: 'Comprensión Lectora e Inferencia',
      description: 'Textos cortos, análisis de falacias y figuras literarias.',
      subject: 'Lenguaje y Literatura',
      topic: 'Comprensión',
      gameMode: 'escape_room',
      difficulty: 'medium',
      questions: SAMPLE_QUESTIONS_ROAD_SAFETY.map((q, idx) => ({
        ...q,
        id: `q-g4-${idx + 1}`,
      })),
    },
  ];

  for (const item of entries) {
    defaults[item.id] = {
      id: item.id,
      teacherId: 'teacher-1',
      title: item.title,
      description: item.description,
      subject: item.subject,
      topic: item.topic,
      gradeLevel: 'secondary',
      difficulty: item.difficulty,
      gameMode: item.gameMode,
      scoringMode: 'time_based',
      isPublic: true,
      status: 'published',
      questionsCount: item.questions.length,
      createdAt: '2026-10-25T00:00:00.000Z',
      updatedAt: '2026-11-01T00:00:00.000Z',
      settings: DEFAULT_GAME_SETTINGS,
      questions: item.questions,
    };
  }

  // Mezclar también cualquier otro juego que estuviera en SAMPLE_GAMES
  for (const [key, g] of Object.entries(SAMPLE_GAMES)) {
    if (!defaults[key] && g.title) {
      defaults[key] = {
        id: g.id || key,
        teacherId: g.teacherId || 'teacher-1',
        title: g.title,
        description: g.description || '',
        subject: g.subject || 'General',
        topic: g.topic || '',
        gradeLevel: g.gradeLevel || 'secondary',
        difficulty: g.difficulty || 'medium',
        gameMode: g.gameMode || 'battle_live',
        scoringMode: g.scoringMode || 'time_based',
        isPublic: g.isPublic ?? true,
        status: g.status || 'published',
        questionsCount: g.questions?.length || 0,
        createdAt: g.createdAt || new Date().toISOString(),
        updatedAt: g.updatedAt || new Date().toISOString(),
        settings: g.settings ? { ...DEFAULT_GAME_SETTINGS, ...g.settings } : DEFAULT_GAME_SETTINGS,
        questions: (g.questions as Question[]) || [],
      };
    }
  }

  return defaults;
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
    if (typeof window === 'undefined') return getInitialDefaultGames();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Error loading games from localStorage', err);
    }
    const defaults = getInitialDefaultGames();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } catch {}
    return defaults;
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
      return updatedGame;
    },

    deleteGame: (id: string) => {
      const current = { ...get().games };
      delete current[id];
      set({ games: current });
      persist(current);
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
      return duplicated;
    },
  };
});
