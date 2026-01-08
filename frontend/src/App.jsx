import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ClassroomLayout from './components/ClassroomLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ClassroomsPage from './pages/ClassroomsPage';
import ClassroomDashboard from './pages/ClassroomDashboard';
import DocumentViewerPage from './pages/DocumentViewerPage';
import ChatPage from './pages/ChatPage';
import FlashcardsPage from './pages/FlashcardsPage';
import QuizPage from './pages/QuizPage';
import SummaryPage from './pages/SummaryPage';
import NotesPage from './pages/NotesPage';
import AdminPage from './pages/AdminPage';
import AccountPage from './pages/AccountPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navigate to="/classrooms" replace />
              </ProtectedRoute>
            }
          />
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
            <Route path="documents/:docId" element={<DocumentViewerPage />} />
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
          {/* Redirect unknown routes to classrooms */}
          <Route path="*" element={<Navigate to="/classrooms" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
