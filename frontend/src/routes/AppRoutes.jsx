import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";
import RunAnalysisPage from "../pages/RunAnalysisPage";
import ResultsPage from "../pages/ResultsPage";
import HistoryPage from "../pages/HistoryPage";
import IncidentDetailsPage from "../pages/IncidentDetailsPage";

function ProtectedRoute({ children }) {
  const { loading } = useAuth();
  const hasToken = Boolean(localStorage.getItem("access_token"));

  if (loading && hasToken) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        Loading...
      </div>
    );
  }

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const hasToken = Boolean(localStorage.getItem("access_token"));

  if (hasToken) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/run-analysis" element={<ProtectedRoute><RunAnalysisPage /></ProtectedRoute>} />
        <Route path="/results/:runId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetailsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
