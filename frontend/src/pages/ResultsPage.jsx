import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import AnalysisOutput from "../components/AnalysisOutput";
import api from "../services/api";

function getErrorMessage(error) {
  return error.response?.data?.message || error.response?.data?.error || "Unable to load analysis results.";
}

export default function ResultsPage() {
  const { runId } = useParams();
  const location = useLocation();
  const [result, setResult] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadResults() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/history/${runId}`);

        if (active) {
          setResult(response.data);
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (runId && !location.state?.result) {
      loadResults();
    }

    return () => {
      active = false;
    };
  }, [runId, location.state]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-panel-bg">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-panel-primary/10 border border-panel-primary/20">
              <div className="w-5 h-5 rounded-full border-2 border-panel-primary border-t-transparent animate-spin" />
            </div>
            <h1 className="text-base font-medium text-panel-text font-heading">Compiling analysis</h1>
            <p className="text-xs text-panel-subtext mt-1 font-body">Fetching threat correlation results...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="app-page-shell">
          <div className="app-page-container">
          <div className="rounded-[16px] p-5 border border-panel-danger/30 text-panel-danger bg-panel-danger/10">
            <h3 className="font-medium text-sm font-heading">Results Loading Error</h3>
            <p className="text-xs mt-1 font-body">{error}</p>
          </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!result) {
    return (
      <MainLayout>
        <div className="app-page-shell">
          <div className="app-page-container">
          <div className="rounded-[16px] p-10 border border-panel-border bg-[#0f0f1a] text-center shadow-[var(--shadow-resting)]">
            <h2 className="text-panel-text font-medium text-[16px] font-heading">No analysis results found</h2>
            <p className="text-panel-subtext text-sm mt-2 font-body">The requested analysis run output does not exist.</p>
          </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="app-page-shell">
        <div className="app-page-container">
          <AnalysisOutput result={result} runId={runId} showBackLink />
        </div>
      </div>
    </MainLayout>
  );
}
