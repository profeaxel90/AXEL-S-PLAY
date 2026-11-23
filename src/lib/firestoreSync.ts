// ══════════════════════════════════════════════════════════════
// AXEL'S PLAY — Módulo de Sincronización con Firebase Firestore
// Permite guardar y recuperar juegos, tareas y grupos desde la nube
// para que estén disponibles en cualquier dispositivo/navegador.
// ══════════════════════════════════════════════════════════════

import { db, isFirebaseConfigured } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore';

export { isFirebaseConfigured };

/**
 * Sanitiza datos antes de enviar a Firestore:
 * - Elimina undefined (Firestore no lo soporta)
 * - Mantiene fotos y evidencias de tamaño razonable (hasta 450 KB por imagen base64).
 *   Firestore admite hasta 1 MB por documento individual.
 * - Reemplaza archivos extremadamente grandes (> 450 KB) para evitar rechazo de Firestore.
 */
function sanitizeForFirestore(data: unknown): DocumentData {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === 'string') {
        // Permitir fotos comprimidas de estudiantes de hasta 450,000 caracteres (~330 KB reales)
        if (value.startsWith('data:image/') && value.length > 450000) return '__LOCAL_PHOTO__';
        // Permitir PDFs de hasta 450,000 caracteres
        if (value.startsWith('data:application/pdf') && value.length > 450000) return '__LOCAL_PDF__';
      }
      return value;
    })
  );
}

export const cloudSync = {
  // ── Operaciones individuales ──

  /** Guarda un único documento en una colección. */
  async saveItem(collectionName: string, id: string, data: unknown): Promise<void> {
    if (!db || !isFirebaseConfigured()) return;
    try {
      await setDoc(doc(db, collectionName, id), sanitizeForFirestore(data));
    } catch (e) {
      console.warn(`[CloudSync] ⚠️ Error guardando ${collectionName}/${id}:`, e);
    }
  },

  /** Elimina un documento de una colección. */
  async deleteItem(collectionName: string, id: string): Promise<void> {
    if (!db || !isFirebaseConfigured()) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.warn(`[CloudSync] ⚠️ Error eliminando ${collectionName}/${id}:`, e);
    }
  },

  // ── Operaciones en lote ──

  /** Carga todos los documentos de una colección como Record<id, data>. */
  async loadAll<T>(collectionName: string): Promise<Record<string, T> | null> {
    if (!db || !isFirebaseConfigured()) return null;
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      if (snapshot.empty) return null;
      const result: Record<string, T> = {};
      snapshot.forEach((d) => {
        result[d.id] = d.data() as T;
      });
      return result;
    } catch (e) {
      console.warn(`[CloudSync] ⚠️ Error cargando ${collectionName}:`, e);
      return null;
    }
  },

  /** Guarda múltiples documentos en batch (máx 450 por lote). */
  async saveAll(collectionName: string, items: Record<string, unknown>): Promise<void> {
    if (!db || !isFirebaseConfigured()) return;
    try {
      const entries = Object.entries(items);
      if (entries.length === 0) return;
      for (let i = 0; i < entries.length; i += 450) {
        const batch = writeBatch(db);
        const chunk = entries.slice(i, i + 450);
        for (const [id, data] of chunk) {
          batch.set(doc(db, collectionName, id), sanitizeForFirestore(data));
        }
        await batch.commit();
      }
      console.log(`[CloudSync] ☁️ ${entries.length} docs sincronizados → '${collectionName}'`);
    } catch (e) {
      console.warn(`[CloudSync] ⚠️ Error batch ${collectionName}:`, e);
    }
  },

  /** Elimina todos los documentos de una colección. */
  async clearCollection(collectionName: string): Promise<void> {
    if (!db || !isFirebaseConfigured()) return;
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      if (snapshot.empty) return;
      const entries = snapshot.docs;
      for (let i = 0; i < entries.length; i += 450) {
        const batch = writeBatch(db);
        entries.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      console.log(`[CloudSync] 🗑️ Colección '${collectionName}' limpiada`);
    } catch (e) {
      console.warn(`[CloudSync] ⚠️ Error limpiando ${collectionName}:`, e);
    }
  },

  /** Escucha cambios en tiempo real en una colección de Firestore. */
  listenCollection<T>(collectionName: string, onUpdate: (items: Record<string, T>) => void): () => void {
    if (!db || !isFirebaseConfigured()) return () => {};
    try {
      const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
        const result: Record<string, T> = {};
        snapshot.forEach((d) => {
          result[d.id] = d.data() as T;
        });
        onUpdate(result);
      }, (err) => {
        console.warn(`[CloudSync] Error listening to ${collectionName}:`, err);
      });
      return unsubscribe;
    } catch {
      return () => {};
    }
  },
};
