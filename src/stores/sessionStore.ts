// ============================================================
// AXEL'S PLAY - Store de Sesión de Juego (Zustand)
// Motor de estado del juego en tiempo real
// ============================================================
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { audioEngine } from '../lib/audio';
import type {
  Session,
  Participant,
  Question,
  Answer,
  ParticipantRank,
  Team,
  GameEngineState,
  PowerUpType,
  PowerUp,
  SessionStatus,
} from '../types';
import { POWER_UPS } from '../types';

interface SessionState extends GameEngineState {
  isLoading: boolean;
  error: string | null;

  // Acciones del docente
  createSession: (gameId: string) => Promise<Session>;
  startSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  nextQuestion: () => Promise<void>;
  endSession: () => Promise<void>;
  grantPower: (participantId: string, power: PowerUpType) => Promise<void>;
  grantPowerToAll: (power: PowerUpType) => Promise<void>;
  kickParticipant: (participantId: string) => Promise<void>;

  // Acciones del estudiante
  joinSession: (token: string, nickname: string, avatar: string) => Promise<{ session: Session; participant: Participant }>;
  submitAnswer: (questionId: string, answer: unknown, timeTaken: number) => Promise<void>;
  usePower: (power: PowerUpType) => Promise<void>;

  // Subscripciones realtime
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromSession: () => void;

  // Estado local
  setCurrentParticipant: (participant: Participant) => void;
  currentParticipant: Participant | null;
  realtimeChannel: ReturnType<typeof supabase.channel> | null;

  clearError: () => void;
  resetSession: () => void;
}

const initialState: Partial<SessionState> = {
  session: null as unknown as Session,
  currentQuestion: null,
  questionIndex: 0,
  timeRemaining: 0,
  participants: [],
  answers: [],
  rankings: [],
  teams: undefined,
  phase: 'waiting',
  isPaused: false,
  isLoading: false,
  error: null,
  currentParticipant: null,
  realtimeChannel: null,
};

export const useSessionStore = create<SessionState>()((set, get) => ({
  ...(initialState as SessionState),

  createSession: async (gameId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .rpc('create_session', { p_game_id: gameId });

      if (error) throw error;

      const session = data as Session;
      set({ session, isLoading: false });
      audioEngine.setContext('lobby');
      return session;
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  startSession: async () => {
    const { session } = get();
    if (!session) return;

    const { error } = await supabase
      .from('sessions')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', session.id);

    if (error) throw error;
    audioEngine.setContext('game_start');

    // Broadcast a todos los participantes
    await supabase.channel(`session:${session.id}`).send({
      type: 'broadcast',
      event: 'session_started',
      payload: { sessionId: session.id },
    });
  },

  pauseSession: async () => {
    const { session } = get();
    if (!session) return;

    await supabase
      .from('sessions')
      .update({ status: 'paused' })
      .eq('id', session.id);

    set({ isPaused: true });
  },

  resumeSession: async () => {
    const { session } = get();
    if (!session) return;

    await supabase
      .from('sessions')
      .update({ status: 'in_progress' })
      .eq('id', session.id);

    set({ isPaused: false });
  },

  nextQuestion: async () => {
    const { session, questionIndex } = get();
    if (!session?.game?.questions) return;

    const nextIndex = questionIndex + 1;
    const questions = session.game.questions;

    if (nextIndex >= questions.length) {
      await get().endSession();
      return;
    }

    const nextQuestion = questions[nextIndex];
    set({
      questionIndex: nextIndex,
      currentQuestion: nextQuestion,
      phase: 'question',
      timeRemaining: nextQuestion.timeLimit,
      answers: [],
    });

    audioEngine.setContext('question');

    // Broadcast siguiente pregunta
    await supabase.channel(`session:${session.id}`).send({
      type: 'broadcast',
      event: 'question_started',
      payload: {
        questionIndex: nextIndex,
        question: nextQuestion,
        timeLimit: nextQuestion.timeLimit,
      },
    });
  },

  endSession: async () => {
    const { session } = get();
    if (!session) return;

    await supabase
      .from('sessions')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', session.id);

    set({ phase: 'finished' });
    audioEngine.setContext('podium');
  },

  grantPower: async (participantId, powerType) => {
    const { session } = get();
    if (!session) return;

    const power = POWER_UPS[powerType];

    // Guardar en DB
    await supabase.from('session_events').insert({
      session_id: session.id,
      event_type: 'power_granted',
      payload: { participantId, powerType, power },
    });

    // Notificar via realtime
    await supabase.channel(`session:${session.id}`).send({
      type: 'broadcast',
      event: 'power_granted',
      payload: { participantId, powerType, power },
    });

    audioEngine.setContext('power_up');

    // Actualizar estado local del participante
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, activePower: power } : p
      ),
    }));
  },

  grantPowerToAll: async (powerType) => {
    const { session, currentParticipant } = get();
    const power = POWER_UPS[powerType];

    if (session) {
      try {
        await supabase.from('session_events').insert({
          session_id: session.id,
          event_type: 'power_granted_to_all',
          payload: { powerType, power },
        });

        await supabase.channel(`session:${session.id}`).send({
          type: 'broadcast',
          event: 'power_granted_to_all',
          payload: { powerType, power },
        });
      } catch {
        // Modo local
      }
    }

    audioEngine.setContext('power_up');

    set((state) => ({
      participants: state.participants.map((p) => ({ ...p, activePower: power })),
      currentParticipant: currentParticipant
        ? { ...currentParticipant, activePower: power }
        : null,
    }));
  },

  kickParticipant: async (participantId) => {
    const { session } = get();
    if (!session) return;

    await supabase
      .from('participants')
      .update({ is_connected: false })
      .eq('id', participantId);

    await supabase.channel(`session:${session.id}`).send({
      type: 'broadcast',
      event: 'participant_kicked',
      payload: { participantId },
    });

    set((state) => ({
      participants: state.participants.filter((p) => p.id !== participantId),
    }));
  },

  joinSession: async (token, nickname, avatar) => {
    set({ isLoading: true, error: null });
    try {
      // Validar token y obtener sesión
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*, game:games(*, questions(*))')
        .eq('qr_token', token)
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Sesión no encontrada o QR inválido');
      }

      const session = sessionData as Session;

      // Verificar que la sesión esté activa
      if (!['created', 'waiting', 'ready'].includes(session.status)) {
        throw new Error('Esta sesión ya no está disponible');
      }

      // Verificar expiración del token
      if (new Date(session.qrExpiresAt) < new Date()) {
        throw new Error('El código QR ha expirado');
      }

      // Verificar apodo duplicado
      const { data: existing } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('nickname', nickname)
        .single();

      if (existing) {
        throw new Error('Este apodo ya está en uso en esta sesión');
      }

      // Registrar participante
      const { data: participant, error: partError } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          nickname,
          avatar,
          score: 0,
          is_connected: true,
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (partError) throw partError;

      set({
        session,
        currentParticipant: participant as Participant,
        isLoading: false,
      });

      audioEngine.setContext('lobby');
      audioEngine.playEffect('sfx_join');

      return { session, participant: participant as Participant };
    } catch (err) {
      set({ error: String(err), isLoading: false });
      throw err;
    }
  },

  submitAnswer: async (questionId, answer, timeTaken) => {
    const { session, currentParticipant, currentQuestion } = get();
    if (!session || !currentParticipant || !currentQuestion) return;

    // Validación: evitar respuestas duplicadas
    const { data: existing } = await supabase
      .from('answers')
      .select('id')
      .eq('session_id', session.id)
      .eq('participant_id', currentParticipant.id)
      .eq('question_id', questionId)
      .single();

    if (existing) {
      console.warn('[Session] Respuesta duplicada ignorada');
      return;
    }

    // La validación de corrección se hace en el servidor (RPC)
    const { data, error } = await supabase.rpc('submit_answer', {
      p_session_id: session.id,
      p_participant_id: currentParticipant.id,
      p_question_id: questionId,
      p_answer: JSON.stringify(answer),
      p_time_taken: timeTaken,
    });

    if (error) {
      console.error('[Session] Error al enviar respuesta:', error);
      return;
    }

    const result = data as { isCorrect: boolean; pointsEarned: number };

    // Feedback de audio
    if (result.isCorrect) {
      audioEngine.setContext('correct');
    } else {
      audioEngine.setContext('incorrect');
    }
  },

  usePower: async (power) => {
    const { currentParticipant, session } = get();
    if (!currentParticipant || !session) return;

    await supabase.channel(`session:${session.id}`).send({
      type: 'broadcast',
      event: 'power_used',
      payload: { participantId: currentParticipant.id, power },
    });

    set((state) => ({
      currentParticipant: state.currentParticipant
        ? { ...state.currentParticipant, activePower: undefined }
        : null,
    }));
  },

  subscribeToSession: (sessionId) => {
    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('broadcast', { event: 'session_started' }, () => {
        set({ phase: 'question' });
        audioEngine.setContext('game_start');
      })
      .on('broadcast', { event: 'question_started' }, ({ payload }) => {
        set({
          currentQuestion: payload.question as Question,
          questionIndex: payload.questionIndex as number,
          timeRemaining: payload.timeLimit as number,
          phase: 'question',
          answers: [],
        });
        audioEngine.setContext('question');
      })
      .on('broadcast', { event: 'question_ended' }, ({ payload }) => {
        set({
          rankings: payload.rankings as ParticipantRank[],
          phase: 'results',
        });
      })
      .on('broadcast', { event: 'power_granted' }, ({ payload }) => {
        const { currentParticipant } = get();
        if (currentParticipant && currentParticipant.id === payload.participantId) {
          set({
            currentParticipant: { ...currentParticipant, activePower: payload.power as PowerUp },
          });
          audioEngine.setContext('power_up');
        }
      })
      .on('broadcast', { event: 'power_granted_to_all' }, ({ payload }) => {
        const { currentParticipant } = get();
        if (currentParticipant) {
          set({
            currentParticipant: { ...currentParticipant, activePower: payload.power as PowerUp },
          });
        }
        set((state) => ({
          participants: state.participants.map((p) => ({ ...p, activePower: payload.power as PowerUp })),
        }));
        audioEngine.setContext('power_up');
      })
      .on('broadcast', { event: 'session_ended' }, () => {
        set({ phase: 'finished' });
        audioEngine.setContext('podium');
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'participants',
        filter: `session_id=eq.${sessionId}`,
      }, ({ new: participant }) => {
        set((state) => ({
          participants: [...state.participants, participant as Participant],
        }));
        audioEngine.playEffect('sfx_join');
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'participants',
        filter: `session_id=eq.${sessionId}`,
      }, ({ new: participant }) => {
        set((state) => ({
          participants: state.participants.map((p) =>
            p.id === (participant as Participant).id ? participant as Participant : p
          ),
        }));
      })
      .subscribe();

    set({ realtimeChannel: channel });
  },

  unsubscribeFromSession: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },

  setCurrentParticipant: (participant) => set({ currentParticipant: participant }),

  clearError: () => set({ error: null }),

  resetSession: () => {
    get().unsubscribeFromSession();
    set(initialState as SessionState);
  },
}));
