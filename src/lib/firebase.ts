// ══════════════════════════════════════════════════════════════
// AXEL'S PLAY — Firebase Configuration
// Reemplaza Supabase como backend en la nube.
// Firebase NO pausa ni elimina proyectos inactivos en plan gratis.
// ══════════════════════════════════════════════════════════════

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Configuración directa (variables VITE_ son públicas en el navegador de todas formas)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAi31cG9fMA8sZKl0-yl8m85-OyuFAfWQo',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'axels-play.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'axels-play',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'axels-play.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '292205652881',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:292205652881:web:5c9fd6585c7dedc4664830',
};

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('🔥 Firebase conectado:', firebaseConfig.projectId);
} catch (e) {
  console.warn('⚠️ Error inicializando Firebase:', e);
}

export { app, db };
export default app;
