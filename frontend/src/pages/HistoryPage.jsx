import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { getHistory } from "../services/api";

const riskColors = {
  CRITICAL: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  HIGH: { bg: "rgba(249,115,22,0.15)", text: "#f97316", border: "rgba(249,115,22,0.3)" },
  MEDIUM: { bg: "rgba(234,179,8,0.15)", text: "#eab308", border: "rgba(234,179,8,0.3)" },
  LOW: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  UNKNOWN: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "rgba(100,116,139,0.3)" },
};

function getErrorMessage(error) {
  return error.response?.data?.message || error.response?.data?.error || "Unable to load analysis history.";
}

function getRiskLevel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  if (score > 0) return "LOW";
  return "UNKNOWN";
}

function RiskBadge({ level }) {
  const color = riskColors[level] || riskColors.UNKNOWN;

  return (
    <span className="px-2 py-1 rounded text-xs font-medium border" style={{ background: color.bg, color: color.text, borderColor: color.border }}>
      {level}
    </span>
  );
}

function LoadingState() {
  return (
    <MainLayout>
      <div className="min-h-full p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(37,99,235,0.15)" }}>
            <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          </div>
          <h1 className="text-lg font-semibold text-white">Loading history</h1>
          <p className="text-sm text-slate-400 mt-2">Fetching saved analysis runs...</p>
        </div>
      </div>
    </MainLayout>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const response = await getHistory();
        const history = response.data?.history || response.data?.runs || response.data || [];

        if (active) {
          setRuns(Array.isArray(history) ? history : []);
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

    loadHistory();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="rounded-xl p-5 border border-red-500/30 text-red-300" style={{ background: "rgba(239,68,68,0.1)" }}>
            {error}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analysis History</h1>
          <p className="text-slate-400 text-sm mt-1">Review previous cloud anomaly detection runs</p>
        </div>

        <div className="rounded-xl border border-slate-700/50 overflow-hidden" style={{ background: "rgba(15,22,41,0.8)" }}>
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h2 className="text-sm font-semibold text-white">Saved Runs</h2>
          </div>

          {runs.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Run Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Risk Score</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Risk Level</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const runId = run.run_id || run.id;
                  const score = Number(run.risk_score ?? 0);
                  const level = run.risk_level || getRiskLevel(score);
                  const color = riskColors[level] || riskColors.UNKNOWN;

                  return (
                    <tr
                      key={runId}
                      onClick={() => navigate(`/results/${runId}`)}
                      className="border-b border-slate-700/20 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 text-sm text-white">{run.run_name || `Run #${runId}`}</td>
                      <td className="px-5 py-3 text-sm text-slate-400">{run.created_at || run.timestamp || "-"}</td>
                      <td className="px-5 py-3 text-sm font-mono" style={{ color: color.text }}>{score.toFixed(1)}</td>
                      <td className="px-5 py-3"><RiskBadge level={level} /></td>
                      <td className="px-5 py-3 text-sm text-slate-300">{run.status || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-10 text-center">
              <h2 className="text-white font-semibold">No runs available</h2>
              <p className="text-slate-400 text-sm mt-2">Run an analysis to start building your history.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
