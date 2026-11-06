// ============================================================
// AXEL'S PLAY - Motor Multijugador Peer-to-Peer en la Nube (WebRTC)
// Conexión directa y gratuita entre celulares y computador sin backend
// ============================================================
import { Peer, DataConnection } from 'peerjs';
import type { Participant, PowerUp, Question } from '../types';

export type P2PMessage =
  | { type: 'JOIN'; participant: Participant }
  | { type: 'LEAVE'; participantId: string }
  | { type: 'ROOM_UPDATE'; participants: Participant[] }
  | { type: 'START_INTRO'; introTitle?: string; introDescription?: string }
  | { type: 'START_GAME' }
  | { type: 'QUESTION'; question: Question; index: number; total: number; timeLimit: number }
  | { type: 'ANSWER'; participantId: string; optionId: string; timeTaken: number }
  | { type: 'ANSWER_ACK'; participantId: string; isCorrect: boolean; pointsEarned: number; newScore: number }
  | { type: 'REVEAL_ANSWER'; correctOptionId: string; explanation?: string }
  | { type: 'POWER'; power: PowerUp; targetId?: string } // targetId undefined = para TODOS
  | { type: 'STEAL_POINTS_START'; amount: number }
  | { type: 'STEAL_POINTS_CLAIMED'; winnerId: string; winnerNickname: string; amount: number; participants?: Participant[] }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'GAME_OVER'; rankings: Participant[] };

/**
 * Normaliza cualquier token o sessionId para que tanto docente como estudiante
 * calculen de manera 100% determinista la misma sala en PeerJS.
 */
export function normalizeRoomId(token: string): string {
  if (!token) return 'axelplay-default';
  const clean = token.replace(/^sess-/, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `axelplay-${clean.slice(0, 20)}`;
}

export class P2PHost {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  public roomId: string;
  public onMessage?: (msg: P2PMessage, senderId: string) => void;
  public onParticipantConnected?: (participant: Participant) => void;
  public onParticipantDisconnected?: (participantId: string) => void;

  constructor(token: string) {
    this.roomId = normalizeRoomId(token);
  }

  public init(): Promise<string> {
    return new Promise((resolve) => {
      try {
        console.log('[P2PHost] Inicializando sala:', this.roomId);
        this.peer = new Peer(this.roomId, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          console.log('[P2PHost] ✅ Sala abierta con ID:', id);
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          console.log('[P2PHost] 📱 Nueva conexión entrante desde:', conn.peer);
          this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('[P2PHost] Error en Peer:', err);
          resolve(this.roomId);
        });
      } catch (err) {
        console.warn('[P2PHost] Excepción al inicializar Peer:', err);
        resolve(this.roomId);
      }
    });
  }

  private handleConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log('[P2PHost] Conexión abierta con peer:', conn.peer);
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data) => {
      const msg = data as P2PMessage;
      console.log('[P2PHost] Mensaje recibido:', msg.type, 'de:', conn.peer);
      if (this.onMessage) {
        this.onMessage(msg, conn.peer);
      }
    });

    conn.on('close', () => {
      console.log('[P2PHost] Conexión cerrada con peer:', conn.peer);
      this.connections.delete(conn.peer);
      if (this.onParticipantDisconnected) {
        this.onParticipantDisconnected(conn.peer);
      }
    });

    conn.on('error', (err) => {
      console.warn('[P2PHost] Error en conexión con peer:', conn.peer, err);
      this.connections.delete(conn.peer);
    });
  }

  public broadcast(msg: P2PMessage) {
    console.log('[P2PHost] Transmitiendo a todos:', msg.type, 'Conexiones activas:', this.connections.size);
    this.connections.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(msg);
        } catch (e) {
          console.warn('[P2PHost] Error al enviar a peer:', conn.peer, e);
        }
      }
    });
  }

  public sendTo(peerId: string, msg: P2PMessage) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(msg);
    }
  }

  public getConnectedCount(): number {
    return this.connections.size;
  }

  public destroy() {
    this.connections.forEach((c) => c.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export class P2PClient {
  private peer: Peer | null = null;
  public conn: DataConnection | null = null;
  public hostId: string;
  public isConnected = false;
  public onMessage?: (msg: P2PMessage) => void;
  public onConnected?: () => void;
  public onDisconnected?: () => void;
  private currentParticipant: Participant | null = null;

  constructor(token: string) {
    this.hostId = normalizeRoomId(token);
  }

  public connect(participant: Participant): Promise<boolean> {
    this.currentParticipant = participant;
    return new Promise((resolve) => {
      try {
        console.log('[P2PClient] Conectando con Host ID:', this.hostId);
        // Si ya hay una conexión abierta con el host, reutilizarla
        if (this.conn && this.conn.open) {
          this.isConnected = true;
          this.send({ type: 'JOIN', participant });
          resolve(true);
          return;
        }

        if (this.peer && !this.peer.destroyed) {
          this.makeHostConnection(resolve);
          return;
        }

        this.peer = new Peer({ debug: 1 });

        this.peer.on('open', (id) => {
          console.log('[P2PClient] Mi ID de Peer:', id);
          this.makeHostConnection(resolve);
        });

        this.peer.on('error', (err) => {
          console.warn('[P2PClient] Error en Peer:', err);
          resolve(false);
        });
      } catch (err) {
        console.warn('[P2PClient] Excepción al conectar:', err);
        resolve(false);
      }
    });
  }

  private makeHostConnection(resolve: (success: boolean) => void) {
    if (!this.peer) return;
    try {
      this.conn = this.peer.connect(this.hostId, {
        reliable: true,
      });

      this.conn.on('open', () => {
        console.log('[P2PClient] ✅ Conectado exitosamente con el docente en:', this.hostId);
        this.isConnected = true;
        if (this.currentParticipant) {
          this.send({ type: 'JOIN', participant: this.currentParticipant });
        }
        if (this.onConnected) this.onConnected();
        resolve(true);
      });

      this.conn.on('data', (data) => {
        const msg = data as P2PMessage;
        console.log('[P2PClient] Mensaje recibido del docente:', msg.type);
        if (this.onMessage) {
          this.onMessage(msg);
        }
      });

      this.conn.on('close', () => {
        console.log('[P2PClient] Conexión cerrada');
        this.isConnected = false;
        if (this.onDisconnected) this.onDisconnected();
      });

      this.conn.on('error', (err) => {
        console.warn('[P2PClient] Error de canal con host:', err);
        this.isConnected = false;
        resolve(false);
      });

      // Timeout preventivo
      setTimeout(() => {
        if (!this.isConnected) {
          console.warn('[P2PClient] Conexión timeout después de 6s');
          resolve(false);
        }
      }, 6000);
    } catch (e) {
      console.warn('[P2PClient] Error al conectar al host:', e);
      resolve(false);
    }
  }

  public send(msg: P2PMessage) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
      } catch (e) {
        console.warn('[P2PClient] Error al enviar mensaje:', e);
      }
    } else {
      console.warn('[P2PClient] No se puede enviar, canal cerrado');
    }
  }

  public destroy() {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.isConnected = false;
  }
}

// ── Singleton de P2P Client para no desconectar al cambiar de pantalla ──
let activeP2PClient: P2PClient | null = null;
let activeToken: string | null = null;

export function getOrCreateP2PClient(token: string): P2PClient {
  const normalized = normalizeRoomId(token);
  if (!activeP2PClient || activeToken !== normalized) {
    if (activeP2PClient) {
      activeP2PClient.destroy();
    }
    activeP2PClient = new P2PClient(token);
    activeToken = normalized;
  }
  return activeP2PClient;
}
