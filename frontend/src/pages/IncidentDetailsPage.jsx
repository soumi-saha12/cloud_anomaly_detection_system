import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { getIncident } from "../services/api";

const riskColors = {
  CRITICAL: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  HIGH: { bg: "rgba(249,115,22,0.15)", text: "#f97316", border: "rgba(249,115,22,0.3)" },
  MEDIUM: { bg: "rgba(234,179,8,0.15)", text: "#eab308", border: "rgba(234,179,8,0.3)" },
  LOW: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  UNKNOWN: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "rgba(100,116,139,0.3)" },
};

function getErrorMessage(error) {
  return error.response?.data?.message || error.response?.data?.error || "Unable to load incident details.";
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

export default function IncidentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadIncident() {
      setLoading(true);
      setError("");

      try {
        const response = await getIncident(id);
        const data = response.data ?? null;

        if (active) {
          setIncident(data || null);
        }
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadIncident();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-full p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(37,99,235,0.15)" }}>
              <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            </div>
            <h1 className="text-lg font-semibold text-white">Loading incident</h1>
            <p className="text-sm text-slate-400 mt-2">Fetching incident #{id}...</p>
          </div>
        </div>
      </MainLayout>
    );
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

  if (!incident) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="rounded-xl p-8 border border-slate-700/50 text-center" style={{ background: "rgba(15,22,41,0.8)" }}>
            <h1 className="text-white font-semibold">Incident not found</h1>
            <p className="text-slate-400 text-sm mt-2">No incident matches the provided ID.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const score = Number(incident.risk_score ?? incident.score ?? 0);
  const level = incident.risk_level || incident.severity || getRiskLevel(score);
  const mlExplanation = incident.explanations || incident.ml_explanation || incident.explanation || [];

  return (
    <MainLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Incident Details</h1>
            <p className="text-slate-400 text-sm mt-1">ID: {id}</p>
          </div>
          <div className="flex items-center gap-3">
            {incident.run_id && (
              <button
                className="px-3 py-2 text-sm rounded bg-slate-800 border border-slate-700 text-slate-200"
                onClick={() => navigate(`/results/${incident.run_id}`)}
              >
                View Run #{incident.run_id}
              </button>
            )}
            <button
              className="px-3 py-2 text-sm rounded bg-slate-700/30 border border-slate-700 text-white"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Type</p>
            <p className="text-lg font-semibold text-white">{incident.incident_type || incident.type || "Unknown"}</p>
          </div>

          <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Severity</p>
            <p className="text-lg font-semibold text-white">{incident.severity || incident.risk_level || "-"}</p>
          </div>

          <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Risk Score</p>
            <p className="text-lg font-semibold text-white">{Number(score).toFixed(1)}</p>
            <div className="mt-2"><RiskBadge level={level} /></div>
          </div>
        </div>

        <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
          <h2 className="text-sm font-semibold text-white mb-2">Description</h2>
          <p className="text-sm text-slate-300 leading-6">{incident.description || incident.incident_summary || "No description available."}</p>
        </div>

        <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">ML Explanation</h2>
          </div>

          {Array.isArray(mlExplanation) && mlExplanation.length > 0 ? (
            <div className="space-y-2">
              {mlExplanation.map((ex, idx) => (
                <div key={idx} className="text-sm text-slate-400 rounded-lg px-3 py-2 border border-slate-700/40" style={{ background: "rgba(255,255,255,0.03)" }}>
                  {ex}
                </div>
              ))}
            </div>
          ) : typeof mlExplanation === "string" && mlExplanation ? (
            <p className="text-sm text-slate-300">{mlExplanation}</p>
          ) : (
            <p className="text-sm text-slate-400">No ML explanation available for this incident.</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
