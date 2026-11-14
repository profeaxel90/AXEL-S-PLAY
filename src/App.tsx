import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './stores/authStore';

// ── Layouts ──
import TeacherLayout from './components/teacher/TeacherLayout';
import PublicLayout from './components/common/PublicLayout';

// ── Páginas públicas (Carga diferida para velocidad ultra rápida) ──
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// ── Acceso por QR (estudiante sin cuenta) ──
const JoinPage = lazy(() => import('./pages/student/JoinPage'));
const WaitingRoomPage = lazy(() => import('./pages/student/WaitingRoomPage'));
const GameStudentPage = lazy(() => import('./pages/student/GameStudentPage'));
const ResultsStudentPage = lazy(() => import('./pages/student/ResultsStudentPage'));

// ── Asignación de Deberes ──
const HomeworkJoinPage = lazy(() => import('./pages/student/HomeworkJoinPage'));
const HomeworkPlayPage = lazy(() => import('./pages/student/HomeworkPlayPage'));
const StudentWorkspacePage = lazy(() => import('./pages/student/StudentWorkspacePage'));
const HomeworkPage = lazy(() => import('./pages/teacher/HomeworkPage'));

// ── Panel docente ──
const DashboardPage = lazy(() => import('./pages/teacher/DashboardPage'));
const GamesPage = lazy(() => import('./pages/teacher/GamesPage'));
const GameEditorPage = lazy(() => import('./pages/teacher/GameEditorPage'));
const QuestionBankPage = lazy(() => import('./pages/teacher/QuestionBankPage'));
const SessionPage = lazy(() => import('./pages/teacher/SessionPage'));
const AnalyticsPage = lazy(() => import('./pages/teacher/AnalyticsPage'));
const SessionHistoryPage = lazy(() => import('./pages/teacher/SessionHistoryPage'));
const ProfilePage = lazy(() => import('./pages/teacher/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/teacher/SettingsPage'));

// ── Componente de Carga Ultrarrápido ──
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-white text-sm font-bold">Cargando AXEL'S PLAY...</p>
      </div>
    </div>
  );
}

// ── Guard de autenticación ──
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-xl font-bold">Cargando AXEL'S PLAY...</p>
          <p className="text-purple-300 text-sm mt-1">Aprender jugando. Competir. Superar retos.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* ── Públicas ── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          {/* ── Acceso QR / PIN Estudiante (sin auth) ── */}
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/:token" element={<JoinPage />} />
          <Route path="/waiting/:sessionId" element={<WaitingRoomPage />} />
          <Route path="/game/:sessionId" element={<GameStudentPage />} />
          <Route path="/results/:sessionId" element={<ResultsStudentPage />} />

          {/* ── Asignación de Deberes (pública, sin auth) ── */}
          <Route path="/homework" element={<HomeworkJoinPage />} />
          <Route path="/homework/:pin" element={<HomeworkJoinPage />} />
          <Route path="/homework/play/:pin" element={<HomeworkPlayPage />} />
          <Route path="/homework/group/:groupCode" element={<StudentWorkspacePage />} />

          {/* ── Sala de Partida en Vivo en Pantalla Completa (Sin Sidebar lateral para 100% de espacio) ── */}
          <Route
            path="/teacher/games/:gameId/session"
            element={
              <RequireAuth>
                <SessionPage />
              </RequireAuth>
            }
          />

          {/* ── Panel Docente (requiere autenticación) ── */}
          <Route element={<RequireAuth><TeacherLayout /></RequireAuth>}>
            <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/teacher/dashboard" element={<DashboardPage />} />
            <Route path="/teacher/games" element={<GamesPage />} />
            <Route path="/teacher/games/new" element={<GameEditorPage />} />
            <Route path="/teacher/games/:gameId/edit" element={<GameEditorPage />} />
            <Route path="/teacher/questions" element={<QuestionBankPage />} />
            <Route path="/teacher/analytics" element={<AnalyticsPage />} />
            <Route path="/teacher/history" element={<SessionHistoryPage />} />
            <Route path="/teacher/homework" element={<HomeworkPage />} />
            <Route path="/teacher/settings" element={<SettingsPage />} />
            <Route path="/teacher/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
