# 🌐 GUÍA DE DESPLIEGUE EN VERCEL Y CLOUDFLARE PAGES — AXEL PLAY

AXEL PLAY está preparado para desplegarse **gratis en 1 clic** en **Vercel** o en **Cloudflare Pages**.

---

## 1. DESPLIEGUE EN VERCEL (100% GRATUITO)

El proyecto ya cuenta con el archivo [`vercel.json`](file:///C:/Users/axell/.gemini/antigravity/scratch/axel-play/vercel.json) configurado con las reglas de redirección SPA (Single Page Application) y cabeceras de seguridad.

### Paso 1: Subir a GitHub
1. Crea un repositorio en [GitHub.com](https://github.com) llamado `axel-play` (puede ser público o privado).
2. Sube la carpeta del proyecto:
   ```bash
   cd C:\Users\axell\.gemini\antigravity\scratch\axel-play
   git init
   git add .
   git commit -m "feat: AXEL PLAY v1.0 listo para Vercel"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/axel-play.git
   git push -u origin main
   ```

### Paso 2: Importar en Vercel
1. Ingresa a [Vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** > **"Project"**.
3. Selecciona tu repositorio `axel-play` y haz clic en **Import**.
4. Vercel detectará automáticamente:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Haz clic en **"Deploy"**.

¡Listo! En menos de 60 segundos obtendrás tu URL pública oficial con HTTPS, por ejemplo:
`https://axel-play.vercel.app`

Los estudiantes podrán escanear el QR desde sus celulares con cualquier conexión móvil (4G/5G) y entrar directamente a la partida.

---

## 2. MULTIJUGADOR EN LA NUBE INTEGRADO

Para que la experiencia multijugador funcione en la nube sin costo:
1. **WebRTC P2P (PeerJS):** Ya viene integrado en `src/lib/p2p.ts`. Conecta directamente el celular del estudiante con la pantalla del docente a través de canales de datos cifrados sin necesidad de configurar bases de datos.
2. **Supabase (Opcional para almacenamiento de cuentas en la nube):**
   Si deseas que los cuestionarios y cuentas se sincronicen entre diferentes computadores, crea un proyecto gratuito en [Supabase.com](https://supabase.com) y añade en las variables de entorno de Vercel:
   - `VITE_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `tu_anon_key`

---

## 3. DESPLIEGUE EN CLOUDFLARE PAGES (ALTERNATIVA)

Si prefieres Cloudflare Pages por tener ancho de banda ilimitado:
1. En el panel de Cloudflare, ve a **Workers & Pages** > **Create application** > **Pages**.
2. Conecta tu repositorio Git.
3. Build command: `npm run build`, Output directory: `dist`.
4. El archivo `public/_redirects` ya está incluido para soportar el router de React.
