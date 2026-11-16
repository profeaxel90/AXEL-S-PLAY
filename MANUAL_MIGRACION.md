# 📘 MANUAL MAESTRO DE COPIA, MIGRACIÓN Y EJECUCIÓN DE AXEL'S PLAY

Este manual contiene la guía paso a paso y de referencia técnica para clonar, copiar, ejecutar y migrar el proyecto **AXEL'S PLAY** a cualquier otro computador con **Google Antigravity**, **Cursor**, **Visual Studio Code**, **WebContainers** o servidores en la nube, garantizando que puedas continuar trabajando sin perder configuraciones ni información.

---

## 📌 1. Arquitectura Técnica del Proyecto

| Componente | Tecnología Utilizada | Función Principal |
| :--- | :--- | :--- |
| **Framework** | React 18 + TypeScript | Interfaz reactiva para Docentes y Estudiantes |
| **Empaquetador** | Vite 8 (Rolldown / ESBuild) | Compilación ultra rápida y Hot Module Replacement |
| **Estilos** | Tailwind CSS + Lucide Icons | Diseño visual moderno modo oscuro / arcade |
| **Estado Global** | Zustand (`gameStore`, `homeworkStore`, `sessionStore`) | Estado síncrono en tiempo real sin recarga de página |
| **Almacenamiento Local** | `localStorage` + `IndexedDB` (1,000 MB+) | Guardado de juegos, fotos de cuadernos y audios |
| **Audio** | Web Audio API + HTMLAudioElement | Sintetizadores procedurales y pistas personalizadas |
| **Tiempo Real** | Broker MQTT WSS público + Supabase Realtime | Comunicación multijugador docente-alumnos instantánea |
| **Despliegue** | Vercel (Git Push automático) | Alojamiento en la nube en `https://axel-s-play.vercel.app` |

---

## 💻 2. Requisitos Previos en el Nuevo Computador

Antes de clonar o ejecutar el proyecto, asegúrate de tener instalado en el nuevo computador:

1. **Node.js (LTS)**: Versión `18.x` o `20.x+` (descargar desde [nodejs.org](https://nodejs.org/)).
   - Verifica en terminal: `node -v` y `npm -v`.
2. **Git**: Herramienta de control de versiones (descargar desde [git-scm.com](https://git-scm.com/) o instalar [GitHub Desktop](https://desktop.github.com/)).
   - Verifica en terminal: `git --version`.
3. **Editor / Plataforma de Codificación**:
   - **Google Antigravity** (Recomendado).
   - Opcional: **Cursor**, **Visual Studio Code**, o **Windsurf**.

---

## 🚀 3. Paso a Paso: Clonar y Ejecutar el Proyecto

### Opción A: Mediante Git / GitHub (Método Recomendado)

1. Abre tu terminal (PowerShell, Terminal de Mac/Linux o Git Bash).
2. Dirígete a la carpeta donde deseas guardar tus proyectos:
   ```bash
   cd ~/Documentos/GitHub
   # En Windows:
   cd C:\Users\TU_USUARIO\OneDrive\Documentos\GitHub
   ```
3. Clona el repositorio oficial de AXEL'S PLAY:
   ```bash
   git clone https://github.com/profeaxel90/AXEL-S-PLAY.git
   ```
4. Entra en la carpeta del proyecto:
   ```bash
   cd AXEL-S-PLAY
   ```
5. Instala todas las dependencias del proyecto:
   ```bash
   npm install
   ```
6. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
7. Abre tu navegador en la URL indicada (habitualmente `http://localhost:5173`).

---

### Opción B: Copia Física mediante USB o Disco Externo

Si necesitas llevar el proyecto en una memoria USB o disco portátil:

> **Importante:**
> **No copies la carpeta `node_modules` ni la carpeta `dist`.** Estas carpetas contienen miles de archivos temporales que ralentizan la copia. Sin ellas, el proyecto pesa apenas entre 10 MB y 25 MB.

1. En el computador original, copia toda la carpeta `AXEL-S-PLAY` excepto `node_modules` y `dist`.
2. Pégala en tu memoria USB o disco externo.
3. En el nuevo computador, pega la carpeta en tu ubicación preferida.
4. Abre la terminal en esa carpeta y ejecuta:
   ```bash
   npm install
   npm run dev
   ```
   *`npm install` reconstruirá automáticamente toda la carpeta `node_modules` en segundos.*

---

## 🛸 4. Cómo Correr el Proyecto en Google Antigravity

1. Abre **Antigravity**.
2. Ve al menú superior: **Archivo (File)** > **Abrir Carpeta (Open Folder)**.
3. Selecciona la carpeta `AXEL-S-PLAY`.
4. Antigravity detectará automáticamente el archivo `package.json`, TypeScript y las configuraciones de Vite.
5. Abre la terminal integrada de Antigravity (`Ctrl + \`` en Windows/Linux o `Cmd + \`` en Mac).
6. Ejecuta:
   ```bash
   npm run dev
   ```
7. Puedes usar el navegador integrado o los agentes de Antigravity para continuar programando o pedir mejoras.

---

## 🛠️ 5. Migración a Otras Plataformas (Cursor, VS Code, WebContainers)

### En Visual Studio Code o Cursor
1. Abre la carpeta del proyecto en Cursor/VS Code.
2. Extensiones recomendadas:
   - **Tailwind CSS IntelliSense**
   - **ESLint**
   - **Prettier - Code formatter**
3. Abre la terminal y ejecuta `npm install` y luego `npm run dev`.

---

## 💾 6. Migración de Datos (Juegos, Tareas, Alumnos y Fotos)

El código fuente del proyecto contiene la aplicación, pero la base de datos local (tus juegos creados, preguntas, tareas, fotos de cuadernos de estudiantes y notas) se almacena en el navegador del computador.

Para pasar todos tus datos al nuevo computador en **1 solo clic**:

### Pasos en el Computador Original:
1. Inicia sesión como docente / Super Admin.
2. Ve a **Configuración** (`/teacher/settings`).
3. En la sección **Copia de Seguridad y Respaldo Completo**, haz clic en:
   **"Descargar Copia de Seguridad (.json)"**.
4. Se descargará un archivo como `axels_play_backup_2026-11-15_22-45.json` que contiene todos tus juegos, preguntas, tareas, fotos en IndexedDB y docentes.

### Pasos en el Nuevo Computador:
1. Abre la aplicación (en local `http://localhost:5173` o en Vercel `https://axel-s-play.vercel.app`).
2. Ve a **Configuración** (`/teacher/settings`).
3. En la sección **Copia de Seguridad**, haz clic en **"Seleccionar Archivo de Respaldo (.json)"**.
4. Selecciona el archivo descargado.
5. El sistema te mostrará un resumen con el número exacto de juegos, tareas y fotos.
6. Pulsa **"Confirmar y Restaurar"**.
7. ¡La página se actualizará y tendrás toda tu información intacta!

---

## 🔧 7. Comandos Útiles del Proyecto

| Comando | Acción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo local con recarga rápida |
| `npm run build` | Compila y optimiza el proyecto para producción (`dist/`) |
| `npm run preview` | Previsualiza localmente el build compilado idéntico a producción |
| `git status` | Muestra los archivos modificados |
| `git push origin main` | Envía cambios a GitHub para despliegue automático en Vercel |

---

## ❓ 8. Preguntas Frecuentes y Solución de Problemas

- **Error "Port 5173 is in use":**
  Si Vite dice que el puerto 5173 está ocupado, abrirá automáticamente el puerto `5174` o puedes matar el proceso anterior en PowerShell con:
  `Stop-Process -Name node -Force`

- **Error de Autoplay de Audio en Navegadores:**
  Por políticas de seguridad de Chrome/Edge, la música no puede reproducirse antes de que el usuario haga clic en la página. AXEL'S PLAY incluye desbloqueador automático (`audioEngine.unlock()`) en el primer clic.

- **Repositorio Oficial:**
  - GitHub: `https://github.com/profeaxel90/AXEL-S-PLAY`
  - Rama de Producción: `main`
  - Despliegue en Vivo: `https://axel-s-play.vercel.app`
