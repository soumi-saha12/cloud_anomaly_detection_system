import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import DashboardPage from "../pages/DashboardPage";
import RunAnalysisPage from "../pages/RunAnalysisPage";
import ResultsPage from "../pages/ResultsPage";
import HistoryPage from "../pages/HistoryPage";
import IncidentDetailsPage from "../pages/IncidentDetailsPage";
import AboutPage from "../pages/AboutPage";

function ProtectedRoute({ children }) {
  const { loading } = useAuth();
  const hasToken = Boolean(localStorage.getItem("access_token"));

  if (loading && hasToken) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#08080f] text-[#e2e0f0] font-body">
        <div className="w-10 h-10 rounded-full border-2 border-[#a78bfa] border-t-transparent animate-spin mb-4" />
        <span className="text-sm font-medium">Restoring session...</span>
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
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function FallbackRoute() {
  const hasToken = Boolean(localStorage.getItem("access_token"));
  return <Navigate to={hasToken ? "/dashboard" : "/"} replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Pages */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected Pages */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/run-analysis" element={<ProtectedRoute><RunAnalysisPage /></ProtectedRoute>} />
        <Route path="/results/:runId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetailsPage /></ProtectedRoute>} />
        <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />

        {/* Catch-all Fallback */}
        <Route path="*" element={<FallbackRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
