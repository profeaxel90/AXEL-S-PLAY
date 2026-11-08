// ============================================================
// AXEL'S PLAY - Motor de Sincronización en Tiempo Real Multicanal
// 1. Canal Cloud Instantáneo: MQTT sobre WebSockets (EMQX + HiveMQ con TLS/WSS)
// 2. Canal Local Inmediato: BroadcastChannel (0ms entre pestañas/ventanas)
// 3. Canal P2P Respaldo: WebRTC PeerJS
// 4. Servidor Local HTTP/SSE si está en ejecución
// ============================================================
import mqtt, { type MqttClient } from 'mqtt';
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
    | 'STEAL_POWER_AUTHORIZED'
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
  nickname?: string;
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
  _msgId?: string;
}

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

function cleanRoomCode(token: string): string {
  if (!token) return 'default';
  return token.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 32);
}

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

function generateMsgId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Control del Docente (Host) ──
export class GameHostSync {
  public token: string;
  private roomCode: string;
  private sse: EventSource | null = null;
  private p2pHost: P2PHost | null = null;
  private mqttClient: MqttClient | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private seenMessages = new Set<string>();
  public onEvent?: (msg: GameEventMessage) => void;
  public isConnected = false;

  constructor(token: string) {
    this.token = token;
    this.roomCode = cleanRoomCode(token);
    this.initBroadcastChannel();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`axelsplay_${this.roomCode}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
      } catch (e) {
        console.warn('[HostSync] Error BroadcastChannel:', e);
      }
    }
  }

  private handleIncoming(msg: any) {
    if (!msg || typeof msg !== 'object' || !msg.type) return;
    if (msg._msgId) {
      if (this.seenMessages.has(msg._msgId)) return;
      this.seenMessages.add(msg._msgId);
      if (this.seenMessages.size > 200) {
        const first = this.seenMessages.values().next().value;
        if (first) this.seenMessages.delete(first);
      }
    }

    console.log(`[HostSync] 📥 Mensaje recibido (${msg.type}) en sala ${this.roomCode}`);
    if (this.onEvent) {
      this.onEvent(msg as GameEventMessage);
    }
  }

  public async init(): Promise<void> {
    const base = getApiBaseUrl();

    // 1. Conexión Cloud MQTT por WebSockets (Multi-dispositivos e Internet)
    this.connectMqtt();

    // 2. Intentar SSE local si existe backend
    try {
      this.sse = new EventSource(`${base}/api/session/${this.token}/stream`);
      this.sse.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as GameEventMessage;
          this.handleIncoming(msg);
        } catch {}
      };
      this.sse.onerror = () => {
        this.initP2PFallback();
      };
    } catch {
      this.initP2PFallback();
    }

    this.initP2PFallback();
  }

  private connectMqtt(brokerIndex = 0) {
    if (brokerIndex >= BROKERS.length) return;
    const url = BROKERS[brokerIndex];
    try {
      const clientId = `host_${this.roomCode}_${Math.random().toString(16).slice(2, 8)}`;
      const client = mqtt.connect(url, {
        clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 3000,
      });

      this.mqttClient = client;

      client.on('connect', () => {
        console.log(`[HostSync] ☁️ Conectado a Cloud Broker (${url}) para sala: ${this.roomCode}`);
        this.isConnected = true;
        // Suscribirse a eventos de estudiantes (join, answers, steal, etc.)
        client.subscribe(`axelsplay/room/${this.roomCode}/events`, { qos: 1 });
      });

      client.on('message', (_topic, payload) => {
        try {
          const parsed = JSON.parse(payload.toString());
          this.handleIncoming(parsed);
        } catch (e) {
          console.warn('[HostSync] Error parseando payload MQTT:', e);
        }
      });

      client.on('error', () => {
        client.end(true);
        if (brokerIndex + 1 < BROKERS.length) {
          this.connectMqtt(brokerIndex + 1);
        }
      });
    } catch (e) {
      console.warn('[HostSync] Excepción al conectar MQTT:', e);
    }
  }

  private initP2PFallback() {
    if (this.p2pHost) return;
    this.p2pHost = new P2PHost(this.token);
    this.p2pHost.init().then(() => {
      if (!this.p2pHost) return;
      this.p2pHost.onMessage = (msg: any) => {
        this.handleIncoming(msg);
      };
    });
  }

  public async broadcast(eventType: GameEventMessage['type'], payload: any = {}): Promise<void> {
    const msgId = generateMsgId();
    const message: GameEventMessage = { type: eventType, ...payload, _msgId: msgId };
    this.seenMessages.add(msgId);

    console.log(`[HostSync] 📢 Transmitiendo evento (${eventType}) a la sala ${this.roomCode}`);

    // 1. Canal Local Inmediato
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch {}
    }

    // 2. Canal Cloud MQTT
    if (this.mqttClient && this.mqttClient.connected) {
      try {
        this.mqttClient.publish(
          `axelsplay/room/${this.roomCode}/game`,
          JSON.stringify(message),
          { qos: 1 }
        );
      } catch (e) {
        console.warn('[HostSync] Error publicando en MQTT:', e);
      }
    }

    // 3. Canal Local HTTP API
    const base = getApiBaseUrl();
    try {
      fetch(`${base}/api/session/${this.token}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, payload }),
      }).catch(() => {});
    } catch {}

    // 4. Canal P2P WebRTC
    if (this.p2pHost) {
      this.p2pHost.broadcast({ type: eventType as any, ...payload });
    }
  }

  public async resetSession(): Promise<void> {
    this.broadcast('RESET', {});
    const base = getApiBaseUrl();
    try {
      fetch(`${base}/api/session/${this.token}/reset`, { method: 'POST' }).catch(() => {});
    } catch {}
  }

  public destroy() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.mqttClient) {
      this.mqttClient.end(true);
      this.mqttClient = null;
    }
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
  public token: string;
  private roomCode: string;
  private sse: EventSource | null = null;
  private p2pClient: P2PClient | null = null;
  private mqttClient: MqttClient | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private seenMessages = new Set<string>();
  private pendingParticipant: Participant | null = null;
  public onEvent?: (msg: GameEventMessage) => void;
  public isConnected = false;

  constructor(token: string) {
    this.token = token;
    this.roomCode = cleanRoomCode(token);
    this.initBroadcastChannel();
    this.connectMqtt();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`axelsplay_${this.roomCode}`);
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
      } catch (e) {
        console.warn('[ClientSync] Error BroadcastChannel:', e);
      }
    }
  }

  private handleIncoming(msg: any) {
    if (!msg || typeof msg !== 'object' || !msg.type) return;
    if (msg._msgId) {
      if (this.seenMessages.has(msg._msgId)) return;
      this.seenMessages.add(msg._msgId);
      if (this.seenMessages.size > 200) {
        const first = this.seenMessages.values().next().value;
        if (first) this.seenMessages.delete(first);
      }
    }

    console.log(`[ClientSync] 📥 Mensaje del juego (${msg.type}) en sala ${this.roomCode}`);
    if (this.onEvent) {
      this.onEvent(msg as GameEventMessage);
    }
  }

  private connectMqtt(brokerIndex = 0) {
    if (brokerIndex >= BROKERS.length) return;
    const url = BROKERS[brokerIndex];
    try {
      const clientId = `student_${this.roomCode}_${Math.random().toString(16).slice(2, 8)}`;
      const client = mqtt.connect(url, {
        clientId,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 3000,
      });

      this.mqttClient = client;

      client.on('connect', () => {
        console.log(`[ClientSync] ☁️ Conectado a Cloud Broker (${url}) para sala: ${this.roomCode}`);
        this.isConnected = true;
        // Suscribirse a comandos del docente (game, questions, leaderboard, steal)
        client.subscribe(`axelsplay/room/${this.roomCode}/game`, { qos: 1 });

        // Si hay un participante esperando envío de JOIN
        if (this.pendingParticipant) {
          this.publishEvent({ type: 'JOIN', participant: this.pendingParticipant });
        }
      });

      client.on('message', (_topic, payload) => {
        try {
          const parsed = JSON.parse(payload.toString());
          this.handleIncoming(parsed);
        } catch (e) {
          console.warn('[ClientSync] Error parseando payload MQTT:', e);
        }
      });

      client.on('error', () => {
        client.end(true);
        if (brokerIndex + 1 < BROKERS.length) {
          this.connectMqtt(brokerIndex + 1);
        }
      });
    } catch (e) {
      console.warn('[ClientSync] Excepción al conectar MQTT:', e);
    }
  }

  private publishEvent(message: GameEventMessage) {
    const msgId = generateMsgId();
    const fullMsg = { ...message, _msgId: msgId };
    this.seenMessages.add(msgId);

    // 1. BroadcastChannel (mismo dispositivo/pestaña)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(fullMsg);
      } catch {}
    }

    // 2. MQTT Cloud (dispositivos móviles y PC remotos)
    if (this.mqttClient && this.mqttClient.connected) {
      try {
        this.mqttClient.publish(
          `axelsplay/room/${this.roomCode}/events`,
          JSON.stringify(fullMsg),
          { qos: 1 }
        );
      } catch {}
    }
  }

  public async join(participant: Participant): Promise<{ success: boolean; participants: Participant[] }> {
    this.pendingParticipant = participant;
    this.isConnected = true;

    // Publicar evento de entrada en canales locales y en la nube
    this.publishEvent({ type: 'JOIN', participant });

    // Enviar también por HTTP API si existe
    const base = getApiBaseUrl();
    try {
      fetch(`${base}/api/session/${this.token}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: participant.nickname,
          avatar: participant.avatar,
          participantId: participant.id,
        }),
      }).catch(() => {});
    } catch {}

    // Respaldo P2P WebRTC
    try {
      this.p2pClient = getOrCreateP2PClient(this.token);
      this.p2pClient.onMessage = (msg: any) => {
        this.handleIncoming(msg);
      };
      this.p2pClient.connect(participant).catch(() => {});
    } catch {}

    return { success: true, participants: [participant] };
  }

  public connectSSE(): void {
    if (this.sse) return;
    const base = getApiBaseUrl();

    try {
      this.sse = new EventSource(`${base}/api/session/${this.token}/stream`);
      this.sse.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as GameEventMessage;
          this.handleIncoming(msg);
        } catch {}
      };
      this.sse.onopen = () => {
        this.isConnected = true;
      };
    } catch {}
  }

  public async submitAnswer(data: {
    participantId: string;
    nickname?: string;
    optionId: string;
    timeTaken: number;
    isCorrect: boolean;
    pointsEarned: number;
    newScore?: number;
  }): Promise<{ isCorrect: boolean; pointsEarned: number; newScore: number }> {
    // Publicar respuesta en canales redundantes
    this.publishEvent({
      type: 'ANSWER',
      ...data,
    });

    // HTTP API local
    const base = getApiBaseUrl();
    try {
      fetch(`${base}/api/session/${this.token}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(() => {});
    } catch {}

    // P2P WebRTC
    if (this.p2pClient && this.p2pClient.isConnected) {
      try {
        this.p2pClient.send({
          type: 'ANSWER',
          ...data,
        });
      } catch {}
    }

    return {
      isCorrect: data.isCorrect,
      pointsEarned: data.pointsEarned,
      newScore: data.newScore ?? data.pointsEarned,
    };
  }

  public async claimStealPoints(participantId: string): Promise<{ success: boolean; amount?: number; winnerNickname?: string }> {
    this.publishEvent({
      type: 'STEAL_POINTS_CLAIMED',
      participantId,
    });
    return { success: true };
  }

  public async requestSteal(data: { fromId: string; toId: string }): Promise<{ success: boolean; error?: string; fromNickname?: string; toNickname?: string; amount?: number }> {
    this.publishEvent({
      type: 'STEAL_REQUEST',
      ...data,
    });
    return { success: true };
  }

  public destroy() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.mqttClient) {
      this.mqttClient.end(true);
      this.mqttClient = null;
    }
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
  const clean = cleanRoomCode(token);
  if (!activeClientSync || activeSyncToken !== clean) {
    if (activeClientSync) activeClientSync.destroy();
    activeClientSync = new GameClientSync(token);
    activeSyncToken = clean;
  }
  return activeClientSync;
}
