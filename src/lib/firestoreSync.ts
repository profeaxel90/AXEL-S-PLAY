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
  type DocumentData,
} from 'firebase/firestore';

export { isFirebaseConfigured };

/**
 * Sanitiza datos antes de enviar a Firestore:
 * - Elimina undefined (Firestore no lo soporta)
 * - Reemplaza fotos base64 grandes (se mantienen solo en localStorage)
 * - Reemplaza PDFs base64 grandes
 */
function sanitizeForFirestore(data: unknown): DocumentData {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => {
      if (typeof value === 'string') {
        if (value.startsWith('data:image/') && value.length > 5000) return '__LOCAL_PHOTO__';
        if (value.startsWith('data:application/pdf') && value.length > 5000) return '__LOCAL_PDF__';
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
};
