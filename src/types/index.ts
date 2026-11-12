// ============================================================
// AXEL'S PLAY - Tipos Centrales del Sistema
// ============================================================

// --- ROLES ---
export type UserRole = 'teacher' | 'student' | 'admin';

// --- DIFICULTAD ---
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

// --- NIVELES EDUCATIVOS ---
export type GradeLevel =
  | 'primary'       // Primaria
  | 'secondary'     // Secundaria
  | 'highschool'    // Media
  | 'university'    // Superior
  | 'technical'     // Técnica/Tecnológica
  | 'corporate'     // Capacitación empresarial
  | 'driving'       // Escuelas de conducción
  | 'autonomous';   // Aprendizaje autónomo

// --- TIPOS DE PREGUNTAS ---
export type QuestionType =
  | 'single_choice'      // Selección única
  | 'multiple_choice'    // Selección múltiple
  | 'true_false'         // Verdadero o Falso
  | 'short_answer'       // Respuesta corta
  | 'ordering'           // Ordenar elementos
  | 'matching'           // Relacionar columnas
  | 'find_error'         // Identificar errores
  | 'image_based'        // Preguntas con imágenes
  | 'situation'          // Interpretación de situaciones
  | 'map_based';         // Mapas/elementos visuales

// --- MODOS DE JUEGO ---
export type GameMode =
  | 'battle_live'        // Batalla en vivo (multijugador)
  | 'individual'         // Juego individual
  | 'team_battle'        // Batalla por equipos
  | 'survival'           // Supervivencia
  | 'escape_room'        // Escape Room educativo
  | 'wheel'              // Ruleta del conocimiento
  | 'find_error'         // Detecta el error
  | 'ordering'           // Ordena y gana
  | 'true_false_fast';   // Verdadero o Falso rápido

// --- ESTADO DE SESIÓN ---
export type SessionStatus =
  | 'created'
  | 'waiting'
  | 'ready'
  | 'in_progress'
  | 'paused'
  | 'finished'
  | 'cancelled';

// --- ESTADO DE JUEGO ---
export type GameStatus = 'draft' | 'published' | 'archived';

// --- MODO DE PUNTUACIÓN ---
export type ScoringMode = 'time_based' | 'fixed' | 'accuracy';

// ============================================================
// USUARIO / PERFIL DOCENTE
// ============================================================
export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  school?: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

// ============================================================
// OPCIONES DE PREGUNTA
// ============================================================
export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  imageUrl?: string;
}

// Para ordenamiento
export interface OrderItem {
  id: string;
  text: string;
  correctPosition: number;
}

// Para relacionar columnas
export interface MatchPair {
  id: string;
  left: string;
  right: string;
}

// Respuesta según tipo
export type QuestionAnswer =
  | string        // single_choice, true_false, short_answer
  | string[]      // multiple_choice
  | OrderItem[]   // ordering
  | MatchPair[];  // matching

// ============================================================
// PREGUNTA
// ============================================================
export interface Question {
  id: string;
  gameId?: string;
  teacherId: string;
  type: QuestionType;
  content: string;          // Enunciado
  options?: QuestionOption[];
  correctAnswer: QuestionAnswer;
  explanation?: string;
  timeLimit: number;        // segundos
  points: number;
  pointsMultiplier?: 1 | 2 | 3;
  difficulty: Difficulty;
  orderIndex: number;
  imageUrl?: string;
  audioUrl?: string;
  tags?: string[];
  createdAt: string;
}

// ============================================================
// JUEGO
// ============================================================
export interface Game {
  id: string;
  teacherId: string;
  title: string;
  description?: string;
  subject: string;
  topic?: string;
  gradeLevel: GradeLevel;
  difficulty: Difficulty;
  coverImage?: string;
  gameMode: GameMode;
  scoringMode: ScoringMode;
  settings: GameSettings;
  isPublic: boolean;
  status: GameStatus;
  questionsCount: number;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
}

export interface GameSettings {
  timePerQuestion: number;
  showLeaderboardAfterEach: boolean;
  allowReplay: boolean;
  showCorrectAnswer: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  maxParticipants?: number;
  lives?: number;
  teamSize?: number;
  rooms?: EscapeRoom[];
  enablePowerUps: boolean;
  enableMusic: boolean;
  enableEffects: boolean;
  enableTeacherPowers: boolean;
}

export interface EscapeRoom {
  id: string;
  name: string;
  description: string;
  questions: string[];
  unlockCondition: 'all_correct' | 'majority' | 'any';
  hint?: string;
  timeLimit?: number;
}

// ============================================================
// SESIÓN / PARTIDA
// ============================================================
export interface Session {
  id: string;
  gameId: string;
  teacherId: string;
  status: SessionStatus;
  qrToken: string;
  qrExpiresAt: string;
  qrUrl: string;
  settings: GameSettings;
  currentQuestion?: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  game?: Game;
  participants?: Participant[];
}

// ============================================================
// PARTICIPANTE
// ============================================================
export interface Participant {
  id: string;
  sessionId: string;
  nickname: string;
  avatar: string;
  score: number;
  rank?: number;
  lives?: number;
  hearts?: number; // Para modo Supervivencia (3 corazones)
  teamId?: string;
  teamName?: string; // Para modo Por Equipos
  isEliminated?: boolean;
  isConnected: boolean;
  joinedAt: string;
  correctAnswers?: number;
  wrongAnswers?: number;
  avgTimePerAnswer?: number;
  activePower?: PowerUp;
  stealCount?: number;
  streak?: number;           // Racha actual de respuestas correctas (🔥 Streak Multiplier)
  hasShield?: boolean;        // Si tiene el Escudo Protector activo en la ronda actual
  shieldAvailable?: boolean;  // Si aún tiene disponible su escudo anti-robo (1 por partida)
}

// ============================================================
// PODERES DEL DOCENTE (POWER-UPS)
// ============================================================
export type PowerUpType =
  | 'double_points'     // Doble puntos en siguiente respuesta
  | 'extra_time'        // +10 segundos de tiempo
  | 'skip_question'     // Saltar pregunta sin penalización
  | 'shield'            // Proteger de respuesta incorrecta
  | 'spotlight'         // Destacar participante en pantalla
  | 'freeze'            // Congelar tiempo para participante
  | 'hint'              // Mostrar pista
  | 'eliminate_two'     // Eliminar 2 opciones incorrectas
  | 'bonus_points'      // +500 puntos bonus
  | 'comeback';         // Reducir penalización al que va último

export interface PowerUp {
  type: PowerUpType;
  label: string;
  description: string;
  icon: string;
  color: string;
  expiresAfterQuestion: boolean;
}

export const POWER_UPS: Record<PowerUpType, PowerUp> = {
  double_points: {
    type: 'double_points',
    label: 'Doble Puntos',
    description: 'Duplica los puntos de la siguiente respuesta correcta',
    icon: '⚡',
    color: '#F59E0B',
    expiresAfterQuestion: true,
  },
  extra_time: {
    type: 'extra_time',
    label: '+10 Segundos',
    description: 'Agrega 10 segundos extra al temporizador',
    icon: '⏰',
    color: '#3B82F6',
    expiresAfterQuestion: true,
  },
  skip_question: {
    type: 'skip_question',
    label: 'Saltar Pregunta',
    description: 'Permite saltar una pregunta sin penalización',
    icon: '⏭️',
    color: '#8B5CF6',
    expiresAfterQuestion: true,
  },
  shield: {
    type: 'shield',
    label: 'Escudo',
    description: 'Protege de la próxima respuesta incorrecta',
    icon: '🛡️',
    color: '#10B981',
    expiresAfterQuestion: true,
  },
  spotlight: {
    type: 'spotlight',
    label: 'Protagonista',
    description: '¡Tu nombre aparece destacado en la pantalla principal!',
    icon: '⭐',
    color: '#F59E0B',
    expiresAfterQuestion: false,
  },
  freeze: {
    type: 'freeze',
    label: 'Congelar',
    description: 'El temporizador se detiene por 5 segundos para ti',
    icon: '❄️',
    color: '#06B6D4',
    expiresAfterQuestion: true,
  },
  hint: {
    type: 'hint',
    label: 'Pista',
    description: 'Revela una pista de la respuesta correcta',
    icon: '💡',
    color: '#EAB308',
    expiresAfterQuestion: true,
  },
  eliminate_two: {
    type: 'eliminate_two',
    label: '50:50',
    description: 'Elimina 2 opciones incorrectas de la pregunta',
    icon: '✂️',
    color: '#EF4444',
    expiresAfterQuestion: true,
  },
  bonus_points: {
    type: 'bonus_points',
    label: '+500 Puntos',
    description: 'Recibe 500 puntos bonus inmediatamente',
    icon: '💰',
    color: '#F59E0B',
    expiresAfterQuestion: false,
  },
  comeback: {
    type: 'comeback',
    label: 'Remontada',
    description: 'Reduce la desventaja de quien va último (x1.5 puntos)',
    icon: '🚀',
    color: '#EC4899',
    expiresAfterQuestion: false,
  },
};

// ============================================================
// RESPUESTA DEL PARTICIPANTE
// ============================================================
export interface Answer {
  id: string;
  sessionId: string;
  participantId: string;
  questionId: string;
  answer: QuestionAnswer;
  isCorrect: boolean;
  pointsEarned: number;
  timeTaken: number;
  answeredAt: string;
  powerUpUsed?: PowerUpType;
}

// ============================================================
// EQUIPO
// ============================================================
export interface Team {
  id: string;
  sessionId: string;
  name: string;
  color: string;
  score: number;
  members: Participant[];
}

// ============================================================
// LOGROS
// ============================================================
export type AchievementType =
  | 'first_win'
  | 'correct_streak_5'
  | 'correct_streak_10'
  | 'speed_demon'
  | 'subject_expert'
  | 'survivor'
  | 'knowledge_master'
  | 'team_champion'
  | 'explorer'
  | 'perfect_score'
  | 'comeback_kid';

export interface Achievement {
  id: string;
  participantId: string;
  sessionId: string;
  type: AchievementType;
  earnedAt: string;
}

// ============================================================
// ESTADO DEL MOTOR DE JUEGO
// ============================================================
export interface GameEngineState {
  session: Session;
  currentQuestion: Question | null;
  questionIndex: number;
  timeRemaining: number;
  participants: Participant[];
  answers: Answer[];
  rankings: ParticipantRank[];
  teams?: Team[];
  phase: 'waiting' | 'question' | 'results' | 'leaderboard' | 'finished';
  isPaused: boolean;
}

export interface ParticipantRank {
  participantId: string;
  nickname: string;
  avatar: string;
  score: number;
  rank: number;
  change: number;
  correctAnswers: number;
  teamId?: string;
}

// ============================================================
// CATEGORÍAS / MATERIAS
// ============================================================
export const SUBJECTS = [
  'Matemáticas',
  'Ciencias Naturales',
  'Ciencias Sociales',
  'Historia',
  'Geografía',
  'Lenguaje y Literatura',
  'Lectura Crítica',
  'Tecnología e Informática',
  'Inglés',
  'Idiomas',
  'Cultura General',
  'Educación Vial',
  'Seguridad Vial',
  'Formación Ciudadana',
  'Competencias Laborales',
  'Capacitación Empresarial',
  'Arte y Música',
  'Educación Física',
  'Filosofía',
  'Química',
  'Física',
  'Biología',
] as const;

export type Subject = typeof SUBJECTS[number];

// ============================================================
// AUDIO
// ============================================================
export type AudioSceneContext =
  | 'lobby'
  | 'game_start'
  | 'question'
  | 'countdown'
  | 'correct'
  | 'incorrect'
  | 'round_change'
  | 'level_up'
  | 'podium'
  | 'escape_room'
  | 'power_up';

export interface AudioSettings {
  musicEnabled: boolean;
  effectsEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
  defaultTrackUrl?: string;
  defaultTrackName?: string;
  applyToAllGames?: boolean;
}
