import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/Auth/LoginPage.jsx';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage.jsx';
import FirstResetPage from './pages/Auth/FirstResetPage.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import AdminQuizzes from './pages/Admin/AdminQuizzes.jsx';
import AdminQuestionManage from './pages/Admin/AdminQuestionManage.jsx';
import AdminStudents from './pages/Admin/AdminStudents.jsx';
import AdminLogs from './pages/Admin/AdminLogs.jsx';
import AdminQuestionBank from './pages/Admin/AdminQuestionBank.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import StudentDashboard from './pages/Student/StudentDashboard.jsx';
import StudentQuizzes from './pages/Student/StudentQuizzes.jsx';
import StudentProfile from './pages/Student/StudentProfile.jsx';
import StudentResults from './pages/Student/StudentResults.jsx';
import QuizTakePage from './pages/Quiz/QuizTakePage.jsx';
import ResultPage from './pages/Quiz/ResultPage.jsx';
import { useAuth } from './state/AuthContext.jsx';
import { LoadingScreen } from './components/Loading.jsx';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  if (role === 'student' && user.first_login) return <Navigate to="/first-reset" replace />;
  return children;
}

function FirstResetRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.first_login) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/student'} replace />;
  }
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.first_login) return <Navigate to="/first-reset" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/first-reset"
        element={
          <FirstResetRoute>
            <FirstResetPage />
          </FirstResetRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/quizzes"
        element={
          <ProtectedRoute role="admin">
            <AdminQuizzes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/quizzes/:quizId/questions"
        element={
          <ProtectedRoute role="admin">
            <AdminQuestionManage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/students"
        element={
          <ProtectedRoute role="admin">
            <AdminStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute role="admin">
            <AdminLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bank"
        element={
          <ProtectedRoute role="admin">
            <AdminQuestionBank />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/quizzes"
        element={
          <ProtectedRoute role="student">
            <StudentQuizzes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/results"
        element={
          <ProtectedRoute role="student">
            <StudentResults />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/profile"
        element={
          <ProtectedRoute role="student">
            <StudentProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/:quizId"
        element={
          <ProtectedRoute role="student">
            <QuizTakePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/result/:quizId"
        element={
          <ProtectedRoute role="student">
            <ResultPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

