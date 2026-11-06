// ============================================================
// AXEL PLAY - Sincronizador en Tiempo Real Híbrido
// 1. Primario: Servidor Local de Alta Velocidad (0ms, 100% Wi-Fi local sin depender de nube)
// 2. Respaldo: WebRTC P2P (PeerJS) para conexiones remotas cruzadas
// ============================================================
import { P2PHost, P2PClient, getOrCreateP2PClient } from './p2p';
import type { Participant, Question, PowerUp } from '../types';

export interface GameEventMessage {
  type:
    | 'INIT'
    | 'JOIN'
    | 'ROOM_UPDATE'
    | 'START_INTRO'
    | 'START_GAME'
    | 'QUESTION'
    | 'ANSWER'
    | 'ANSWER_ACK'
    | 'REVEAL_ANSWER'
    | 'POWER'
    | 'STEAL_POINTS_START'
    | 'STEAL_POINTS_CLAIMED'
    | 'STEAL_REQUEST'
    | 'STEAL_RESULT'
    | 'LEADERBOARD'
    | 'SCORE_UPDATE'
    | 'PAUSE'
    | 'RESUME'
    | 'GAME_OVER'
    | 'RESET';
  participant?: Participant;
  participants?: Participant[];
  question?: Question;
  index?: number;
  total?: number;
  timeLimit?: number;
  participantId?: string;
  optionId?: string;
  timeTaken?: number;
  isCorrect?: boolean;
  pointsEarned?: number;
  newScore?: number;
  answeredCount?: number;
  correctOptionId?: string;
  explanation?: string;
  power?: PowerUp;
  targetId?: string;
  rankings?: Participant[];
  session?: any;
  stealAmount?: number;
  amount?: number;
  winnerId?: string;
  winnerNickname?: string;
  fromId?: string;
  fromNickname?: string;
  toId?: string;
  toNickname?: string;
  stealCount?: number;
  success?: boolean;
  error?: string;
  introTitle?: string;
  introDescription?: string;
}

/**
 * Obtiene la URL base de la API del servidor (apunta a la misma IP donde esté corriendo el frontend)
 */
function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

// ── Control del Docente (Host) ──
export class GameHostSync {
  private token: string;
  private sse: EventSource | null = null;
  private p2pHost: P2PHost | null = null;
  public onEvent?: (msg: GameEventMessage) => void;

  constructor(token: string) {
    this.token = token;
  }

  public async init(): Promise<void> {
    const base = getApiBaseUrl();

    // 1. Intentar conectar SSE local
    try {
      this.sse = new EventSource(`${base}/api/session/${this.token}/stream`);

      this.sse.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as GameEventMessage;
          if (this.onEvent) this.onEvent(msg);
        } catch (e) {
          console.warn('[GameHostSync] Error al parsear SSE:', e);
        }
      };

      this.sse.onerror = () => {
        console.warn('[GameHostSync] Servidor SSE no disponible, activando P2P de respaldo');
        this.initP2PFallback();
      };
    } catch {
      this.initP2PFallback();
    }

    // Inicializar P2P paralelamente como canal redundante
    this.initP2PFallback();
  }

  private initP2PFallback() {
    if (this.p2pHost) return;
    this.p2pHost = new P2PHost(this.token);
    this.p2pHost.init().then(() => {
      if (!this.p2pHost) return;
      this.p2pHost.onMessage = (msg: any) => {
        if (this.onEvent) this.onEvent(msg);
      };
    });
  }

  public async broadcast(eventType: GameEventMessage['type'], payload: any = {}): Promise<void> {
    const base = getApiBaseUrl();

    // 1. Enviar vía API local HTTP
    try {
      await fetch(`${base}/api/session/${this.token}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, payload }),
      });
    } catch {
      // Si la API falla, enviar vía P2P
    }

    // 2. Redundancia vía P2P
    if (this.p2pHost) {
      this.p2pHost.broadcast({ type: eventType as any, ...payload });
    }
  }

  public async resetSession(): Promise<void> {
    const base = getApiBaseUrl();
    try {
      await fetch(`${base}/api/session/${this.token}/reset`, {
        method: 'POST',
      });
    } catch {
      // Ignorar si no hay API
    }
  }

  public destroy() {
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    if (this.p2pHost) {
      this.p2pHost.destroy();
      this.p2pHost = null;
    }
  }
}

// ── Control del Estudiante (Client) ──
export class GameClientSync {
  private token: string;
  private sse: EventSource | null = null;
  private p2pClient: P2PClient | null = null;
  public onEvent?: (msg: GameEventMessage) => void;
  public isConnected = false;

  constructor(token: string) {
    this.token = token;
  }

  public async join(participant: Participant): Promise<{ success: boolean; participants: Participant[] }> {
    const base = getApiBaseUrl();

    // 1. Intentar HTTP Join en el servidor local
    try {
      const res = await fetch(`${base}/api/session/${this.token}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: participant.nickname,
          avatar: participant.avatar,
          participantId: participant.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        this.isConnected = true;
        this.connectSSE();
        return { success: true, participants: data.participants || [participant] };
      }
    } catch {
      console.warn('[GameClientSync] API no disponible, usando P2P directo');
    }

    // 2. Respaldo P2P WebRTC
    this.p2pClient = getOrCreateP2PClient(this.token);
    this.p2pClient.onMessage = (msg: any) => {
      if (this.onEvent) this.onEvent(msg);
    };
    const p2pOk = await this.p2pClient.connect(participant);
    this.isConnected = p2pOk || this.p2pClient.isConnected;

    return { success: this.isConnected, participants: [participant] };
  }

  public connectSSE(): void {
    if (this.sse) return;
    const base = getApiBaseUrl();

    try {
      this.sse = new EventSource(`${base}/api/session/${this.token}/stream`);

      this.sse.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as GameEventMessage;
          if (this.onEvent) this.onEvent(msg);
        } catch (e) {
          console.warn('[GameClientSync] Error parseando SSE:', e);
        }
      };

      this.sse.onopen = () => {
        this.isConnected = true;
      };

      this.sse.onerror = () => {
        console.warn('[GameClientSync] Falló SSE, manteniendo canal de respaldo P2P');
      };
    } catch {
      // Respaldo P2P activo
    }
  }

  public async submitAnswer(data: {
    participantId: string;
    optionId: string;
    timeTaken: number;
    isCorrect: boolean;
    pointsEarned: number;
  }): Promise<{ isCorrect: boolean; pointsEarned: number; newScore: number }> {
    const base = getApiBaseUrl();

    // 1. Enviar vía API local HTTP
    try {
      const res = await fetch(`${base}/api/session/${this.token}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        return result;
      }
    } catch {
      // Enviar por P2P si falla la API
    }

    // 2. Respaldo P2P
    if (this.p2pClient && this.p2pClient.isConnected) {
      this.p2pClient.send({
        type: 'ANSWER',
        participantId: data.participantId,
        optionId: data.optionId,
        timeTaken: data.timeTaken,
      });
    }

    return {
      isCorrect: data.isCorrect,
      pointsEarned: data.pointsEarned,
      newScore: data.pointsEarned,
    };
  }

  public async claimStealPoints(participantId: string): Promise<{ success: boolean; amount?: number; winnerNickname?: string }> {
    const base = getApiBaseUrl();
    try {
      const res = await fetch(`${base}/api/session/${this.token}/steal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    if (this.p2pClient && this.p2pClient.isConnected) {
      this.p2pClient.send({
        type: 'STEAL_POINTS_CLAIMED' as any,
        participantId,
      });
    }

    return { success: false };
  }

  public async requestSteal(data: { fromId: string; toId: string }): Promise<{ success: boolean; error?: string; fromNickname?: string; toNickname?: string; amount?: number }> {
    const base = getApiBaseUrl();
    try {
      const res = await fetch(`${base}/api/session/${this.token}/steal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return { success: false, error: 'No se pudo conectar al servidor' };
  }

  public destroy() {
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
    if (this.p2pClient) {
      this.p2pClient.destroy();
      this.p2pClient = null;
    }
    this.isConnected = false;
  }
}

// ── Singletons de Clientes para persistir entre cambios de página en el móvil ──
let activeClientSync: GameClientSync | null = null;
let activeSyncToken: string | null = null;

export function getOrCreateGameClientSync(token: string): GameClientSync {
  if (!activeClientSync || activeSyncToken !== token) {
    if (activeClientSync) activeClientSync.destroy();
    activeClientSync = new GameClientSync(token);
    activeSyncToken = token;
  }
  return activeClientSync;
}
