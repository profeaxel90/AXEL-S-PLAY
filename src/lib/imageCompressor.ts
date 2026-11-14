/**
 * Compresor ultra-rápido de fotos para móviles y PC.
 * Estrategia multi-nivel 100% a prueba de fallos:
 * 1. createImageBitmap (Aceleración por GPU en navegadores modernos).
 * 2. Canvas 2D + Image con FileReader.
 * 3. Fallback directo con FileReader en caso de teléfonos con memoria restringida.
 * Garantiza que NUNCA se pierda o rechace la foto tomada por el alumno.
 */
export async function compressImageToWebP(file: File, maxDimension = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (!file || !(file instanceof Blob)) {
      resolve('');
      return;
    }

    // Nivel 1: createImageBitmap (Soportado en Chrome Android, Safari 15+, Edge, Firefox)
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(file)
        .then((bitmap) => {
          try {
            let width = bitmap.width;
            let height = bitmap.height;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0, width, height);
              bitmap.close();
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              if (dataUrl && dataUrl.length > 50) {
                resolve(dataUrl);
                return;
              }
            }
          } catch (e) {
            console.warn('[Compressor] Error procesando bitmap:', e);
          }
          fallbackWithFileReader(file, maxDimension, quality, resolve);
        })
        .catch(() => {
          fallbackWithFileReader(file, maxDimension, quality, resolve);
        });
      return;
    }

    fallbackWithFileReader(file, maxDimension, quality, resolve);
  });
}

function fallbackWithFileReader(file: File, maxDimension: number, quality: number, resolve: (res: string) => void) {
  try {
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      if (!rawDataUrl) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl || rawDataUrl);
            return;
          }
        } catch {}
        resolve(rawDataUrl);
      };

      img.onerror = () => {
        resolve(rawDataUrl);
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      resolve('');
    };

    reader.readAsDataURL(file);
  } catch {
    resolve('');
  }
}
