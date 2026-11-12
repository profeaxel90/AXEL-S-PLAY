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
  resetPasswordWithNew: (email: string, newPassword: string) => Promise<boolean>;
  changePassword: (newPassword: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile> & { newPassword?: string }) => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  getAllTeachers: () => StoredAccount[];
  createTeacher: (data: { email: string; password: string; fullName: string; school?: string; role?: 'teacher' | 'superadmin' }) => StoredAccount;
  deleteTeacher: (email: string) => void;
}

const LOCAL_ACCOUNTS_KEY = 'axelplay_local_accounts';

export interface StoredAccount {
  email: string;
  passwordHash: string;
  profile: UserProfile;
}

function getLocalAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    const list: StoredAccount[] = raw ? JSON.parse(raw) : [];

    // Cuenta predeterminada de Super Administrador (Profe Axel)
    const existingIndex = list.findIndex(
      (a) => a.email.toLowerCase() === 'profe@axelsplay.edu' || a.email.toLowerCase() === 'profe@axelplay.edu'
    );

    if (existingIndex === -1) {
      const defaultAdmin: StoredAccount = {
        email: 'profe@axelsplay.edu',
        passwordHash: 'admin123',
        profile: {
          id: 'admin-axel-01',
          userId: 'user-axel-01',
          email: 'profe@axelsplay.edu',
          fullName: 'Profe Axel',
          school: 'Colegio Experimental AXEL',
          role: 'superadmin',
          createdAt: new Date().toISOString(),
        },
      };
      list.push(defaultAdmin);
      saveLocalAccounts(list);
    } else {
      // Actualizar nombre a "Profe Axel" y rol superadmin
      if (list[existingIndex].profile.fullName !== 'Profe Axel' || list[existingIndex].profile.role !== 'superadmin') {
        list[existingIndex].profile.fullName = 'Profe Axel';
        list[existingIndex].profile.role = 'superadmin';
        saveLocalAccounts(list);
      }
    }
    return list;
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
        const found = accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());

        if (found && (found.passwordHash === password || (email.toLowerCase().includes('profe@') && (password === 'admin123' || password === 'admin')))) {
          set({
            user: found.profile,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }

        // Si es el usuario demo o profe por defecto
        if (email.toLowerCase() === 'profe@axelsplay.edu' || email.toLowerCase() === 'profe@axelplay.edu' || email.toLowerCase().includes('demo')) {
          const demoProfile: UserProfile = found?.profile || {
            id: 'admin-axel-01',
            userId: 'user-axel-01',
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
          try {
            await supabase.auth.resetPasswordForEmail(email);
          } catch (e) {
            console.warn('Supabase reset password fallback to local:', e);
          }
        }
      },

      resetPasswordWithNew: async (email: string, newPassword: string) => {
        const cleanEmail = email.trim().toLowerCase();
        const accounts = getLocalAccounts();
        const idx = accounts.findIndex((a) => a.email.toLowerCase() === cleanEmail);

        if (idx !== -1) {
          accounts[idx].passwordHash = newPassword;
          saveLocalAccounts(accounts);
          return true;
        }

        // Si la cuenta es profe@axelsplay.edu o una cuenta del docente no listada, crearla o actualizarla
        const newAcc: StoredAccount = {
          email: cleanEmail,
          passwordHash: newPassword,
          profile: {
            id: `teacher-${Date.now()}`,
            userId: `user-${Date.now()}`,
            email: cleanEmail,
            fullName: 'Profesor Axel',
            school: 'Colegio Experimental AXEL',
            role: 'teacher',
            createdAt: new Date().toISOString(),
          },
        };
        accounts.push(newAcc);
        saveLocalAccounts(accounts);
        return true;
      },

      changePassword: async (newPassword: string) => {
        const { user } = get();
        if (!user) throw new Error('Usuario no autenticado');

        const accounts = getLocalAccounts();
        const idx = accounts.findIndex((a) => a.email.toLowerCase() === user.email.toLowerCase());
        if (idx !== -1) {
          accounts[idx].passwordHash = newPassword;
          saveLocalAccounts(accounts);
        }

        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.updateUser({ password: newPassword });
          } catch (e) {
            console.warn('Supabase password update fallback to local:', e);
          }
        }
      },

      updateProfile: async (data) => {
        const { user } = get();
        if (!user) return;

        const { newPassword, ...profileData } = data;
        const updated = { ...user, ...profileData };
        set({ user: updated });

        const accounts = getLocalAccounts();
        const currentEmail = user.email.toLowerCase();
        const idx = accounts.findIndex((a) => a.email.toLowerCase() === currentEmail);

        if (idx !== -1) {
          accounts[idx].profile = updated;
          if (profileData.email) {
            accounts[idx].email = profileData.email.trim();
          }
          if (newPassword && newPassword.trim().length > 0) {
            accounts[idx].passwordHash = newPassword.trim();
          }
          saveLocalAccounts(accounts);
        } else {
          accounts.push({
            email: updated.email,
            passwordHash: newPassword?.trim() || 'admin123',
            profile: updated,
          });
          saveLocalAccounts(accounts);
        }

        if (isSupabaseConfigured()) {
          try {
            await supabase.from('profiles').update(profileData).eq('id', user.id);
            if (newPassword && newPassword.trim().length > 0) {
              await supabase.auth.updateUser({ password: newPassword });
            }
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

      getAllTeachers: () => {
        return getLocalAccounts();
      },

      createTeacher: (data) => {
        const accounts = getLocalAccounts();
        const existing = accounts.find((a) => a.email.toLowerCase() === data.email.trim().toLowerCase());
        if (existing) {
          throw new Error('Ya existe un docente con este correo.');
        }

        const newAccount: StoredAccount = {
          email: data.email.trim(),
          passwordHash: data.password.trim(),
          profile: {
            id: `teacher-${Date.now()}`,
            userId: `user-${Date.now()}`,
            email: data.email.trim(),
            fullName: data.fullName.trim(),
            school: data.school?.trim() || 'Colegio Experimental AXEL',
            role: data.role || 'teacher',
            createdAt: new Date().toISOString(),
          },
        };

        accounts.push(newAccount);
        saveLocalAccounts(accounts);
        return newAccount;
      },

      deleteTeacher: (email) => {
        const accounts = getLocalAccounts().filter((a) => a.email.toLowerCase() !== email.toLowerCase());
        saveLocalAccounts(accounts);
      },
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
