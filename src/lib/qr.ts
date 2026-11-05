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
 * Genera un token aleatorio criptográficamente seguro (32 caracteres alfanuméricos)
 * para asociar unívocamente la partida a su código QR.
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Construye la URL completa que codifica el QR.
 * El estudiante abre la cámara nativa, escanea el QR y entra directo a la sala.
 */
export function buildQRUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
  return `${base}/join/${token}`;
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
      return false;
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
