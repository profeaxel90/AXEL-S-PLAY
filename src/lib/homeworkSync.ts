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

      this.client.on('message', (topic, payload) => {
        // 1. Coincidencia directa exacta
        const callback = this.callbacks.get(topic);
        if (callback) {
          callback(payload.toString());
          return;
        }

        // 2. Coincidencia con comodines MQTT (# o +)
        for (const [subPattern, cb] of this.callbacks.entries()) {
          if (subPattern.endsWith('/#')) {
            const prefix = subPattern.slice(0, -2);
            if (topic === prefix || topic.startsWith(`${prefix}/`)) {
              cb(payload.toString());
              return;
            }
          } else if (subPattern.includes('+')) {
            const patternParts = subPattern.split('/');
            const topicParts = topic.split('/');
            if (patternParts.length === topicParts.length) {
              const matches = patternParts.every((part, idx) => part === '+' || part === topicParts[idx]);
              if (matches) {
                cb(payload.toString());
                return;
              }
            }
          }
        }
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

    // Preservar texto, preguntas, videos y URLs; admitir PDFs de tamaño razonable
    const safePayload = {
      ...assignment,
      pdfUrl: assignment.pdfUrl && assignment.pdfUrl.length > 250000 ? undefined : assignment.pdfUrl,
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
    const subWildcard = `axelsplay/hw/${assignment.pin}/sub/#`;

    this.subscribeTopic(reqTopic, () => {
      // Un celular pidió los datos: volver a publicar de inmediato
      publishNow();
    });

    const handleSubmission = (messageStr: string) => {
      try {
        const sub = JSON.parse(messageStr) as HomeworkSubmission;
        if (sub && sub.studentFullName) {
          console.log(`[HomeworkSync] 📥 Nueva entrega recibida de ${sub.studentFullName}`);
          useHomeworkStore.getState().submitHomework(assignment.id, sub);
        }
      } catch (err) {
        console.warn('[HomeworkSync] Error procesando entrega:', err);
      }
    };

    this.subscribeTopic(subTopic, handleSubmission);
    this.subscribeTopic(subWildcard, handleSubmission);
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
   * Publica tanto al canal individual con retain (para que no se pierda) como al canal general.
   */
  public sendSubmission(pin: string, submission: HomeworkSubmission) {
    const subTopic = `axelsplay/hw/${pin}/sub`;
    const subRetained = `axelsplay/hw/${pin}/sub/${submission.id}`;
    const payloadStr = JSON.stringify(submission);

    const publish = () => {
      if (this.client && this.connected) {
        // Enviar con retain al canal individual para que el docente lo descargue incluso si estaba offline
        this.client.publish(subRetained, payloadStr, { qos: 1, retain: true });
        // Enviar al canal general para recepción inmediata en vivo
        this.client.publish(subTopic, payloadStr, { qos: 1 });
        console.log(`[HomeworkSync] 🚀 Entrega enviada a la nube (${submission.id})`);
      }
    };

    publish();
    // Reintentar a los 1.2s y a los 3s para garantizar recepción
    setTimeout(publish, 1200);
    setTimeout(publish, 3000);
  }

  /**
   * El docente envía retroalimentación a una entrega específica de un estudiante.
   */
  public sendTeacherFeedback(
    pin: string,
    submissionId: string,
    studentName: string,
    feedback: string,
    teacherName?: string
  ) {
    if (!pin) return;
    const topic = `axelsplay/hw/${pin}/feedback`;
    const payloadStr = JSON.stringify({
      submissionId,
      studentName,
      feedback,
      teacherName: teacherName || 'Axel',
      timestamp: new Date().toISOString(),
    });

    const publishNow = () => {
      this.client?.publish(topic, payloadStr, { retain: true, qos: 1 }, (err) => {
        if (!err) {
          console.log(`[HomeworkSync] 💬 Retroalimentación enviada para ${studentName} por Profe ${teacherName}`);
        }
      });
      // También notificar canal general de cambios en tiempo real
      const changesTopic = `axelsplay/hw/${pin}/changes`;
      this.client?.publish(changesTopic, JSON.stringify({
        type: 'FEEDBACK_UPDATED',
        submissionId,
        studentName,
        teacherName: teacherName || 'Axel',
        feedback,
        timestamp: new Date().toISOString(),
      }), { qos: 1 });
    };

    if (this.connected) {
      publishNow();
    } else {
      setTimeout(publishNow, 1200);
    }
  }

  /**
   * Notificar al canal general que el docente ha realizado cambios en la actividad o en la entrega.
   */
  public notifyTeacherChanges(pin: string, teacherName?: string, type: 'ASSIGNMENT_UPDATED' | 'STATUS_CHANGED' = 'ASSIGNMENT_UPDATED') {
    if (!pin) return;
    const topic = `axelsplay/hw/${pin}/changes`;
    const payloadStr = JSON.stringify({
      type,
      teacherName: teacherName || 'Axel',
      timestamp: new Date().toISOString(),
    });
    if (this.connected) {
      this.client?.publish(topic, payloadStr, { qos: 1 });
    } else {
      setTimeout(() => this.client?.publish(topic, payloadStr, { qos: 1 }), 1200);
    }
  }

  /**
   * El estudiante escucha notificaciones de cambios del docente en tiempo real.
   */
  public listenForTeacherChanges(
    pin: string,
    onChanges: (data: { type: string; teacherName?: string; submissionId?: string; studentName?: string; feedback?: string; timestamp?: string }) => void
  ): () => void {
    const topic = `axelsplay/hw/${pin}/changes`;
    this.subscribeTopic(topic, (msgStr) => {
      try {
        const data = JSON.parse(msgStr);
        if (data) {
          onChanges(data);
        }
      } catch (err) {
        console.warn('[HomeworkSync] Error parseando cambios:', err);
      }
    });

    return () => {
      this.unsubscribeTopic(topic);
    };
  }

  /**
   * El estudiante escucha la retroalimentación de su docente en tiempo real.
   */
  public listenForTeacherFeedback(
    pin: string,
    onFeedback: (data: { submissionId: string; studentName: string; feedback: string; teacherName?: string; timestamp: string }) => void
  ): () => void {
    const topic = `axelsplay/hw/${pin}/feedback`;
    this.subscribeTopic(topic, (msgStr) => {
      try {
        const data = JSON.parse(msgStr);
        if (data && data.feedback) {
          onFeedback(data);
        }
      } catch (err) {
        console.warn('[HomeworkSync] Error parseando feedback:', err);
      }
    });

    return () => {
      this.unsubscribeTopic(topic);
    };
  }

  private callbacks = new Map<string, (msg: string) => void>();

  private subscribeTopic(topic: string, callback: (msg: string) => void) {
    this.activeSubscriptions.add(topic);
    this.callbacks.set(topic, callback);

    if (this.client && this.connected) {
      this.client.subscribe(topic, { qos: 1 });
    }
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
