# 🚀 GUÍA DE INSTALACIÓN Y EJECUCIÓN LOCAL — AXEL PLAY

Sigue estos pasos para instalar y ejecutar **AXEL PLAY** en cualquier equipo de desarrollo.

---

## 1. REQUISITOS PREVIOS

- **Node.js:** Versión 18 o superior (probado y compatible con Node.js v20, v22 y v25).
- **npm:** Versión 9 o superior (incluido con Node.js).
- **Navegador Web:** Chrome, Edge, Safari, Firefox u Opera moderno con soporte para ES2022 y Web Audio API.

---

## 2. PASOS DE INSTALACIÓN

1. **Abrir terminal en el directorio del proyecto:**
   ```powershell
   cd C:\Users\axell\.gemini\antigravity\scratch\axel-play
   ```

2. **Permitir ejecución de scripts en Windows (si usas PowerShell):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
   ```

3. **Instalar dependencias:**
   ```powershell
   npm install
   ```

4. **Configurar variables de entorno:**
   Copia el archivo `.env.example` como `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
   *Nota: Para probar en modo local/demo no requieres configurar claves de Supabase, la aplicación detecta el entorno y activa el simulador offline automáticamente.*

---

## 3. EJECUTAR EL PROYECTO

1. **Modo Desarrollo (con Hot Reload):**
   ```powershell
   npm run dev
   ```
   Abre tu navegador en: `http://localhost:5173`

2. **Compilar para Producción:**
   ```powershell
   npm run build
   ```
   Los archivos optimizados y empaquetados se generarán en la carpeta `dist/`.

3. **Previsualizar la compilación de producción:**
   ```powershell
   npm run preview
   ```
