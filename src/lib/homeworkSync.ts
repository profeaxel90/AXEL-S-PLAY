// ============================================================
// AXEL'S PLAY - Sincronización en la Nube de Deberes (Homework Cloud Sync)
// Conecta el PC del docente con los celulares de los estudiantes mediante MQTT WSS
// Permite que cualquier celular reciba la asignación en tiempo real y envíe sus tareas.
// ============================================================

import mqtt, { type MqttClient } from 'mqtt';
import type { HomeworkAssignment, HomeworkSubmission } from '../types/homework';
import { useHomeworkStore } from '../stores/homeworkStore';

const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

class HomeworkSyncManager {
  private client: MqttClient | null = null;
  private connected = false;
  private brokerIndex = 0;
  private activeSubscriptions = new Set<string>();

  constructor() {
    this.connect();
  }

  private connect() {
    if (typeof window === 'undefined') return;
    if (this.brokerIndex >= BROKERS.length) {
      this.brokerIndex = 0; // Reiniciar ciclo
    }

    const brokerUrl = BROKERS[this.brokerIndex];
    try {
      const clientId = `axels_hw_${Math.random().toString(16).slice(2, 10)}`;
      this.client = mqtt.connect(brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 4000,
      });

      this.client.on('connect', () => {
        this.connected = true;
        console.log(`[HomeworkSync] ☁️ Conectado a la nube educativa (${brokerUrl})`);
        // Re-suscribirse a temas activos
        this.activeSubscriptions.forEach((topic) => {
          this.client?.subscribe(topic, { qos: 1 });
        });
      });

      this.client.on('error', (err) => {
        console.warn('[HomeworkSync] Error en broker MQTT:', err);
        this.client?.end(true);
        this.connected = false;
        this.brokerIndex++;
        setTimeout(() => this.connect(), 2000);
      });

      this.client.on('offline', () => {
        this.connected = false;
      });
    } catch (e) {
      console.warn('[HomeworkSync] Excepción al conectar:', e);
    }
  }

  /**
   * El docente publica la asignación a la nube con 'retain: true'.
   * Así cualquier celular que ingrese con el PIN la descargará inmediatamente aunque el docente no esté en ese momento.
   */
  public broadcastAssignment(assignment: HomeworkAssignment) {
    if (!this.client || !assignment.pin) return;

    // Evitar saturar el broker con base64 masivos de PDFs gigantes; preservar texto, preguntas, videos y URLs
    const safePayload = {
      ...assignment,
      pdfUrl: assignment.pdfUrl && assignment.pdfUrl.length > 50000 ? undefined : assignment.pdfUrl,
    };

    const topic = `axelsplay/hw/${assignment.pin}/data`;
    const payloadStr = JSON.stringify(safePayload);

    const publishNow = () => {
      this.client?.publish(topic, payloadStr, { retain: true, qos: 1 }, (err) => {
        if (!err) {
          console.log(`[HomeworkSync] 📡 Asignación ${assignment.pin} publicada en la nube`);
        }
      });
    };

    if (this.connected) {
      publishNow();
    } else {
      setTimeout(publishNow, 1500);
    }

    // El docente también escucha solicitudes directas y entregas de estudiantes
    const reqTopic = `axelsplay/hw/${assignment.pin}/req`;
    const subTopic = `axelsplay/hw/${assignment.pin}/sub`;

    this.subscribeTopic(reqTopic, () => {
      // Un celular pidió los datos: volver a publicar de inmediato
      publishNow();
    });

    this.subscribeTopic(subTopic, (messageStr) => {
      try {
        const sub = JSON.parse(messageStr) as HomeworkSubmission;
        if (sub && sub.studentFullName) {
          console.log(`[HomeworkSync] 📥 Nueva entrega recibida de ${sub.studentFullName}`);
          useHomeworkStore.getState().submitHomework(assignment.id, sub);
        }
      } catch (err) {
        console.warn('[HomeworkSync] Error procesando entrega:', err);
      }
    });
  }

  /**
   * El estudiante (en su celular) solicita y descarga la asignación si no la tiene en su dispositivo.
   */
  public listenForAssignment(pin: string, onReceived: (hw: HomeworkAssignment) => void): () => void {
    const dataTopic = `axelsplay/hw/${pin}/data`;
    const reqTopic = `axelsplay/hw/${pin}/req`;

    const handler = (messageStr: string) => {
      try {
        const hw = JSON.parse(messageStr) as HomeworkAssignment;
        if (hw && (hw.pin === pin || hw.id === pin)) {
          console.log(`[HomeworkSync] 📱 Celular sincronizó asignación: ${hw.title}`);
          useHomeworkStore.getState().importAssignment(hw);
          onReceived(hw);
        }
      } catch (err) {
        console.warn('[HomeworkSync] Error parseando asignación remota:', err);
      }
    };

    this.subscribeTopic(dataTopic, handler);

    // Enviar solicitud inmediata al docente / nube
    const sendReq = () => {
      this.client?.publish(reqTopic, JSON.stringify({ pin, time: Date.now() }), { qos: 1 });
    };

    if (this.connected) {
      sendReq();
    } else {
      setTimeout(sendReq, 1000);
    }

    return () => {
      this.unsubscribeTopic(dataTopic);
    };
  }

  /**
   * El estudiante envía su entrega completada desde su celular hacia el docente.
   */
  public sendSubmission(pin: string, submission: HomeworkSubmission) {
    const subTopic = `axelsplay/hw/${pin}/sub`;
    const payloadStr = JSON.stringify(submission);

    if (this.client && this.connected) {
      this.client.publish(subTopic, payloadStr, { qos: 1 });
    } else {
      // Reintentar en 1.5s
      setTimeout(() => {
        this.client?.publish(subTopic, payloadStr, { qos: 1 });
      }, 1500);
    }
  }

  private callbacks = new Map<string, (msg: string) => void>();

  private subscribeTopic(topic: string, callback: (msg: string) => void) {
    this.activeSubscriptions.add(topic);
    this.callbacks.set(topic, callback);

    if (this.client && this.connected) {
      this.client.subscribe(topic, { qos: 1 });
    }

    this.client?.on('message', (msgTopic, payload) => {
      if (msgTopic === topic) {
        callback(payload.toString());
      }
    });
  }

  private unsubscribeTopic(topic: string) {
    this.activeSubscriptions.delete(topic);
    this.callbacks.delete(topic);
    if (this.client && this.connected) {
      this.client.unsubscribe(topic);
    }
  }
}

export const homeworkSync = new HomeworkSyncManager();
