import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';

// ── Layouts ──
import TeacherLayout from './components/teacher/TeacherLayout';
import PublicLayout from './components/common/PublicLayout';

// ── Páginas públicas ──
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// ── Acceso por QR (estudiante sin cuenta) ──
import JoinPage from './pages/student/JoinPage';
import WaitingRoomPage from './pages/student/WaitingRoomPage';
import GameStudentPage from './pages/student/GameStudentPage';
import ResultsStudentPage from './pages/student/ResultsStudentPage';

// ── Panel docente ──
import DashboardPage from './pages/teacher/DashboardPage';
import GamesPage from './pages/teacher/GamesPage';
import GameEditorPage from './pages/teacher/GameEditorPage';
import QuestionBankPage from './pages/teacher/QuestionBankPage';
import SessionPage from './pages/teacher/SessionPage';
import AnalyticsPage from './pages/teacher/AnalyticsPage';
import SessionHistoryPage from './pages/teacher/SessionHistoryPage';
import ProfilePage from './pages/teacher/ProfilePage';

// ── Guard de autenticación ──
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-xl font-bold">Cargando AXEL PLAY...</p>
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
      <Routes>
        {/* ── Públicas ── */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* ── Acceso QR Estudiante (sin auth) ── */}
        <Route path="/join/:token" element={<JoinPage />} />
        <Route path="/waiting/:sessionId" element={<WaitingRoomPage />} />
        <Route path="/game/:sessionId" element={<GameStudentPage />} />
        <Route path="/results/:sessionId" element={<ResultsStudentPage />} />

        {/* ── Panel Docente (requiere autenticación) ── */}
        <Route element={<RequireAuth><TeacherLayout /></RequireAuth>}>
          <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
          <Route path="/teacher/dashboard" element={<DashboardPage />} />
          <Route path="/teacher/games" element={<GamesPage />} />
          <Route path="/teacher/games/new" element={<GameEditorPage />} />
          <Route path="/teacher/games/:gameId/edit" element={<GameEditorPage />} />
          <Route path="/teacher/games/:gameId/session" element={<SessionPage />} />
          <Route path="/teacher/questions" element={<QuestionBankPage />} />
          <Route path="/teacher/analytics" element={<AnalyticsPage />} />
          <Route path="/teacher/history" element={<SessionHistoryPage />} />
          <Route path="/teacher/profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
