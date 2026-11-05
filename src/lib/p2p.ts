// ============================================================
// AXEL PLAY - Motor Multijugador Peer-to-Peer en la Nube (WebRTC)
// Conexión directa y gratuita entre celulares y computador sin backend
// ============================================================
import { Peer, DataConnection } from 'peerjs';
import type { Participant, PowerUp, Question } from '../types';

export type P2PMessage =
  | { type: 'JOIN'; participant: Participant }
  | { type: 'LEAVE'; participantId: string }
  | { type: 'ROOM_UPDATE'; participants: Participant[] }
  | { type: 'START_GAME' }
  | { type: 'QUESTION'; question: Question; index: number; timeLimit: number }
  | { type: 'ANSWER'; participantId: string; optionId: string; timeTaken: number }
  | { type: 'POWER'; power: PowerUp; targetId?: string } // Si targetId es undefined, es para TODOS
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'GAME_OVER'; rankings: Participant[] };

export class P2PHost {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  public roomId: string;
  public onMessage?: (msg: P2PMessage, senderId: string) => void;
  public onParticipantConnected?: (participant: Participant) => void;
  public onParticipantDisconnected?: (participantId: string) => void;

  constructor(token: string) {
    // Normalizar roomId para que sea URL-safe y compatible con PeerJS
    this.roomId = `axelplay-${token.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
  }

  public init(): Promise<string> {
    return new Promise((resolve) => {
      try {
        this.peer = new Peer(this.roomId, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          console.log('[P2PHost] Sala abierta con ID:', id);
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.warn('[P2PHost] Warning/Error de señalización:', err);
          resolve(this.roomId);
        });
      } catch (err) {
        console.warn('[P2PHost] No se pudo inicializar PeerJS:', err);
        resolve(this.roomId);
      }
    });
  }

  private handleConnection(conn: DataConnection) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data) => {
      const msg = data as P2PMessage;
      if (this.onMessage) {
        this.onMessage(msg, conn.peer);
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.onParticipantDisconnected) {
        this.onParticipantDisconnected(conn.peer);
      }
    });
  }

  public broadcast(msg: P2PMessage) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }

  public sendTo(peerId: string, msg: P2PMessage) {
    const conn = this.connections.get(peerId);
    if (conn && conn.open) {
      conn.send(msg);
    }
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
  private conn: DataConnection | null = null;
  public hostId: string;
  public onMessage?: (msg: P2PMessage) => void;
  public onConnected?: () => void;
  public onDisconnected?: () => void;

  constructor(token: string) {
    this.hostId = `axelplay-${token.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
  }

  public connect(participant: Participant): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.peer = new Peer({ debug: 1 });

        this.peer.on('open', () => {
          if (!this.peer) return;
          this.conn = this.peer.connect(this.hostId, {
            reliable: true,
          });

          this.conn.on('open', () => {
            console.log('[P2PClient] Conectado exitosamente con el docente');
            this.send({ type: 'JOIN', participant });
            if (this.onConnected) this.onConnected();
            resolve(true);
          });

          this.conn.on('data', (data) => {
            const msg = data as P2PMessage;
            if (this.onMessage) {
              this.onMessage(msg);
            }
          });

          this.conn.on('close', () => {
            if (this.onDisconnected) this.onDisconnected();
          });

          this.conn.on('error', () => {
            resolve(false);
          });
        });

        this.peer.on('error', () => {
          resolve(false);
        });

        // Timeout de seguridad en caso de que no haya conexión P2P
        setTimeout(() => resolve(false), 4000);
      } catch {
        resolve(false);
      }
    });
  }

  public send(msg: P2PMessage) {
    if (this.conn && this.conn.open) {
      this.conn.send(msg);
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
  }
}
