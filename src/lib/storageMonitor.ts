// ============================================================
// AXEL'S PLAY - Monitor de Almacenamiento y Capacidad de Memoria
// Mide el consumo real de localStorage (fotos de alumnos, juegos,
// asignaciones, respuestas) y calcula la cuota disponible.
// ============================================================

export interface StorageMetrics {
  usedBytes: number;
  usedFormatted: string;
  totalEstimatedBytes: number;
  totalFormatted: string;
  percentage: number;
  status: 'optimal' | 'moderate' | 'critical';
  details: {
    homeworkBytes: number;
    photosCount: number;
    photosBytes: number;
    gamesBytes: number;
    otherBytes: number;
  };
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function calculateStorageMetrics(): StorageMetrics {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      usedBytes: 0,
      usedFormatted: '0 MB',
      totalEstimatedBytes: 5 * 1024 * 1024,
      totalFormatted: '5.0 MB',
      percentage: 0,
      status: 'optimal',
      details: {
        homeworkBytes: 0,
        photosCount: 0,
        photosBytes: 0,
        gamesBytes: 0,
        otherBytes: 0,
      },
    };
  }

  let totalBytes = 0;
  let homeworkBytes = 0;
  let photosCount = 0;
  let photosBytes = 0;
  let gamesBytes = 0;
  let otherBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      // En UTF-16 cada caracter ocupa típicamente 2 bytes
      const itemBytes = (key.length + val.length) * 2;
      totalBytes += itemBytes;

      if (key.includes('homework')) {
        homeworkBytes += itemBytes;
        // Contar y estimar peso de fotos de estudiantes
        const photoMatches = val.match(/data:image\/[^;]+;base64,[^"'\\]+/g);
        if (photoMatches) {
          photosCount += photoMatches.length;
          photoMatches.forEach((m) => {
            photosBytes += m.length * 2;
          });
        }
      } else if (key.includes('game') || key.includes('session')) {
        gamesBytes += itemBytes;
      } else {
        otherBytes += itemBytes;
      }
    }
  } catch (err) {
    console.warn('Error calculando storage:', err);
  }

  // Límite estándar típico de localStorage en navegadores web: 5 MB (5,242,880 bytes)
  const totalEstimatedBytes = 5 * 1024 * 1024;
  const rawPercentage = (totalBytes / totalEstimatedBytes) * 100;
  const percentage = Math.min(100, Math.round(rawPercentage * 10) / 10);

  let status: 'optimal' | 'moderate' | 'critical' = 'optimal';
  if (percentage >= 80) {
    status = 'critical';
  } else if (percentage >= 50) {
    status = 'moderate';
  }

  return {
    usedBytes: totalBytes,
    usedFormatted: formatBytes(totalBytes),
    totalEstimatedBytes,
    totalFormatted: '5.0 MB',
    percentage,
    status,
    details: {
      homeworkBytes,
      photosCount,
      photosBytes,
      gamesBytes,
      otherBytes,
    },
  };
}
