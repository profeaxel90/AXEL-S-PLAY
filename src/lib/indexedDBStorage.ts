// ============================================================
// AXEL'S PLAY - Motor de Almacenamiento IndexedDB de Alta Capacidad
// Amplía la capacidad de memoria del navegador de 5 MB a más de 1 GB (1,000 MB+),
// permitiendo almacenar cientos de fotos de cuadernos y tareas sin límite.
// ============================================================

const DB_NAME = 'AxelsPlayDB';
const DB_VERSION = 1;

export interface StoredMedia {
  id: string;
  dataUrl: string;
  mimeType: string;
  timestamp: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  public async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no soportado en este entorno'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.warn('Error inicializando IndexedDB:', event);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.initPromise;
  }

  public async saveMedia(id: string, dataUrl: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        const item: StoredMedia = {
          id,
          dataUrl,
          mimeType: dataUrl.split(';')[0]?.replace('data:', '') || 'image/webp',
          timestamp: Date.now(),
        };
        const req = store.put(item);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  public async getMedia(id: string): Promise<string | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('photos', 'readonly');
        const store = tx.objectStore('photos');
        const req = store.get(id);
        req.onsuccess = () => {
          const item = req.result as StoredMedia | undefined;
          resolve(item ? item.dataUrl : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async deleteMedia(id: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  public async clearAllMedia(): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }
}

export const idbManager = new IndexedDBManager();
