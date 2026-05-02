import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TimerProvider } from './context/TimerContext';
import { ChatModeProvider } from './context/ChatModeContext';
import ProtectedRoute from './components/ProtectedRoute';
import PageTransition from './components/PageTransition';
import AdminRoute from './components/AdminRoute';
import ClassroomLayout from './components/ClassroomLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ClassroomsPage from './pages/ClassroomsPage';
import ClassroomDashboard from './pages/ClassroomDashboard';
import ClassroomDocumentsPage from './pages/ClassroomDocumentsPage';
import DocumentViewerPage from './pages/DocumentViewerPage';
import AudioDetailPage from './pages/AudioDetailPage';
import ChatPage from './pages/ChatPage';
import FlashcardsPage from './pages/FlashcardsPage';
import QuizPage from './pages/QuizPage';
import SummaryPage from './pages/SummaryPage';
import NotesPage from './pages/NotesPage';
import AdminPage from './pages/AdminPage';
import AccountPage from './pages/AccountPage';
import SettingsPage from './pages/SettingsPage';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Must render inside AuthProvider
function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/classrooms" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
            <Route path="/" element={<GuestRoute><PageTransition><LandingPage /></PageTransition></GuestRoute>} />
            <Route path="/login" element={<GuestRoute><PageTransition><LoginPage /></PageTransition></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><PageTransition><RegisterPage /></PageTransition></GuestRoute>} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/classrooms"
              element={
                <ProtectedRoute>
                  <ClassroomsPage />
                </ProtectedRoute>
              }
            />

            {/* Classroom routes with shared layout */}
            <Route
              path="/classrooms/:id"
              element={
                <ProtectedRoute>
                  <ClassroomLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ClassroomDashboard />} />
              <Route path="documents" element={<ClassroomDocumentsPage />} />
              <Route path="documents/:docId" element={<DocumentViewerPage />} />
              <Route path="audio/:docId" element={<AudioDetailPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="flashcards" element={<FlashcardsPage />} />
              <Route path="quizzes" element={<QuizPage />} />
              <Route path="summaries" element={<SummaryPage />} />
              <Route path="notes" element={<NotesPage />} />
            </Route>

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <ChatModeProvider>
            <TimerProvider>
              <AppRoutes />
            </TimerProvider>
          </ChatModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
