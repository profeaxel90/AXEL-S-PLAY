/**
 * AXEL PLAY - Utilidades de Código QR y Tokens Seguros de Sesión
 * Acceso EXCLUSIVO mediante escaneo de Código QR.
 */

export interface QROptions {
  size?: number;
  includeMargin?: boolean;
  bgColor?: string;
  fgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
}

export const DEFAULT_QR_OPTIONS: QROptions = {
  size: 280,
  includeMargin: true,
  bgColor: '#ffffff',
  fgColor: '#1e1b4b', // Índigo profundo de AXEL PLAY
  level: 'H',
};

/**
 * Genera un token aleatorio seguro (24 caracteres alfanuméricos)
 * para asociar unívocamente la partida a su código QR.
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Construye la URL completa que codifica el QR.
 * Da prioridad al origen actual del navegador (window.location.origin) para que
 * si el docente abre en http://192.168.100.4:5173 o en Vercel, el QR apunte
 * exactamente a esa misma dirección accesible desde el celular.
 */
export function buildQRUrl(token: string, customBaseUrl?: string): string {
  let base: string = customBaseUrl || '';
  if (!base && typeof window !== 'undefined' && window.location && window.location.origin) {
    base = window.location.origin;
  }
  if (!base) {
    base = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
  }
  const cleanBase = base.replace(/\/$/, '');
  return `${cleanBase}/join/${token}`;
}

/**
 * Verifica si el QR ha expirado
 */
export function isTokenValid(expiresAt: Date | string): boolean {
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return new Date() < expiry;
}

/**
 * Comparte el enlace de la sala mediante la API nativa de Web Share o copia al portapapeles.
 */
export async function shareSessionLink(url: string, title = 'Únete a AXEL PLAY'): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text: '¡Escanea el QR o usa este enlace para unirte a la actividad!',
        url,
      });
      return true;
    } catch {
      // Ignorar si el usuario cancela
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
