import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LiveParticipant {
  id: string;
  sessionId: string;
  nickname: string;
  avatar: string;
  score: number;
  rank?: number;
  isConnected: boolean;
  joinedAt: string;
  correctAnswers?: number;
  activePower?: any;
  stealCount: number;
}

import fs from 'fs';

interface LiveSession {
  token: string;
  phase: 'intro' | 'waiting' | 'question' | 'finished';
  currentQuestionIndex: number;
  participants: LiveParticipant[];
  answers: Array<{ participantId: string; optionId: string; timeTaken: number; isCorrect?: boolean; answerTimestamp: number }>;
  isAnswerRevealed: boolean;
  power?: any;
  stealActive?: boolean;
  stealAmount?: number;
  stealClaimedBy?: string | null;
  stealWinnerNickname?: string | null;
}

const sessions = new Map<string, LiveSession>();
const sseClients = new Map<string, Set<ServerResponse>>();

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function broadcastToSession(token: string, event: any) {
  const clients = sseClients.get(token);
  if (!clients) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

function gameServerPlugin(): Plugin {
  return {
    name: 'game-server-middleware',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = new URL(req.url || '/', 'http://localhost:5173');

        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          });
          res.end();
          return;
        }

        // API Tunnel Endpoint (Pública para cualquier red 4G/5G)
        if (url.pathname === '/api/tunnel') {
          const tunnelFilePath = path.resolve(__dirname, 'public_tunnel_url.txt');
          if (req.method === 'GET') {
            let tunnelUrl = 'https://d3cc1c726db066.lhr.life';
            try {
              if (fs.existsSync(tunnelFilePath)) {
                tunnelUrl = fs.readFileSync(tunnelFilePath, 'utf8').trim() || tunnelUrl;
              }
            } catch {}
            sendJson(res, 200, { tunnelUrl });
            return;
          }
          if (req.method === 'POST') {
            parseJsonBody(req).then((body) => {
              if (body.tunnelUrl) {
                try {
                  fs.writeFileSync(tunnelFilePath, body.tunnelUrl.trim(), 'utf8');
                } catch {}
              }
              sendJson(res, 200, { success: true, tunnelUrl: body.tunnelUrl });
            });
            return;
          }
        }

        if (!url.pathname.startsWith('/api/session/')) {
          next();
          return;
        }

        const parts = url.pathname.replace('/api/session/', '').split('/');
        const token = parts[0];
        const action = parts[1];

        if (!token) {
          sendJson(res, 400, { error: 'Falta el token de sesión' });
          return;
        }

        let session = sessions.get(token);
        if (!session) {
          session = {
            token,
            phase: 'waiting',
            currentQuestionIndex: 0,
            participants: [],
            answers: [],
            isAnswerRevealed: false,
          };
          sessions.set(token, session);
        }

        // 1. SSE Stream
        if (action === 'stream' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          });

          if (!sseClients.has(token)) {
            sseClients.set(token, new Set());
          }
          sseClients.get(token)!.add(res);

          res.write(`data: ${JSON.stringify({ type: 'INIT', session })}\n\n`);

          const pingInterval = setInterval(() => {
            try {
              res.write(':ping\n\n');
            } catch {
              clearInterval(pingInterval);
            }
          }, 15000);

          req.on('close', () => {
            clearInterval(pingInterval);
            sseClients.get(token)?.delete(res);
          });
          return;
        }

        // 2. State
        if (action === 'state' && req.method === 'GET') {
          sendJson(res, 200, { session });
          return;
        }

        // 3. Join
        if (action === 'join' && req.method === 'POST') {
          parseJsonBody(req).then((body) => {
            const { nickname, avatar, participantId } = body;
            if (!nickname) {
              sendJson(res, 400, { error: 'Nickname requerido' });
              return;
            }

            const id = participantId || `p-${Date.now()}`;
            const existingIdx = session.participants.findIndex(
              (p) => p.id === id || p.nickname.toLowerCase() === nickname.trim().toLowerCase()
            );

            let participant: LiveParticipant;
            if (existingIdx >= 0) {
              participant = {
                ...session.participants[existingIdx],
                avatar: avatar || session.participants[existingIdx].avatar,
                isConnected: true,
              };
              session.participants[existingIdx] = participant;
            } else {
              participant = {
                id,
                sessionId: token,
                nickname: nickname.trim(),
                avatar: avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Astro',
                score: 0,
                isConnected: true,
                joinedAt: new Date().toISOString(),
                stealCount: 0,
              };
              session.participants.push(participant);
            }

            broadcastToSession(token, {
              type: 'JOIN',
              participant,
              participants: session.participants,
            });

            sendJson(res, 200, { success: true, participant, participants: session.participants });
          });
          return;
        }

        // 4. Action
        if (action === 'action' && req.method === 'POST') {
          parseJsonBody(req).then((body) => {
            const { eventType, payload } = body;

            if (eventType === 'START_INTRO') {
              session.phase = 'intro';
            } else if (eventType === 'START_GAME') {
              session.phase = 'question';
              session.currentQuestionIndex = 0;
              session.answers = [];
              session.isAnswerRevealed = false;
            } else if (eventType === 'STEAL_POINTS_START') {
              session.stealActive = true;
              session.stealAmount = payload?.amount || 500;
              session.stealClaimedBy = null;
              session.stealWinnerNickname = null;
            } else if (eventType === 'QUESTION') {
              session.phase = 'question';
              session.currentQuestionIndex = payload?.index || 0;
              session.answers = [];
              session.isAnswerRevealed = false;
            } else if (eventType === 'REVEAL_ANSWER') {
              session.isAnswerRevealed = true;
            } else if (eventType === 'POWER') {
              if (!payload?.targetId) {
                session.participants.forEach((p) => {
                  p.activePower = payload?.power;
                });
              } else {
                const target = session.participants.find((p) => p.id === payload.targetId);
                if (target) target.activePower = payload.power;
              }
            } else if (eventType === 'GAME_OVER') {
              session.phase = 'finished';
            }

            broadcastToSession(token, {
              type: eventType,
              ...payload,
              session,
            });

            // After REVEAL_ANSWER, broadcast leaderboard top-7
            if (eventType === 'REVEAL_ANSWER') {
              const top7 = [...session.participants]
                .sort((a, b) => b.score - a.score)
                .slice(0, 7)
                .map((p, idx) => ({
                  id: p.id,
                  nickname: p.nickname,
                  avatar: p.avatar,
                  score: p.score,
                  rank: idx + 1,
                  correctAnswers: p.correctAnswers || 0,
                  stealCount: p.stealCount || 0,
                }));
              broadcastToSession(token, { type: 'LEADERBOARD', rankings: top7, session });
            }

            sendJson(res, 200, { success: true, session });
          });
          return;
        }

        // 5. Answer
        if (action === 'answer' && req.method === 'POST') {
          parseJsonBody(req).then((body) => {
            const { participantId, optionId, timeTaken, isCorrect, timeLimit } = body;
            const answerTimestamp = Date.now();

            const participant = session.participants.find((p) => p.id === participantId);

            // Calculate server-side points
            let serverPointsEarned = 0;
            if (isCorrect) {
              // Count how many have already answered correctly before this one
              const correctBefore = session.answers.filter((a) => a.isCorrect).length;
              // Base points: 1000, 900, 800... min 200
              const basePoints = Math.max(200, 1000 - correctBefore * 100);
              // Time bonus: up to 200 extra based on time remaining
              const effectiveTimeLimit = timeLimit || 20;
              const timeRemaining = Math.max(0, effectiveTimeLimit - (timeTaken / 1000));
              const timeBonus = Math.round((timeRemaining / effectiveTimeLimit) * 200);
              serverPointsEarned = Math.min(1200, basePoints + timeBonus);
            }

            if (participant) {
              participant.score += serverPointsEarned;
              if (isCorrect) {
                participant.correctAnswers = (participant.correctAnswers || 0) + 1;
              }
            }

            session.answers.push({ participantId, optionId, timeTaken, isCorrect, answerTimestamp });

            broadcastToSession(token, {
              type: 'ANSWER',
              participantId,
              optionId,
              timeTaken,
              isCorrect,
              pointsEarned: serverPointsEarned,
              newScore: participant?.score || 0,
              answeredCount: session.answers.length,
              participants: session.participants,
            });

            sendJson(res, 200, {
              success: true,
              isCorrect,
              serverPointsEarned,
              pointsEarned: serverPointsEarned,
              newScore: participant?.score || 0,
            });
          });
          return;
        }

        // 6. Steal points (Robo de puntos directo entre participantes)
        if (action === 'steal' && req.method === 'POST') {
          parseJsonBody(req).then((body) => {
            const { fromId, toId, participantId } = body;

            // Legacy support: if only participantId provided, use old logic
            if (!fromId && participantId) {
              if (!session.stealActive || session.stealClaimedBy) {
                sendJson(res, 200, {
                  success: false,
                  alreadyClaimed: true,
                  winnerNickname: session.stealWinnerNickname || 'Otro participante',
                });
                return;
              }

              session.stealActive = false;
              session.stealClaimedBy = participantId;
              const participant = session.participants.find((p) => p.id === participantId);
              const amount = session.stealAmount || 500;
              if (participant) {
                participant.score += amount;
                session.stealWinnerNickname = participant.nickname;
              }

              broadcastToSession(token, {
                type: 'STEAL_POINTS_CLAIMED',
                winnerId: participantId,
                winnerNickname: participant?.nickname || 'Estudiante',
                amount,
                participants: session.participants,
              });

              sendJson(res, 200, {
                success: true,
                winnerId: participantId,
                winnerNickname: participant?.nickname || 'Estudiante',
                amount,
                newScore: participant?.score || 0,
              });
              return;
            }

            // New directional steal: fromId steals from toId
            const STEAL_AMOUNT = 50;

            if (!fromId || !toId) {
              sendJson(res, 400, { success: false, error: 'fromId y toId son requeridos' });
              return;
            }

            if (fromId === toId) {
              sendJson(res, 400, { success: false, error: 'No puedes robarte puntos a ti mismo' });
              return;
            }

            const fromParticipant = session.participants.find((p) => p.id === fromId);
            const toParticipant = session.participants.find((p) => p.id === toId);

            if (!fromParticipant) {
              sendJson(res, 400, { success: false, error: 'Participante origen no encontrado' });
              return;
            }

            if ((fromParticipant.stealCount || 0) >= 2) {
              sendJson(res, 400, { success: false, error: 'Ya usaste tus 2 robos disponibles' });
              return;
            }

            if (!toParticipant) {
              sendJson(res, 400, { success: false, error: 'Participante destino no encontrado' });
              return;
            }

            if (toParticipant.score < STEAL_AMOUNT) {
              sendJson(res, 400, { success: false, error: `${toParticipant.nickname} no tiene suficientes puntos (mínimo ${STEAL_AMOUNT})` });
              return;
            }

            // Atomic operation
            toParticipant.score -= STEAL_AMOUNT;
            fromParticipant.score += STEAL_AMOUNT;
            fromParticipant.stealCount = (fromParticipant.stealCount || 0) + 1;

            console.log(`[STEAL] ${fromParticipant.nickname} robó a ${toParticipant.nickname}: ${STEAL_AMOUNT} pts`);

            broadcastToSession(token, {
              type: 'STEAL_RESULT',
              success: true,
              fromId,
              fromNickname: fromParticipant.nickname,
              toId,
              toNickname: toParticipant.nickname,
              amount: STEAL_AMOUNT,
              participants: session.participants,
            });

            sendJson(res, 200, {
              success: true,
              fromNickname: fromParticipant.nickname,
              toNickname: toParticipant.nickname,
              amount: STEAL_AMOUNT,
            });
          });
          return;
        }

        // 7a. Leaderboard
        if (action === 'leaderboard' && req.method === 'GET') {
          const top7 = [...session.participants]
            .sort((a, b) => b.score - a.score)
            .slice(0, 7)
            .map((p, idx) => ({
              id: p.id,
              nickname: p.nickname,
              avatar: p.avatar,
              score: p.score,
              rank: idx + 1,
              correctAnswers: p.correctAnswers || 0,
              stealCount: p.stealCount || 0,
            }));
          sendJson(res, 200, { rankings: top7 });
          return;
        }

        // 7. Reset
        if (action === 'reset' && req.method === 'POST') {
          session.phase = 'waiting';
          session.currentQuestionIndex = 0;
          session.participants = [];
          session.answers = [];
          session.isAnswerRevealed = false;

          broadcastToSession(token, {
            type: 'RESET',
            session,
          });

          sendJson(res, 200, { success: true, session });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), gameServerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    open: false,
    allowedHosts: true,
  },
});
