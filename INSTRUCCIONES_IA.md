# 🤖 INSTRUCCIONES PARA ASISTENTES DE IA — AXEL PLAY

Este documento está dirigido a cualquier modelo o agente de IA que continúe el desarrollo de **AXEL PLAY**. Sigue estrictamente estas reglas y convenciones.

---

## 1. REGLAS FUNDAMENTALES INMUTABLES

1. **Aislamiento Total del Proyecto:**
   - La plataforma se encuentra en `C:\Users\axell\.gemini\antigravity\scratch\axel-play`.
   - **NUNCA** modificar, borrar, leer con fines de sobreescritura ni alterar archivos de otros proyectos del ecosistema PROFE AXEL (`aula-profe-axel`, `cea-movil`, etc.).
   - No reutilizar credenciales de otros proyectos sin autorización explícita.

2. **Cero Costo (Desarrollo y Producción):**
   - No incorporar bibliotecas o servicios comerciales que exijan tarjeta de crédito o pasarelas de cobro.
   - Usar siempre alternativas de código abierto (MIT / Apache 2.0 / BSD) o capas gratuitas permanentes (Supabase Free, Cloudflare Pages Free, DiceBear API, SheetJS CE).

3. **Acceso Exclusivo por Código QR:**
   - **PROHIBIDO** añadir campos de texto para escribir PIN o código de partida manual para estudiantes.
   - El estudiante entra escaneando con la cámara de su celular el QR generado por el docente (`/join/:token`).
   - El estudiante no requiere registro ni contraseña para participar en partidas en vivo.

4. **Poderes del Docente:**
   - Durante la sesión en vivo, el docente puede seleccionar cualquier participante y otorgarle un super-poder (`grantPower` en `sessionStore.ts`).
   - Los poderes incluyen: Doble Puntos, +10 Segundos, Escudo Protector, Pistas, 50:50, etc.

5. **Audio Híbrido (No Bloqueante):**
   - El motor `src/lib/audio.ts` combina Howler.js con un sintetizador procedural de Web Audio API.
   - Esto garantiza que los sonidos funcionen siempre sin requerir descargas pesadas de audio ni generar errores 404 en consola.

---

## 2. ESTRUCTURA DE ARCHIVOS Y RUTAS

- `src/pages/LandingPage.tsx`: Portal público promocional con catálogo de modos de juego y botón de inicio.
- `src/pages/auth/`: `LoginPage.tsx`, `RegisterPage.tsx`, `ResetPasswordPage.tsx`.
- `src/pages/student/`:
  - `JoinPage.tsx`: Entrada directa por escaneo de QR (`/join/:token`), selección de avatar y apodo.
  - `WaitingRoomPage.tsx`: Sala de espera previa al inicio.
  - `GameStudentPage.tsx`: Pantalla de juego en tiempo real con temporizador, opciones, vidas y poderes.
  - `ResultsStudentPage.tsx`: Podio final y resumen individual.
- `src/pages/teacher/`:
  - `DashboardPage.tsx`: Panel principal con estadísticas rápidas y juegos recientes.
  - `GamesPage.tsx`: Listado, filtrado, duplicación y eliminación de juegos.
  - `GameEditorPage.tsx`: Editor visual de preguntas con 10 tipos pedagógicos y previsualización.
  - `QuestionBankPage.tsx`: Banco de preguntas con importación/exportación real a Excel (.xlsx).
  - `SessionPage.tsx`: Proyección en vivo de QR gigante, lista de estudiantes conectados y otorgamiento de poderes.
  - `AnalyticsPage.tsx`: Gráficos interactivos Recharts, detección de preguntas difíciles y exportación a Excel y PDF.
- `src/lib/`:
  - `supabase.ts`: Cliente configurado para autenticación y realtime.
  - `qr.ts`: Generación de tokens seguros y utilidades de QR.
  - `audio.ts`: Motor de efectos sonoros y música con Web Audio API.

---

## 3. COMANDOS ÚTILES

- Compilar producción:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
  cd C:\Users\axell\.gemini\antigravity\scratch\axel-play
  npm run build
  ```
- Servidor de desarrollo:
  ```powershell
  npm run dev
  ```
