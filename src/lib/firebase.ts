// ══════════════════════════════════════════════════════════════
// AXEL'S PLAY — Firebase Configuration
// Reemplaza Supabase como backend en la nube.
// Firebase NO pausa ni elimina proyectos inactivos en plan gratis.
// ══════════════════════════════════════════════════════════════

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || '',
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string) || '',
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || '',
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string) || '',
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || '',
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string) || '',
};

/**
 * Verifica si Firebase está configurado con claves reales.
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== 'your_project_id' &&
    firebaseConfig.projectId !== 'placeholder'
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('🔥 Firebase conectado:', firebaseConfig.projectId);
  } catch (e) {
    console.warn('⚠️ Error inicializando Firebase:', e);
  }
} else {
  console.log('ℹ️ Firebase no configurado — usando solo almacenamiento local.');
}

export { app, db };
export default app;
