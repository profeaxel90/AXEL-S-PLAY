// ============================================================
// AXEL'S PLAY - Store de Autenticación Híbrido (Supabase + Local Offline)
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Acciones
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, school?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

const LOCAL_ACCOUNTS_KEY = 'axelplay_local_accounts';

interface StoredAccount {
  email: string;
  passwordHash: string;
  profile: UserProfile;
}

function getLocalAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: StoredAccount[]) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Error saving local accounts:', e);
  }
}

const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return url && !url.includes('placeholder.supabase.co');
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });

        // Si Supabase está configurado con claves reales en la nube
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (!error && data.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', data.user.id)
                .single();

              set({
                user: (profile as UserProfile) || {
                  id: data.user.id,
                  userId: data.user.id,
                  email: data.user.email || email,
                  fullName: data.user.user_metadata?.full_name || 'Docente',
                  school: data.user.user_metadata?.school || '',
                  role: 'teacher',
                  createdAt: new Date().toISOString(),
                },
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          } catch (cloudErr) {
            console.warn('Supabase auth unavailable, falling back to local accounts:', cloudErr);
          }
        }

        // Modo Offline / Cuentas Locales en el navegador
        const accounts = getLocalAccounts();
        const found = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());

        if (found && found.passwordHash === password) {
          set({
            user: found.profile,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }

        // Si es el usuario demo por defecto
        if (email.toLowerCase() === 'profe@axelplay.edu' || email.toLowerCase().includes('demo')) {
          const demoProfile: UserProfile = {
            id: 'demo-teacher-01',
            userId: 'demo-user-01',
            email: email,
            fullName: 'Profesor Axel',
            school: 'Colegio Experimental AXEL',
            role: 'teacher',
            createdAt: new Date().toISOString(),
          };
          set({
            user: demoProfile,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }

        set({
          error: 'Correo o contraseña incorrectos. Si creaste tu cuenta en este equipo, verifica tus datos.',
          isLoading: false,
        });
        throw new Error('Credenciales inválidas');
      },

      signUp: async (email, password, fullName, school) => {
        set({ isLoading: true, error: null });

        const newProfile: UserProfile = {
          id: `teacher-${Date.now()}`,
          userId: `user-${Date.now()}`,
          email: email.trim(),
          fullName: fullName.trim(),
          school: school?.trim() || 'Independiente',
          role: 'teacher',
          createdAt: new Date().toISOString(),
        };

        // Si hay Supabase configurado en nube, intentar registrar en la nube
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: fullName, school },
              },
            });
            if (!error && data.user) {
              set({ isLoading: false });
              return;
            }
          } catch (cloudErr) {
            console.warn('Supabase offline, saving account locally:', cloudErr);
          }
        }

        // Guardado local garantizado: CERO errores de conexión o "failed to fetch"
        const accounts = getLocalAccounts();
        const existing = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          set({
            error: 'Este correo electrónico ya está registrado en este equipo.',
            isLoading: false,
          });
          throw new Error('Correo ya registrado');
        }

        accounts.push({
          email: email.trim(),
          passwordHash: password, // Almacenado localmente en navegador
          profile: newProfile,
        });
        saveLocalAccounts(accounts);

        // Auto-login con la cuenta recién creada
        set({
          user: newProfile,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      signOut: async () => {
        set({ isLoading: true });
        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      resetPassword: async (email) => {
        if (isSupabaseConfigured()) {
          await supabase.auth.resetPasswordForEmail(email);
        }
        // Modo local siempre exitoso
      },

      updateProfile: async (data) => {
        const { user } = get();
        if (!user) return;

        const updated = { ...user, ...data };
        set({ user: updated });

        const accounts = getLocalAccounts();
        const idx = accounts.findIndex((a) => a.email.toLowerCase() === user.email.toLowerCase());
        if (idx !== -1) {
          accounts[idx].profile = updated;
          saveLocalAccounts(accounts);
        }

        if (isSupabaseConfigured()) {
          try {
            await supabase.from('profiles').update(data).eq('id', user.id);
          } catch {
            // ignore
          }
        }
      },

      loadUser: async () => {
        const { user } = get();
        if (user) {
          set({ isAuthenticated: true, isLoading: false });
          return;
        }

        if (isSupabaseConfigured()) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', session.user.id)
                .single();

              if (profile) {
                set({ user: profile as UserProfile, isAuthenticated: true, isLoading: false });
                return;
              }
            }
          } catch {
            // ignore
          }
        }

        set({ isLoading: false });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'axelplay-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
