# HERRAMIENTAS Y ARQUITECTURA — AXEL PLAY
## Análisis Técnico Comparativo y Decisiones de Diseño

> Documento vivo. Última actualización: Noviembre 2026.
> Este documento justifica cada decisión tecnológica con comparativas reales,
> límites de planes gratuitos y estrategias de implementación.

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Frontend: React vs Alternativas](#2-frontend-react-vs-alternativas)
3. [Estilos: Tailwind CSS v4](#3-estilos-tailwind-css-v4)
4. [Backend/DB/Auth: Supabase vs Alternativas](#4-backenddbauth-supabase-vs-alternativas)
5. [Tiempo Real: Supabase Realtime Channels](#5-tiempo-real-supabase-realtime-channels)
6. [Hosting: Cloudflare Pages vs Alternativas](#6-hosting-cloudflare-pages-vs-alternativas)
7. [Stack de Librerías Seleccionadas](#7-stack-de-librerías-seleccionadas)
8. [Límites de Planes Gratuitos](#8-límites-de-planes-gratuitos)
9. [Estrategia de Escalado](#9-estrategia-de-escalado)
10. [Riesgos y Mitigaciones](#10-riesgos-y-mitigaciones)

---

## 1. RESUMEN EJECUTIVO

AXEL PLAY es una plataforma educativa gamificada tipo Kahoot/Quizizz para escuelas hispanohablantes.
Requiere:
- Modo offline parcial (escuelas con mala conectividad)
- Tiempo real (sincronización de partidas entre 30+ participantes)
- QR para unirse (sin fricción para alumnos)
- Costo $0 en producción inicial
- Despliegue sin servidor propio

**Stack elegido: React + TypeScript + Vite / Tailwind CSS v4 / Supabase / Cloudflare Pages**

Costo mensual estimado: **$0 USD** dentro de los límites gratuitos.

---

## 2. FRONTEND: REACT VS ALTERNATIVAS

### 2.1 Criterios de Evaluación

| Criterio | Peso |
|----------|------|
| Ecosistema y librerías disponibles | 30% |
| Rendimiento para tiempo real | 25% |
| Facilidad de onboarding | 20% |
| Tamaño de bundle | 15% |
| Soporte TypeScript | 10% |

### 2.2 Tabla Comparativa

| Framework | Ecosistema | Perf. RT | Onboarding | Bundle | TypeScript | Score |
|-----------|-----------|----------|------------|--------|-----------|-------|
| **React 18** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **4.25** |
| Vue 3 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 4.10 |
| Svelte 5 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 3.85 |
| Angular 17 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | 3.45 |

### 2.3 Análisis Detallado: React

**✅ Por qué React para AXEL PLAY:**

**Ecosistema crítico disponible:**
- `@supabase/supabase-js` — cliente oficial con hooks React
- `@dnd-kit/core` — drag & drop accesible para editor de preguntas
- `framer-motion` — animaciones fluidas para podio, celebraciones
- `recharts` — gráficos de estadísticas post-partida
- `react-hook-form` + `zod` — formularios de creación de juegos
- `howler.js` — efectos de sonido (funciona con React)
- `qrcode.react` — generación de QR en componente React

Svelte no tiene madurez suficiente en `dnd-kit`, Framer Motion (requiere adaptador),
ni soporte de primera clase con Supabase Auth en SSR.

**React 18 Concurrent Features para tiempo real:**
- `useTransition` para actualizaciones de ranking sin bloquear UI
- `startTransition` para diferir renders no urgentes durante carga masiva de respuestas
- Suspense boundaries para estados de carga de sesión

**Comunidad latinoamericana:**
React domina en la región con >70% de adopción en proyectos educativos y startups.
Facilita encontrar colaboradores y tutoriales en español.

### 2.4 Análisis: Vue 3 (segunda opción)

Vue 3 fue la segunda opción más seria. Sus ventajas: `<script setup>` más conciso,
Composition API elegante, mejor rendimiento de renderizado en benchmarks sintéticos.
Sin embargo, pierde en:
- `@dnd-kit` solo tiene bindings React
- Framer Motion no tiene implementación oficial Vue
- El ecosistema de juegos/gamificación es notablemente menor

### 2.5 Por qué Vite sobre Create React App / Next.js

| | CRA | Next.js | **Vite** |
|---|---|---|---|
| Dev startup | 15-30s | 3-8s | **<1s** |
| HMR | ~500ms | ~200ms | **<50ms** |
| SSR requerido | No | Sí | No |
| Bundle splitting | Básico | Avanzado | **Avanzado** |
| CF Pages compatible | ✅ | ⚠️ (Edge RT) | **✅** |

AXEL PLAY es una **SPA pura** — no necesita SSR porque:
1. No tiene SEO crítico (app detrás de auth)
2. Las páginas públicas (join con QR) son simples
3. Cloudflare Pages sirve la SPA perfectamente

Next.js añade complejidad innecesaria y sus Edge Runtime functions tienen
fricción con Supabase Auth en Cloudflare.

---

## 3. ESTILOS: TAILWIND CSS V4

### 3.1 Tailwind v4 vs v3 vs Alternativas

| | Tailwind v3 | **Tailwind v4** | UnoCSS | PandaCSS | vanilla-extract |
|---|---|---|---|---|---|
| Config | `tailwind.config.js` | CSS Variables | `uno.config.ts` | `panda.config.ts` | TypeScript |
| Build speed | Rápido | **Muy rápido** | Ultra-rápido | Lento | Medio |
| Bundle CSS | ~10KB prod | **~8KB prod** | ~5KB prod | ~15KB | ~12KB |
| Temas dinámicos | Limitado | **CSS vars nativo** | ✅ | ✅ | ✅ |
| Darkmode | `dark:` clase | **`dark:` + `@media`** | ✅ | ✅ | Manual |
| Aprendizaje | Alto | **Igual v3** | Diferente | Alto | Alto |

**¿Por qué Tailwind v4?**

1. **CSS Variables nativas**: Las animaciones de Framer Motion pueden interpolarse
   con variables CSS directamente, sin JS-in-CSS
2. **Purge automático**: v4 usa el nuevo engine Oxide (Rust) — 35% más rápido
3. **Temas de colores para gamificación**: podemos definir paletas por materia
   (matemáticas = azul, ciencias = verde) como CSS variables y cambiarlas en runtime
4. **Compatibilidad Vite**: plugin oficial `@tailwindcss/vite` — zero config

**Configuración para AXEL PLAY:**
```css
/* src/styles/global.css */
@import "tailwindcss";

@theme {
  --color-brand-primary: #6C63FF;  /* Morado principal */
  --color-brand-secondary: #FF6584; /* Rosa acento */
  --color-brand-success: #43D787;   /* Verde correcto */
  --color-brand-error: #FF4757;     /* Rojo incorrecto */
  --color-brand-gold: #FFD700;      /* Oro podio */
  
  --font-game: "Nunito Variable", system-ui;
  --animate-bounce-in: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 4. BACKEND/DB/AUTH: SUPABASE VS ALTERNATIVAS

### 4.1 Requisitos para AXEL PLAY

- **Autenticación** docentes (email/password, posiblemente Google OAuth)
- **Base de datos** relacional (juegos, preguntas, sesiones, participantes)
- **Tiempo real** para sincronizar partidas
- **Storage** para imágenes de preguntas y portadas de juegos
- **Row Level Security** para datos multi-tenant
- **SDK JavaScript** limpio para React
- **Plan gratuito** sostenible

### 4.2 Tabla Comparativa

| Criterio | **Supabase** | Firebase | Appwrite | PocketBase |
|----------|-------------|---------|---------|-----------|
| DB tipo | PostgreSQL | Firestore (NoSQL) | PostgreSQL | SQLite |
| Tiempo real | WebSockets | WebSockets | WebSockets | SSE |
| Auth | ✅ Completo | ✅ Completo | ✅ Completo | ✅ Básico |
| Storage | ✅ 50MB free | ✅ 1GB free | ✅ 2GB free | ✅ Ilimitado* |
| RLS / Seguridad | **PostgreSQL RLS** | Security Rules | Roles+Perms | Roles |
| SQL nativo | ✅ | ❌ | ✅ | ✅ |
| SDK React | ✅ Excelente | ✅ Excelente | ✅ Bueno | ✅ Básico |
| Self-hosted | ✅ | ❌ | ✅ | ✅ |
| Migrations | ✅ | ❌ | ✅ | ✅ |
| Functions | Edge Functions | Cloud Functions | Functions | ❌ |
| Plan gratuito DB | **500MB** | 1GB | 2GB free | Ilimitado* |
| MAU gratuito | **50,000** | 10,000 | Ilimitado | Ilimitado |
| Precio pro | $25/mes | Pay-per-use | $15/mes | Self-hosted |

*PocketBase: requiere servidor propio (VPS ~$5/mes)

### 4.3 Por qué Supabase sobre Firebase

**Firebase problemas para AXEL PLAY:**
1. **Firestore es NoSQL**: Las relaciones `juego → preguntas → sesión → participantes → respuestas`
   son naturalmente relacionales. En Firestore requieren desnormalización o subcolecciones
   anidadas que complican las consultas de estadísticas post-partida
2. **Sin SQL**: Los reportes (top preguntas falladas, distribución de scores) requieren
   JOINs complejos. En Firestore son múltiples queries + JS en el cliente
3. **Vendor lock-in fuerte**: Migrar de Firebase es costoso. Supabase es PostgreSQL estándar
4. **MAU límite**: Firebase limita a 10,000 MAU en el tier Spark gratuito — Supabase ofrece 50,000
5. **Costo en escala**: Firebase puede dispararse inesperadamente con reads/writes masivos
   durante partidas. Supabase tiene precios predecibles

**Supabase ventajas específicas:**
1. **PostgreSQL RLS** — seguridad a nivel de fila nativa y auditable con SQL
2. **Supabase Realtime Channels** — WebSockets basados en PostgreSQL LISTEN/NOTIFY
3. **`supabase-js` SDK** con TypeScript generado automáticamente desde el schema
4. **Dashboard SQL** — se pueden hacer consultas ad-hoc directamente
5. **Migrations** con CLI — control de versiones del schema

### 4.4 Por qué Supabase sobre PocketBase

PocketBase es excelente para proyectos pequeños, pero:
- Requiere VPS propio (~$5/mes) — rompe el requisito de $0
- SQLite no escala bien con múltiples writers concurrentes (partidas simultáneas)
- Realtime es Server-Sent Events, no WebSockets bidireccionales — latencia mayor
- Ecosystem de librerías y ejemplos mucho menor

### 4.5 Por qué Supabase sobre Appwrite

Appwrite tiene más storage gratuito, pero:
- PostgreSQL con RLS de Supabase es más maduro
- SDK `supabase-js` tiene mejor integración con React
- Supabase tiene más documentación y ejemplos de tiempo real en juegos
- Auth de Supabase soporta más providers OAuth (importante para futuro)

---

## 5. TIEMPO REAL: SUPABASE REALTIME CHANNELS

### 5.1 Arquitectura de Tiempo Real

Supabase Realtime usa **PostgreSQL LISTEN/NOTIFY** bajo el hood,
expuesto como WebSockets con el protocolo Phoenix Channels.

**Tipos de mensajes en tiempo real:**

```
Broadcast    — mensajes efímeros cliente→servidor→clientes (sin persistir en DB)
Presence     — rastrear usuarios conectados en un canal
Postgres CDC — cambios en tablas via logical replication (INSERT/UPDATE/DELETE)
```

### 5.2 Canales para AXEL PLAY

**Canal de Sesión** (`session:{qr_token}`)
```typescript
// Docente crea canal
const sessionChannel = supabase.channel(`session:${qrToken}`)

// Broadcast: pregunta activa
sessionChannel.send({
  type: 'broadcast',
  event: 'question:start',
  payload: { question_id, time_limit, index }
})

// Presence: participantes conectados
sessionChannel.on('presence', { event: 'sync' }, () => {
  const state = sessionChannel.presenceState()
  updateConnectedParticipants(state)
})

// Postgres CDC: nueva respuesta guardada
sessionChannel.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'answers',
  filter: `session_id=eq.${sessionId}`
}, (payload) => {
  updateLeaderboard(payload.new)
})
```

### 5.3 Estrategia de Canales por Rol

```
┌─────────────────────────────────────────────┐
│  DOCENTE (Teacher Dashboard)                 │
│                                             │
│  Canal: session:{token}                     │
│  - Recibe: join events, respuestas          │
│  - Envía: question:start, question:end      │
│             show:results, game:end          │
└─────────────────────────────────────────────┘
                    │ WebSocket
                    ▼
        ┌───────────────────────┐
        │  Supabase Realtime    │
        │  (Phoenix Channels)   │
        └───────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│  PARTICIPANTE (Student View)                 │
│                                             │
│  Canal: session:{token}                     │
│  - Recibe: question:start, scores, events   │
│  - Envía: answer (→ HTTP, no broadcast)     │
│  - Presence: nickname + avatar              │
└─────────────────────────────────────────────┘
```

### 5.4 Validación Server-Side de Respuestas

Las respuestas NO se envían por Broadcast (inseguro) — se envían por **HTTP POST**
a una Supabase Edge Function que:
1. Verifica el token de sesión
2. Verifica que la pregunta esté activa
3. Verifica que el participante no haya respondido ya
4. Calcula puntos según tiempo de respuesta
5. Inserta en `answers` → dispara CDC → actualiza leaderboard

```typescript
// supabase/functions/submit-answer/index.ts
Deno.serve(async (req) => {
  const { session_id, participant_id, question_id, answer } = await req.json()
  
  // Validación + inserción atómica con PostgreSQL transaction
  const { data, error } = await supabase.rpc('submit_answer', {
    p_session_id: session_id,
    p_participant_id: participant_id,
    p_question_id: question_id,
    p_answer: answer,
    p_answered_at: new Date().toISOString()
  })
  
  return Response.json(data)
})
```

---

## 6. HOSTING: CLOUDFLARE PAGES VS ALTERNATIVAS

### 6.1 Tabla Comparativa

| | **Cloudflare Pages** | Vercel | Netlify | GitHub Pages |
|---|---|---|---|---|
| Requests/mes | **Ilimitados** | 100GB bandwidth | 100GB bandwidth | Ilimitado* |
| Builds/mes | **500** | 100 (hobby) | 300 | Ilimitado |
| Functions | Workers (gratuito) | Serverless (limitado) | Edge Functions | ❌ |
| CDN | 200+ PoP global | ~30 regiones | ~30 regiones | GitHub CDN |
| Cache | **Automático global** | ✅ | ✅ | Básico |
| Dominio custom | ✅ SSL auto | ✅ SSL auto | ✅ SSL auto | ✅ SSL auto |
| Preview deploys | ✅ | ✅ | ✅ | ❌ |
| Analytics | ✅ (básico) | ✅ (limitado) | ✅ (limitado) | ❌ |
| SPA redirect | ✅ (_redirects) | ✅ | ✅ | ❌ (workaround) |
| Tiempo build | ~45s | ~30s | ~45s | ~2m |

### 6.2 Por qué Cloudflare Pages sobre Vercel

**Vercel limitaciones críticas:**
- 100GB bandwidth en Hobby — si AXEL PLAY tiene imágenes/assets grandes puede superarse
- Las functions en Vercel Hobby tienen 10s timeout — Edge Functions de Cloudflare tienen más flexibilidad
- Sin requests ilimitados de verdad

**Cloudflare Pages ventajas:**
1. **Requests ilimitados** — crítico para eventos escolares donde 300 alumnos se conectan simultáneamente
2. **CDN más grande del mundo** (200+ PoPs) — latencia mínima en toda Latinoamérica
3. **Workers gratuitos** — 100,000 requests/día en plan gratuito para edge functions
4. **_redirects SPA**: soporte nativo para enrutar todas las rutas a `index.html`

```
# public/_redirects
/*    /index.html   200
```

### 6.3 Configuración CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: axel-play
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

---

## 7. STACK DE LIBRERÍAS SELECCIONADAS

### 7.1 Justificaciones Detalladas

#### Estado Global: Zustand vs Redux vs Jotai

| | **Zustand** | Redux Toolkit | Jotai | Recoil |
|---|---|---|---|---|
| Bundle | ~1KB | ~15KB | ~4KB | ~22KB |
| Boilerplate | Mínimo | Medio | Mínimo | Mínimo |
| DevTools | ✅ Redux DevTools | ✅ Nativo | ✅ | ✅ |
| Async | Middleware | Thunk/Saga | Atoms | Atoms |
| Curva aprendizaje | Baja | Alta | Baja | Media |

Zustand gana por tamaño mínimo, cero boilerplate y suficiente poder para
el estado de AXEL PLAY (sesión activa, participantes, pregunta actual, leaderboard).

#### Animaciones: Framer Motion vs GSAP vs CSS Animation

| | **Framer Motion** | GSAP | CSS Animations | React Spring |
|---|---|---|---|---|
| Integración React | Nativa | Manual | Manual | Nativa |
| Layout animations | ✅ `AnimatePresence` | Manual | ❌ | Limitado |
| Gesture support | ✅ | Manual | ❌ | Parcial |
| Bundle | ~35KB | ~65KB (core) | 0 | ~25KB |
| Licencia | MIT | Pago (pro) | N/A | MIT |
| Podio animado | ✅ Simple | ✅ | Complejo | ✅ |

Framer Motion es la opción natural para React con las animaciones de gamificación que necesitamos:
podio con rebote, entrada de participantes, celebración de respuesta correcta, transición entre preguntas.

#### QR: qrcode.react vs react-qr-code vs qr.js

`qrcode.react` es el estándar de facto — mantiene actualizaciones constantes,
soporta SVG y Canvas output, es MIT, y tiene 2M descargas semanales.
El QR se generará en el cliente (sin server needed) con el token de sesión.

#### Gráficos: Recharts vs Chart.js vs Nivo vs Victory

Recharts es la elección obvia para React:
- Componentes declarativos nativos de React
- D3 bajo el hood (potente)
- Bundle ~75KB (aceptable para una app de estadísticas)
- MIT license
- Suficiente para: bar charts de respuestas, line charts de progreso, pie charts de distribución

#### Audio: Howler.js

Para los efectos de sonido de gamificación (respuesta correcta, error, cuenta regresiva, podio):
- Cross-browser compatible
- Web Audio API + HTML5 Audio fallback
- Sprites de audio (un archivo, múltiples efectos)
- MIT license
- Solo ~10KB gzip

#### Drag & Drop: @dnd-kit/core

Para el editor de preguntas (reordenar preguntas, opciones):
- **Accesibilidad** — el único DnD con soporte ARIA completo
- Touch support nativo (tabletas de alumnos)
- Sortable, Droppable, Draggable como primitivos
- MIT license, ~30KB

---

## 8. LÍMITES DE PLANES GRATUITOS

### 8.1 Supabase Free Plan (actualizado 2024)

| Recurso | Límite | Nota |
|---------|--------|------|
| Proyectos activos | 2 | Suficiente |
| Base de datos | **500MB** | PostgreSQL |
| Storage | **1GB** | Imágenes preguntas |
| Bandwidth | **5GB/mes** | Datos transferidos |
| MAU | **50,000** | Monthly Active Users |
| Auth users | Ilimitado | Registros en tabla auth |
| Edge Functions | **500,000 invocaciones/mes** | |
| Realtime conexiones | **200 concurrentes** | Por proyecto |
| Realtime mensajes | **2M mensajes/mes** | |
| Database backups | 7 días | |
| Pausa por inactividad | **Sí, 1 semana** | ⚠️ Ver nota |
| API requests | Ilimitado | |
| Row limits | Sin límite | Solo DB size |

**⚠️ IMPORTANTE: Pausa por inactividad**
Supabase pausa proyectos gratuitos que no tienen actividad por 7 días.
**Mitigación**: Configurar un cron job gratuito (Vercel Cron o GitHub Actions)
que haga ping a la DB cada 3 días.

```yaml
# .github/workflows/keep-alive.yml
name: Keep Supabase Alive
on:
  schedule:
    - cron: '0 12 */3 * *'  # Cada 3 días al mediodía
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping Supabase
        run: |
          curl -X GET "${{ secrets.VITE_SUPABASE_URL }}/rest/v1/profiles?select=id&limit=1" \
            -H "apikey: ${{ secrets.VITE_SUPABASE_ANON_KEY }}"
```

**Estimación de uso para AXEL PLAY:**
- 100 docentes activos × 10 sesiones/mes × 30 alumnos = 30,000 eventos de respuesta/mes
- Storage: ~500 imágenes × 200KB = 100MB (bien dentro del límite de 1GB)
- Realtime: pico de 30 conexiones simultáneas por sesión — bien dentro de 200 concurrentes
- MAU: con 100 docentes y 3000 alumnos únicos = 3,100 MAU — muy lejos del límite

### 8.2 Cloudflare Pages Free Plan

| Recurso | Límite | Nota |
|---------|--------|------|
| Builds/mes | **500** | Con Git, branch deploys |
| Requests | **Ilimitados** | ✅ Sin restricción |
| Bandwidth | **Ilimitada** | ✅ Sin restricción |
| Dominio custom | Ilimitados | SSL automático |
| Preview deploys | Ilimitados | Por PR/branch |
| Workers (functions) | 100,000 req/día | |
| Worker CPU | 10ms por request | |
| KV storage | 100,000 reads/día | |
| Colaboradores | Ilimitados | |
| Analytics | Básico | 7 días retención |

**Estimación builds:**
- Deploy en cada commit a main: ~5-10 deploys/día de desarrollo = ~150-300/mes
- Muy dentro del límite de 500.

---

## 9. ESTRATEGIA DE ESCALADO

Si AXEL PLAY crece más allá del plan gratuito:

### Supabase Pro ($25/mes)
- 8GB DB, 100GB storage, 250GB bandwidth
- Sin pausa por inactividad
- 200,000 MAU

### Cloudflare Pages Pro ($20/mes)
- 5,000 builds/mes
- Workers ilimitados
- Analytics avanzado

### A largo plazo
- Edge Functions de Supabase para validación de respuestas (ya preparado)
- Supabase PgBouncer para connection pooling en picos de partidas masivas
- Cloudflare R2 para storage de imágenes (alternativa más barata a Supabase Storage)

---

## 10. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Supabase pausa por inactividad | Media | Alto | Cron keep-alive |
| Realtime congestionado (>200 conexiones) | Baja | Medio | Queue de respuestas + HTTP POST |
| Storage superado (imágenes) | Baja | Bajo | Compresión client-side antes de upload |
| Build limit Cloudflare superado | Muy baja | Bajo | Feature flags para evitar commits triviales |
| Supabase down | Muy baja | Alto | Circuit breaker + modo offline parcial |
| Coste inesperado | Muy baja | Alto | Alertas de uso en dashboard Supabase |

### 10.1 Plan de Contingencia: Supabase Down

```typescript
// src/lib/supabase.ts
export const withFallback = async <T>(
  fn: () => Promise<T>,
  fallback: T
): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    console.error('Supabase error, using fallback:', error)
    return fallback
  }
}
```

Para sesiones activas: los participantes guardan respuestas en localStorage
y sincronizan cuando se reconecta.

---

*Documento generado por el equipo de arquitectura de AXEL PLAY.*
*Revisión cada 3 meses o ante cambios de pricing en las plataformas.*
