import React from 'react';

export type MascotEmotion = 'idle' | 'happy' | 'celebrate' | 'thinking' | 'sad' | 'victory';

interface MascotAvatarProps {
  avatar?: string;
  seed?: string;
  emotion?: MascotEmotion;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBadge?: boolean;
}

// Extractor de seed seguro (si viene una URL de dicebear o un seed directo)
export function extractMascotSeed(avatarString?: string): string {
  if (!avatarString) return 'Astro';
  if (avatarString.includes('seed=')) {
    const match = avatarString.match(/seed=([^&]+)/);
    if (match && match[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  // Si es un seed directo como "Ninja", "Cyber", etc.
  if (!avatarString.startsWith('http') && avatarString.length > 0) {
    return avatarString;
  }
  return 'Astro';
}

const SIZE_MAP = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32',
};

// Paleta de colores e identidades de las 15 mascotas 3D Cartoon
interface MascotPalette {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  skin: string;
  belly: string;
  glow: string;
  symbol: string;
}

const MASCOT_PROFILES: Record<string, MascotPalette> = {
  Astro: {
    name: 'Astro',
    primary: '#6366f1',
    secondary: '#4338ca',
    accent: '#38bdf8',
    skin: '#818cf8',
    belly: '#e0e7ff',
    glow: 'rgba(99, 102, 241, 0.4)',
    symbol: '🚀',
  },
  Ninja: {
    name: 'Ninja',
    primary: '#1e293b',
    secondary: '#0f172a',
    accent: '#ef4444',
    skin: '#334155',
    belly: '#cbd5e1',
    glow: 'rgba(239, 68, 68, 0.35)',
    symbol: '⚡',
  },
  Cyber: {
    name: 'Cyber',
    primary: '#06b6d4',
    secondary: '#0891b2',
    accent: '#22d3ee',
    skin: '#67e8f9',
    belly: '#cffafe',
    glow: 'rgba(6, 182, 212, 0.45)',
    symbol: '🔮',
  },
  Wizard: {
    name: 'Wizard',
    primary: '#8b5cf6',
    secondary: '#6d28d9',
    accent: '#facc15',
    skin: '#a78bfa',
    belly: '#ede9fe',
    glow: 'rgba(139, 92, 246, 0.45)',
    symbol: '✨',
  },
  Dragon: {
    name: 'Dragon',
    primary: '#10b981',
    secondary: '#047857',
    accent: '#f59e0b',
    skin: '#34d399',
    belly: '#d1fae5',
    glow: 'rgba(16, 185, 129, 0.4)',
    symbol: '🔥',
  },
  Fox: {
    name: 'Fox',
    primary: '#f97316',
    secondary: '#c2410c',
    accent: '#fef08a',
    skin: '#fb923c',
    belly: '#ffedd5',
    glow: 'rgba(249, 115, 22, 0.4)',
    symbol: '🦊',
  },
  Pixel: {
    name: 'Pixel',
    primary: '#ec4899',
    secondary: '#be185d',
    accent: '#a855f7',
    skin: '#f472b6',
    belly: '#fce7f3',
    glow: 'rgba(236, 72, 153, 0.4)',
    symbol: '👾',
  },
  Rocket: {
    name: 'Rocket',
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    accent: '#f97316',
    skin: '#60a5fa',
    belly: '#dbeafe',
    glow: 'rgba(59, 130, 246, 0.4)',
    symbol: '⭐',
  },
  Gamer: {
    name: 'Gamer',
    primary: '#14b8a6',
    secondary: '#0f766e',
    accent: '#a3e635',
    skin: '#2dd4bf',
    belly: '#ccfbf1',
    glow: 'rgba(20, 184, 166, 0.4)',
    symbol: '🎮',
  },
  Phoenix: {
    name: 'Phoenix',
    primary: '#e11d48',
    secondary: '#9f1239',
    accent: '#fbbf24',
    skin: '#f43f5e',
    belly: '#ffe4e6',
    glow: 'rgba(225, 29, 72, 0.45)',
    symbol: '👑',
  },
  Shadow: {
    name: 'Shadow',
    primary: '#312e81',
    secondary: '#1e1b4b',
    accent: '#818cf8',
    skin: '#4338ca',
    belly: '#e0e7ff',
    glow: 'rgba(129, 140, 248, 0.35)',
    symbol: '🌙',
  },
  Comet: {
    name: 'Comet',
    primary: '#0284c7',
    secondary: '#0369a1',
    accent: '#38bdf8',
    skin: '#38bdf8',
    belly: '#e0f2fe',
    glow: 'rgba(2, 132, 199, 0.4)',
    symbol: '💫',
  },
  Titan: {
    name: 'Titan',
    primary: '#64748b',
    secondary: '#334155',
    accent: '#38bdf8',
    skin: '#94a3b8',
    belly: '#f1f5f9',
    glow: 'rgba(100, 116, 139, 0.35)',
    symbol: '🛡️',
  },
  Sparky: {
    name: 'Sparky',
    primary: '#eab308',
    secondary: '#a16207',
    accent: '#fef08a',
    skin: '#facc15',
    belly: '#fef9c3',
    glow: 'rgba(234, 179, 8, 0.45)',
    symbol: '⚡',
  },
  Blaze: {
    name: 'Blaze',
    primary: '#dc2626',
    secondary: '#991b1b',
    accent: '#f97316',
    skin: '#ef4444',
    belly: '#fee2e2',
    glow: 'rgba(220, 38, 38, 0.45)',
    symbol: '💥',
  },
};

export const AVAILABLE_MASCOT_SEEDS = Object.keys(MASCOT_PROFILES);

export default function MascotAvatar({
  avatar,
  seed,
  emotion = 'idle',
  size = 'md',
  className = '',
  showBadge = false,
}: MascotAvatarProps) {
  const resolvedSeed = seed || extractMascotSeed(avatar);
  const profile = MASCOT_PROFILES[resolvedSeed] || MASCOT_PROFILES.Astro;

  // Clases dinámicas de animación CSS según emoción
  const getEmotionAnimation = () => {
    switch (emotion) {
      case 'happy':
      case 'celebrate':
        return 'animate-bounce';
      case 'sad':
        return 'animate-pulse opacity-90';
      case 'thinking':
        return 'animate-wiggle';
      case 'victory':
        return 'animate-bounce scale-105';
      default:
        return 'hover:scale-105 transition-transform duration-300';
    }
  };

  const gradientId = `mascot-grad-${resolvedSeed.toLowerCase()}`;
  const eyeHighlightId = `mascot-eye-${resolvedSeed.toLowerCase()}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${SIZE_MAP[size]} ${className}`}
      title={`${profile.name} (${emotion})`}
    >
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full drop-shadow-md ${getEmotionAnimation()}`}
      >
        <defs>
          {/* Degradado esférico 3D principal de la cabeza */}
          <radialGradient id={gradientId} cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor={profile.skin} />
            <stop offset="60%" stopColor={profile.primary} />
            <stop offset="100%" stopColor={profile.secondary} />
          </radialGradient>

          {/* Brillo especular 3D de los ojos */}
          <linearGradient id={eyeHighlightId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>

          {/* Sombra suave de base */}
          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.3" floodColor="#000000" />
          </filter>
        </defs>

        {/* 1. Sombra bajo el personaje */}
        <ellipse cx="50" cy="94" rx="28" ry="5" fill="#000000" opacity="0.25" />

        {/* 2. Orejas / Cuernos / Accesorios distintivos según la mascota */}
        {profile.name === 'Fox' && (
          <g>
            <polygon points="20,38 32,12 42,32" fill={profile.primary} />
            <polygon points="24,35 32,18 38,32" fill={profile.belly} />
            <polygon points="80,38 68,12 58,32" fill={profile.primary} />
            <polygon points="76,35 68,18 62,32" fill={profile.belly} />
          </g>
        )}

        {profile.name === 'Dragon' && (
          <g>
            <polygon points="25,32 18,14 34,26" fill={profile.accent} />
            <polygon points="75,32 82,14 66,26" fill={profile.accent} />
          </g>
        )}

        {profile.name === 'Wizard' && (
          <g>
            <polygon points="26,34 50,2 74,34" fill={profile.secondary} />
            <ellipse cx="50" cy="34" rx="26" ry="6" fill={profile.accent} />
            <circle cx="50" cy="2" r="3.5" fill="#facc15" />
          </g>
        )}

        {profile.name === 'Astro' && (
          <g>
            {/* Antena espacial */}
            <line x1="50" y1="20" x2="50" y2="8" stroke={profile.accent} strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="8" r="4.5" fill={profile.accent} />
            {/* Auriculares del casco */}
            <circle cx="16" cy="52" r="6" fill={profile.accent} />
            <circle cx="84" cy="52" r="6" fill={profile.accent} />
          </g>
        )}

        {profile.name === 'Ninja' && (
          <g>
            {/* Cinta Ninja roja con nudos */}
            <path d="M 18,40 Q 50,34 82,40 L 82,47 Q 50,42 18,47 Z" fill={profile.accent} />
            <polygon points="82,42 94,40 88,48" fill={profile.accent} />
            <polygon points="82,45 96,48 88,52" fill={profile.accent} />
          </g>
        )}

        {profile.name === 'Gamer' && (
          <g>
            {/* Auriculares Gamer modernos con almohadillas */}
            <path d="M 18,52 A 32,32 0 0,1 82,52" fill="none" stroke={profile.secondary} strokeWidth="5" strokeLinecap="round" />
            <rect x="12" y="44" width="8" height="18" rx="4" fill={profile.accent} />
            <rect x="80" y="44" width="8" height="18" rx="4" fill={profile.accent} />
          </g>
        )}

        {/* 3. Cabeza Principal Esférica 3D Cartoon */}
        <circle cx="50" cy="52" r="34" fill={`url(#${gradientId})`} />

        {/* Brillo volumétrico 3D superior en la frente */}
        <ellipse cx="44" cy="32" rx="18" ry="9" fill="#ffffff" opacity="0.25" />

        {/* Mejillas sonrosadas cute */}
        <circle cx="28" cy="62" r="5" fill="#f43f5e" opacity="0.3" />
        <circle cx="72" cy="62" r="5" fill="#f43f5e" opacity="0.3" />

        {/* 4. Ojos Cartoon Reactivos a la Emoción */}
        {emotion === 'happy' || emotion === 'celebrate' || emotion === 'victory' ? (
          // Ojos cerrados felices tipo arco ^ ^
          <g stroke="#ffffff" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M 32,50 Q 38,42 44,50" />
            <path d="M 56,50 Q 62,42 68,50" />
          </g>
        ) : emotion === 'sad' ? (
          // Ojos tristes o apenados
          <g>
            <ellipse cx="38" cy="52" rx="6" ry="7" fill="#0f172a" />
            <ellipse cx="62" cy="52" rx="6" ry="7" fill="#0f172a" />
            {/* Lágrima cómica */}
            <path d="M 72,56 C 72,60 76,64 76,60 C 76,56 72,56 72,56 Z" fill="#38bdf8" />
          </g>
        ) : emotion === 'thinking' ? (
          // Ojos mirando arriba a la derecha pensativo
          <g>
            <circle cx="38" cy="50" r="7" fill="#ffffff" />
            <circle cx="41" cy="48" r="4.5" fill="#0f172a" />
            <circle cx="43" cy="46" r="1.5" fill="#ffffff" />

            <circle cx="62" cy="50" r="7" fill="#ffffff" />
            <circle cx="65" cy="48" r="4.5" fill="#0f172a" />
            <circle cx="67" cy="46" r="1.5" fill="#ffffff" />
          </g>
        ) : (
          // Ojos normales 3D brillantes con reflejo
          <g>
            {/* Ojo izquierdo */}
            <circle cx="38" cy="50" r="7.5" fill="#0f172a" />
            <circle cx="38" cy="50" r="6" fill="#1e293b" />
            <circle cx="36" cy="48" r="2.8" fill="#ffffff" />
            <circle cx="40" cy="52" r="1.2" fill="#ffffff" />

            {/* Ojo derecho */}
            <circle cx="62" cy="50" r="7.5" fill="#0f172a" />
            <circle cx="62" cy="50" r="6" fill="#1e293b" />
            <circle cx="60" cy="48" r="2.8" fill="#ffffff" />
            <circle cx="64" cy="52" r="1.2" fill="#ffffff" />
          </g>
        )}

        {/* 5. Boca Expresiva Cartoon */}
        {emotion === 'happy' || emotion === 'celebrate' || emotion === 'victory' ? (
          // Gran sonrisa abierta
          <g>
            <path d="M 40,63 Q 50,75 60,63 Z" fill="#ef4444" />
            <path d="M 44,64 Q 50,68 56,64" fill="#ffffff" />
          </g>
        ) : emotion === 'sad' ? (
          // Boquita invertida triste
          <path d="M 43,67 Q 50,61 57,67" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
        ) : emotion === 'thinking' ? (
          // Boquita de lado pensativa
          <circle cx="54" cy="65" r="3" fill="#0f172a" />
        ) : (
          // Sonrisa suave y amigable
          <path d="M 42,63 Q 50,70 58,63" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none" />
        )}

        {/* 6. Corona / Corona de la Victoria */}
        {(emotion === 'victory' || profile.name === 'Phoenix') && (
          <g transform="translate(36, 12) scale(0.7)">
            <polygon points="0,20 8,2 20,12 32,2 40,20" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="8" cy="4" r="2.5" fill="#ef4444" />
            <circle cx="20" cy="12" r="2.5" fill="#3b82f6" />
            <circle cx="32" cy="4" r="2.5" fill="#10b981" />
          </g>
        )}
      </svg>

      {/* Badge decorativo con ícono de la mascota */}
      {showBadge && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center text-[10px] shadow">
          {profile.symbol}
        </span>
      )}
    </div>
  );
}
