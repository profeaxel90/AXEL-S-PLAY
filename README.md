# 🎮 AXEL PLAY

> **Plataforma educativa gamificada para el aula hispanohablante**
> Live quizzes · QR instant-join · Estadísticas en tiempo real · 100% gratuito

[![Deploy Status](https://img.shields.io/badge/deploy-Cloudflare%20Pages-orange)](https://axel-play.pages.dev)
[![Supabase](https://img.shields.io/badge/backend-Supabase-green)](https://supabase.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)

---

## ¿Qué es AXEL PLAY?

AXEL PLAY es una plataforma web educativa gamificada, diseñada especialmente para
docentes hispanohablantes que quieren hacer sus clases más interactivas y divertidas.

Inspirada en herramientas como **Kahoot** y **Quizizz**, AXEL PLAY añade:

- 🌐 **Interfaz completamente en español**
- 📱 **Unirse via QR** — sin apps, sin cuentas de alumnos
- 🏆 **Gamificación profunda** — podios, logros, racha de respuestas
- 📊 **Estadísticas pedagógicas** — qué preguntas falló el grupo, distribución de respuestas
- 🎵 **Efectos de sonido y animaciones** — experiencia inmersiva
- 💾 **Banco de preguntas** — reutiliza preguntas entre juegos
- 👥 **Modo equipos** — colaboración entre alumnos
- 📤 **Exportación** a Excel y PDF para actas

---

## 🚀 Demo Rápida

1. El docente **crea un juego** con preguntas de opción múltiple, verdadero/falso, etc.
2. **Inicia una sesión** → la app genera un código QR + PIN de 6 dígitos
3. Los alumnos **escanean el QR** con la cámara del teléfono → ingresan su apodo → listo
4. El docente **controla el ritmo** — avanza pregunta a pregunta
5. Los alumnos **responden en su dispositivo** — ven el tiempo restante
6. Al finalizar cada pregunta, **el ranking se actualiza en tiempo real**
7. Al final, **podio animado** y estadísticas completas

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| Frontend | React 18 + TypeScript 5 | Ecosistema, Concurrent Features |
| Build | Vite 5 | < 1s dev startup, HMR instantáneo |
| Estilos | Tailwind CSS v4 | CSS Variables, Oxide engine |
| Estado | Zustand | Mínimo boilerplate, ~1KB |
| Routing | React Router v6 | Estándar React |
| Formularios | React Hook Form + Zod | Validación type-safe |
| Backend | Supabase | PostgreSQL + Auth + Realtime + Storage |
| Tiempo Real | Supabase Realtime | WebSockets, 200 concurrentes gratuito |
| Hosting | Cloudflare Pages | Requests ilimitados, CDN global |
| Gráficos | Recharts | React-native, MIT |
| Animaciones | Framer Motion | Layout animations, gestures |
| Audio | Howler.js | Cross-browser, sprites |
| Drag & Drop | @dnd-kit/core | Accesible, touch support |
| QR | qrcode.react | SVG/Canvas, MIT |
| Excel | xlsx (SheetJS CE) | Apache 2.0 |
| PDF | jspdf + jspdf-autotable | MIT |
| Avatares | DiceBear API | SVG gratuito |
| Icons | Lucide React | Consistente, tree-shakeable |

**Costo de infraestructura: $0/mes** (dentro de los planes gratuitos de Supabase y Cloudflare)

---

## 📁 Estructura del Proyecto

```
axel-play/
├── public/
│   ├── _redirects          # SPA routing para Cloudflare Pages
│   ├── favicon.svg
│   └── sounds/             # Efectos de audio (.webm, .mp3)
├── src/
│   ├── components/         # Componentes React reutilizables
│   │   ├── ui/             # Design system (Button, Card, Modal, Input...)
│   │   ├── game/           # Componentes de juego
│   │   ├── editor/         # Editor de juegos y preguntas
│   │   └── layout/         # Header, Sidebar, PageLayout
│   ├── pages/              # Vistas/rutas principales
│   ├── hooks/              # Custom hooks
│   ├── stores/             # Zustand stores
│   ├── lib/                # Clientes externos
│   ├── types/              # TypeScript types
│   ├── utils/              # Helpers
│   └── styles/             # CSS global
├── supabase/
│   ├── migrations/         # SQL migrations
│   └── functions/          # Edge Functions (Deno)
└── .github/workflows/      # CI/CD
```

---

## 🎯 Características

### Para Docentes
- ✅ Crear y gestionar biblioteca de juegos
- ✅ Editor con drag & drop para reordenar preguntas
- ✅ Múltiples tipos de pregunta
- ✅ Banco de preguntas reutilizable
- ✅ Estadísticas y exportación a Excel/PDF

### Para Alumnos
- ✅ Unirse via QR o PIN — sin registro, sin app
- ✅ Elegir apodo y avatar autogenerado
- ✅ Vista optimizada para móvil
- ✅ Feedback instantáneo y ranking en tiempo real

### Gamificación
- 🏆 Podio animado al finalizar
- ⚡ Puntos bonus por velocidad de respuesta
- 🔥 Racha de respuestas correctas
- 🏅 Logros e insignias
- 👥 Modo equipos

---

## 📦 Instalación Rápida

```bash
git clone https://github.com/[usuario]/axel-play.git
cd axel-play
npm install
cp .env.example .env.local
# Editar .env.local con credenciales de Supabase
npx supabase db push
npm run dev
```

Ver [INSTALACION.md](INSTALACION.md) para instrucciones completas.

---

## 📄 Documentación

| Documento | Descripción |
|-----------|-------------|
| [HERRAMIENTAS_Y_ARQUITECTURA.md](HERRAMIENTAS_Y_ARQUITECTURA.md) | Análisis comparativo de herramientas |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Arquitectura técnica con diagramas |
| [MODELO_DATOS.md](MODELO_DATOS.md) | Schema de base de datos |
| [SEGURIDAD.md](SEGURIDAD.md) | Modelo de seguridad |
| [INSTALACION.md](INSTALACION.md) | Guía de instalación local |
| [DESPLIEGUE.md](DESPLIEGUE.md) | Despliegue en producción |
| [INSTRUCCIONES_IA.md](INSTRUCCIONES_IA.md) | Para continuar con IA |

---

*Hecho con ❤️ para docentes hispanohablantes*
