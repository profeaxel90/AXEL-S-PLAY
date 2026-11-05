# ARQUITECTURA TÉCNICA — AXEL PLAY
## Diseño del Sistema, Diagramas y Patrones

---

## TABLA DE CONTENIDOS

1. [Visión General](#1-visión-general)
2. [Arquitectura de Alto Nivel](#2-arquitectura-de-alto-nivel)
3. [Flujo de una Partida](#3-flujo-de-una-partida)
4. [Arquitectura Frontend](#4-arquitectura-frontend)
5. [Arquitectura Backend](#5-arquitectura-backend)
6. [Arquitectura de Tiempo Real](#6-arquitectura-de-tiempo-real)
7. [Estructura de Carpetas Detallada](#7-estructura-de-carpetas-detallada)
8. [Patrones de Diseño](#8-patrones-de-diseño)
9. [Gestión de Estado](#9-gestión-de-estado)
10. [Sistema de Rutas](#10-sistema-de-rutas)

---

## 1. VISIÓN GENERAL

AXEL PLAY es una **Single Page Application (SPA)** que opera en tres contextos simultáneos:

```
┌──────────────────────────────────────────────────────────────┐
│                    CONTEXTOS DE USO                          │
│                                                              │
│  👨‍🏫 DOCENTE              📱 ALUMNO              📺 PANTALLA  │
│  (Laptop/Tablet)      (Smartphone)          (Proyector)     │
│                                                              │
│  - Crear juegos       - Escanear QR         - Vista podio   │
│  - Iniciar sesión     - Responder           - Countdown      │
│  - Ver stats           - Ver ranking        - Resultados     │
└──────────────────────────────────────────────────────────────┘
```

**Principios de arquitectura:**
1. **Offline-first parcial** — localStorage persiste estado de sesión activa
2. **Security by default** — RLS en Supabase, validación server-side de respuestas
3. **Mobile-first** — la vista de alumno se diseña primero para móvil
4. **Zero-backend-ops** — todo el backend es gestionado (Supabase + Cloudflare)

---

## 2. ARQUITECTURA DE ALTO NIVEL

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                            │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │              React SPA (Vite + TypeScript)                  │   │
│   │                                                             │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │   │
│   │  │  Pages   │  │ Zustand  │  │  Hooks   │  │Components │  │   │
│   │  │ /dashboard│  │  Stores  │  │useSession│  │QuestionCard│  │   │
│   │  │ /play     │  │authStore │  │useRealtime│  │Leaderboard│  │   │
│   │  │ /join     │  │gameStore │  │useGame   │  │Timer       │  │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │   │
│   │                                                             │   │
│   │  ┌──────────────────────────────────────────────────────┐  │   │
│   │  │              Supabase Client (supabase-js)           │  │   │
│   │  │  Auth  │  Database (PostgREST)  │  Realtime  │ Storage│  │   │
│   │  └──────────────────────────────────────────────────────┘  │   │
│   └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
           │                │                    │
           │ HTTPS          │ WebSocket           │ HTTPS
           │                │                    │
           ▼                ▼                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (BaaS)                                 │
│                                                                      │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────────────┐  │
│  │  Supabase     │  │  PostgreSQL    │  │  Supabase Realtime     │  │
│  │  Auth         │  │  + PostgREST   │  │  (Phoenix Channels)    │  │
│  │               │  │                │  │                        │  │
│  │  - JWT tokens │  │  - 11 tablas   │  │  - Broadcast           │  │
│  │  - Email auth │  │  - RLS policies│  │  - Presence            │  │
│  │  - Sessions   │  │  - Functions   │  │  - Postgres CDC        │  │
│  └───────────────┘  └────────────────┘  └────────────────────────┘  │
│                                                                      │
│  ┌───────────────┐  ┌────────────────┐                              │
│  │  Supabase     │  │  Edge          │                              │
│  │  Storage      │  │  Functions     │                              │
│  │               │  │  (Deno)        │                              │
│  │  - Imágenes   │  │  - submit-answer│                             │
│  │  - Audios     │  │  - validate-qr │                             │
│  └───────────────┘  └────────────────┘                              │
└──────────────────────────────────────────────────────────────────────┘
           │
           │ Git push → CI/CD
           ▼
┌──────────────────────────────┐
│     Cloudflare Pages         │
│                              │
│  - CDN global (200+ PoPs)   │
│  - Assets estáticos          │
│  - SPA redirect (_redirects) │
│  - SSL automático            │
└──────────────────────────────┘
```

---

## 3. FLUJO DE UNA PARTIDA

### 3.1 Fase de Setup (Docente)

```
Docente                 Frontend              Supabase DB           Realtime
   │                       │                      │                    │
   │── Clic "Iniciar" ────►│                      │                    │
   │                       │── INSERT sessions ──►│                    │
   │                       │                      │── genera qr_token  │
   │                       │◄── session.id ───────│                    │
   │                       │                      │                    │
   │                       │── subscribe channel ──────────────────────►│
   │                       │   `session:{qr_token}`                    │
   │                       │                                           │
   │◄── Muestra QR ────────│                                           │
   │    + PIN 6 dígitos    │                                           │
```

### 3.2 Fase de Join (Alumno)

```
Alumno                  Frontend              Supabase DB           Realtime
   │                       │                      │                    │
   │── Escanea QR ─────────► (navega a /join/{token})                  │
   │── Ingresa apodo ──────►│                      │                    │
   │                       │── validate token ───►│                    │
   │                       │◄── session activa ───│                    │
   │                       │── INSERT participant►│                    │
   │                       │── join channel ────────────────────────────►│
   │                       │── send presence ───────────────────────────►│
   │◄── Sala de espera ────│                      │                    │
   │                       │                      │              ┌─────▼──────┐
   │                       │                      │              │ Docente ve  │
   │                       │                      │              │ +1 jugador  │
   │                       │                      │              └────────────┘
```

### 3.3 Fase de Juego (Pregunta activa)

```
Docente                 Frontend (D)           Realtime            Frontend (A)         Alumno
   │                       │                      │                    │                   │
   │── Clic "Siguiente" ──►│                      │                    │                   │
   │                       │── broadcast ──────────►                   │                   │
   │                       │   question:start      │──────────────────►│                   │
   │                       │   {question_id, idx}  │                   │◄── Ve pregunta ───│
   │                       │                       │                   │                   │
   │◄── Ve countdown ──────│                       │                   │── Ve opciones A/B/C/D
   │                       │                       │                   │                   │
   │                       │                       │                   │                   │── Toca respuesta
   │                       │                       │                   │── HTTP POST ──────►│
   │                       │                       │                   │   /functions/      │
   │                       │                       │                   │   submit-answer    │
   │                       │                       │                   │                   │
   │                       │     ◄──────────────── CDC INSERT answers  │                   │
   │◄── Ranking actualiza ─│                       │                   │                   │
   │   (barra progreso)    │                       │◄─── Respuesta OK ─│                   │
   │                       │                       │                   │◄── Correcto! +350 pts
```

### 3.4 Fase de Resultados

```
Docente                 Frontend               Supabase DB
   │                       │                      │
   │── Clic "Terminar" ────►│                      │
   │                       │── UPDATE sessions ───►│ status='completed'
   │                       │── broadcast ──────────►── game:end (Realtime)
   │                       │                      │
   │                       │── SELECT stats ──────►│ (JOIN answers + participants)
   │                       │◄── Resultados ────────│
   │◄── Podio animado ─────│                      │
   │   + Estadísticas      │                      │
```

---

## 4. ARQUITECTURA FRONTEND

### 4.1 Capas de la Aplicación

```
┌────────────────────────────────────────────────────┐
│                  PÁGINAS (Pages/)                  │
│   Componentes de vista completa, orquestan todo    │
│   Ejemplos: DashboardPage, PlayPage, JoinPage      │
└────────────────────┬───────────────────────────────┘
                     │ usa
┌────────────────────▼───────────────────────────────┐
│                COMPONENTES (Components/)            │
│   UI reutilizable: QuestionCard, Leaderboard,      │
│   Timer, AvatarPicker, QRDisplay, PodiumAnimation  │
└────────────────────┬───────────────────────────────┘
                     │ usa
┌────────────────────▼───────────────────────────────┐
│                 HOOKS (Hooks/)                     │
│   Lógica con estado: useSession, useRealtime,      │
│   useGame, useTimer, useLeaderboard, useAuth       │
└────────────────────┬───────────────────────────────┘
                     │ usa / actualiza
┌────────────────────▼───────────────────────────────┐
│                  STORES (Stores/)                  │
│   Estado global Zustand: authStore, gameStore,     │
│   sessionStore, participantsStore                  │
└────────────────────┬───────────────────────────────┘
                     │ llama
┌────────────────────▼───────────────────────────────┐
│                   LIB (lib/)                       │
│   supabase.ts, audio.ts, qr.ts, export.ts          │
└────────────────────────────────────────────────────┘
```

### 4.2 Árbol de Componentes Principal

```
<App>
├── <AuthProvider>          (contexto de autenticación)
│   ├── <Router>
│   │   ├── /                → <LandingPage>
│   │   ├── /login           → <LoginPage>
│   │   ├── /register        → <RegisterPage>
│   │   ├── /dashboard       → <DashboardLayout>
│   │   │   ├── /            → <DashboardHome>
│   │   │   ├── /games       → <GamesListPage>
│   │   │   ├── /games/new   → <GameEditorPage>
│   │   │   ├── /games/:id   → <GameEditorPage>
│   │   │   ├── /bank        → <QuestionBankPage>
│   │   │   └── /stats       → <StatsPage>
│   │   ├── /play/:sessionId → <TeacherPlayPage>
│   │   │   ├── <QRDisplay>
│   │   │   ├── <ParticipantsList>
│   │   │   ├── <QuestionControl>
│   │   │   ├── <LiveLeaderboard>
│   │   │   └── <PodiumAnimation>
│   │   ├── /join/:token     → <StudentJoinPage>
│   │   │   ├── <NicknameForm>
│   │   │   ├── <AvatarPicker>
│   │   │   └── <WaitingRoom>
│   │   └── /play/student/:sessionId → <StudentPlayPage>
│   │       ├── <QuestionView>
│   │       ├── <AnswerButtons>
│   │       ├── <FeedbackOverlay>
│   │       └── <MiniLeaderboard>
│   └── <Toaster>           (notificaciones)
```

---

## 5. ARQUITECTURA BACKEND

### 5.1 Supabase como Backend Completo

Supabase expone PostgreSQL directamente via **PostgREST** — un servidor REST
automático generado desde el schema de la DB.

```
Cliente React          PostgREST              PostgreSQL
    │                      │                      │
    │ GET /games           │                      │
    │ Authorization: Bearer│                      │
    │   {JWT}              │                      │
    │──────────────────────►                      │
    │                      │ SELECT * FROM games  │
    │                      │ WHERE auth.uid() =   │
    │                      │   teacher_id         │  ← RLS automático
    │                      │──────────────────────►│
    │                      │◄── [games data] ──────│
    │◄── [{game objects}] ─│                      │
```

### 5.2 Edge Functions (Deno)

Para lógica que NO puede estar en el cliente:

**`/functions/submit-answer`** — Valida y registra respuestas
```
1. Verifica JWT del participante (anon key con session token)
2. Verifica que la sesión esté en estado 'active'
3. Verifica que la pregunta esté activa en esa sesión
4. Verifica que el participante NO haya respondido ya
5. Calcula puntos según tiempo (1000 pts base - degradación lineal)
6. INSERT en answers (transacción atómica)
7. Retorna { is_correct, points_earned, position }
```

**`/functions/validate-qr`** — Valida que un token QR sea válido
```
1. Busca en sessions WHERE qr_token = $token
2. Verifica que status = 'lobby'
3. Verifica que qr_expires_at > NOW()
4. Retorna { session_id, game_title, participant_count }
```

### 5.3 Cálculo de Puntos

```
puntos_base = 1000
tiempo_total = time_limit  (en segundos, configurado por docente)
tiempo_tomado = answered_at - question_started_at

if (is_correct):
    ratio = 1 - (tiempo_tomado / tiempo_total) * 0.5
    puntos = floor(puntos_base * ratio)
    # Mínimo 500 pts si respondió correctamente
    puntos = max(500, puntos)
else:
    puntos = 0

# Bonus por racha
if (racha >= 5):   puntos += 100  # "En fuego!"
if (racha >= 10):  puntos += 200  # "Imparable!"
```

---

## 6. ARQUITECTURA DE TIEMPO REAL

### 6.1 Canales y Eventos

```
CANAL: session:{qr_token}
│
├── BROADCAST (efímero, no persiste)
│   ├── question:start   → { question_id, index, total, time_limit }
│   ├── question:end     → { question_id, correct_answer, stats }
│   ├── show:podium      → { top3: [{nickname, score, avatar}] }
│   └── game:end         → { }
│
├── PRESENCE (quién está conectado)
│   └── { nickname, avatar, role: 'teacher'|'student' }
│
└── POSTGRES CHANGES (persistido en DB)
    ├── answers INSERT   → actualiza leaderboard en docente
    └── participants INSERT → docente ve nuevos jugadores
```

### 6.2 Gestión de Reconexión

```typescript
// src/hooks/useRealtime.ts
export function useRealtime(sessionId: string) {
  const channel = useRef<RealtimeChannel | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  
  const setupChannel = useCallback(() => {
    channel.current = supabase
      .channel(`session:${sessionId}`)
      .on('system', {}, (status) => {
        if (status === 'SUBSCRIBED') setIsConnected(true)
        if (status === 'CLOSED') {
          setIsConnected(false)
          // Reconectar con backoff exponencial
          setTimeout(setupChannel, Math.min(retryCount * 1000, 30000))
        }
      })
      .subscribe()
  }, [sessionId])
  
  // Cleanup al desmontar
  useEffect(() => {
    setupChannel()
    return () => { channel.current?.unsubscribe() }
  }, [setupChannel])
}
```

---

## 7. ESTRUCTURA DE CARPETAS DETALLADA

```
src/
├── components/
│   ├── ui/                          # Design System
│   │   ├── Button.tsx               # Primary, Secondary, Danger, Ghost variants
│   │   ├── Card.tsx                 # Con hover, shadow variants
│   │   ├── Input.tsx                # Con label, error, helper text
│   │   ├── Modal.tsx                # Con AnimatePresence de Framer Motion
│   │   ├── Badge.tsx                # Para dificultad, materia, estado
│   │   ├── Spinner.tsx              # Loading states
│   │   ├── Toast.tsx                # Notificaciones
│   │   ├── Progress.tsx             # Barra de tiempo
│   │   └── Avatar.tsx               # Con DiceBear
│   │
│   ├── game/                        # Componentes de partida
│   │   ├── QuestionCard.tsx         # Muestra pregunta con imagen/audio
│   │   ├── AnswerOptions.tsx        # Opciones A/B/C/D con colores
│   │   ├── Timer.tsx                # Cuenta regresiva circular
│   │   ├── Leaderboard.tsx          # Ranking en tiempo real
│   │   ├── MiniLeaderboard.tsx      # Versión compacta para alumnos
│   │   ├── PodiumAnimation.tsx      # Animación top 3 con Framer Motion
│   │   ├── FeedbackOverlay.tsx      # Correcto/Incorrecto con animación
│   │   ├── QRDisplay.tsx            # QR + PIN para proyector
│   │   ├── ParticipantGrid.tsx      # Grid de jugadores en lobby
│   │   └── GameStats.tsx            # Gráficos post-partida
│   │
│   ├── editor/                      # Editor de juegos
│   │   ├── GameForm.tsx             # Formulario de metadatos del juego
│   │   ├── QuestionList.tsx         # Lista drag & drop de preguntas
│   │   ├── QuestionEditor.tsx       # Editor individual de pregunta
│   │   ├── OptionEditor.tsx         # Editar opciones de respuesta
│   │   └── ImageUploader.tsx        # Upload a Supabase Storage
│   │
│   └── layout/
│       ├── DashboardLayout.tsx      # Sidebar + Header para docente
│       ├── GameLayout.tsx           # Full-screen para partidas
│       └── StudentLayout.tsx        # Layout móvil para alumnos
│
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── dashboard/
│   │   ├── DashboardHome.tsx        # Overview con métricas
│   │   ├── GamesListPage.tsx        # Biblioteca de juegos
│   │   ├── GameEditorPage.tsx       # Crear/Editar juego
│   │   ├── QuestionBankPage.tsx     # Banco de preguntas
│   │   └── ProfilePage.tsx
│   ├── play/
│   │   ├── TeacherPlayPage.tsx      # Control de partida docente
│   │   └── ResultsPage.tsx          # Resultados con exportación
│   └── join/
│       ├── JoinPage.tsx             # Escanear QR / ingresar PIN
│       └── StudentPlayPage.tsx      # Vista alumno durante partida
│
├── hooks/
│   ├── useAuth.ts                   # Autenticación y sesión usuario
│   ├── useGame.ts                   # CRUD de juegos
│   ├── useSession.ts                # Gestión de sesión de partida
│   ├── useRealtime.ts               # Conexión WebSocket
│   ├── useLeaderboard.ts            # Ranking reactivo
│   ├── useTimer.ts                  # Cuenta regresiva
│   ├── useAudio.ts                  # Efectos de sonido con Howler
│   └── useExport.ts                 # Exportar Excel/PDF
│
├── stores/
│   ├── authStore.ts                 # user, profile, isAuthenticated
│   ├── gameStore.ts                 # games[], currentGame
│   ├── sessionStore.ts              # session, currentQuestion, participants
│   └── uiStore.ts                   # modals, toasts, theme
│
├── lib/
│   ├── supabase.ts                  # Cliente Supabase inicializado
│   ├── audio.ts                     # Howler.js sprites config
│   └── export.ts                    # xlsx y jspdf helpers
│
├── types/
│   ├── database.ts                  # Tipos generados de Supabase
│   ├── game.ts                      # Game, Question, Option
│   ├── session.ts                   # Session, Participant, Answer
│   └── events.ts                    # Tipos de eventos Realtime
│
└── utils/
    ├── score.ts                     # calculatePoints, calculateRank
    ├── qr.ts                        # generateToken, buildJoinUrl
    ├── format.ts                    # formatTime, formatScore
    └── validators.ts                # Zod schemas reutilizables
```

---

## 8. PATRONES DE DISEÑO

### 8.1 Compound Components (para QuestionCard)

```typescript
// Uso:
<QuestionCard>
  <QuestionCard.Content question={question} />
  <QuestionCard.Timer timeLimit={30} onExpire={handleExpire} />
  <QuestionCard.Options options={options} onSelect={handleAnswer} />
</QuestionCard>
```

### 8.2 Custom Hook Pattern (para lógica compleja)

```typescript
// src/hooks/useSession.ts
export function useSession(sessionId: string) {
  const { data: session } = useQuery(['session', sessionId], fetchSession)
  const channel = useRealtime(sessionId)
  const { mutate: advanceQuestion } = useMutation(nextQuestion)
  const leaderboard = useLeaderboard(sessionId)
  
  return { session, channel, advanceQuestion, leaderboard }
}
```

### 8.3 Store Slices (Zustand)

```typescript
// src/stores/sessionStore.ts
interface SessionStore {
  // State
  session: Session | null
  currentQuestion: Question | null
  participants: Participant[]
  questionIndex: number
  phase: 'lobby' | 'question' | 'results' | 'podium'
  
  // Actions
  setSession: (session: Session) => void
  setCurrentQuestion: (question: Question) => void
  addParticipant: (participant: Participant) => void
  advancePhase: () => void
  resetSession: () => void
}
```

---

## 9. GESTIÓN DE ESTADO

### 9.1 Qué va en cada capa

| Dato | Ubicación | Motivo |
|------|-----------|--------|
| Token JWT | Supabase Auth (localStorage) | Gestionado por SDK |
| Perfil usuario | authStore (Zustand) | Global, raramente cambia |
| Lista de juegos | React Query / local | Cache con revalidación |
| Sesión activa | sessionStore (Zustand) | Actualizado por Realtime |
| Participantes | sessionStore (Zustand) | Actualizado por Presence |
| Pregunta actual | sessionStore (Zustand) | Actualizado por Broadcast |
| Estado UI (modals) | uiStore (Zustand) | Local, no persistido |
| Form state | React Hook Form | Local al componente |

### 9.2 Flujo de Datos Unidireccional

```
  Supabase Realtime
        │
        │ onBroadcast / onPresence / onPostgresChanges
        ▼
   Custom Hooks (useRealtime, useSession)
        │
        │ dispatch / set
        ▼
   Zustand Stores (sessionStore, participantsStore)
        │
        │ useStore(selector)
        ▼
   Componentes React (rerenden)
```

---

## 10. SISTEMA DE RUTAS

```typescript
// src/App.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: 'games', element: <GamesListPage /> },
      { path: 'games/new', element: <GameEditorPage /> },
      { path: 'games/:gameId', element: <GameEditorPage /> },
      { path: 'bank', element: <QuestionBankPage /> },
    ],
  },
  {
    path: '/play/:sessionId',
    element: <ProtectedRoute><TeacherPlayPage /></ProtectedRoute>,
  },
  {
    path: '/results/:sessionId',
    element: <ProtectedRoute><ResultsPage /></ProtectedRoute>,
  },
  {
    path: '/join/:token',
    element: <JoinPage />,           // Público — alumnos
  },
  {
    path: '/game/:sessionId',
    element: <StudentPlayPage />,    // Público — alumnos en partida
  },
])
```

**Protección de rutas:**
- `/dashboard/**` y `/play/**` requieren auth (docente con JWT)
- `/join/**` y `/game/**` son públicos pero validan el token de sesión

---

*Documento actualizado: Noviembre 2026*
