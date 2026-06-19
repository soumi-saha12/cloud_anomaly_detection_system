import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api, { getIncident } from "../services/api";

const riskColors = {
  CRITICAL: { bg: "bg-[rgba(239,68,68,0.15)]", text: "text-[#f87171]", border: "border-[rgba(239,68,68,0.3)]", hex: "#f87171" },
  HIGH: { bg: "bg-[rgba(251,146,60,0.15)]", text: "text-[#fb923c]", border: "border-[rgba(251,146,60,0.3)]", hex: "#fb923c" },
  MEDIUM: { bg: "bg-[rgba(250,204,21,0.15)]", text: "text-[#fbbf24]", border: "border-[rgba(250,204,21,0.3)]", hex: "#fbbf24" },
  LOW: { bg: "bg-[rgba(74,222,128,0.15)]", text: "text-[#4ade80]", border: "border-[rgba(74,222,128,0.3)]", hex: "#4ade80" },
  UNKNOWN: { bg: "bg-[rgba(167,139,250,0.15)]", text: "text-[#a78bfa]", border: "border-[rgba(167,139,250,0.3)]", hex: "#a78bfa" },
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
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${color.bg} ${color.text} ${color.border}`}>
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
        // Step 1: Query the user's active incident log list to resolve the run_id for this incident ID
        const listResponse = await api.get("/incidents");
        const list = listResponse.data?.incidents || [];
        const match = list.find(item => Number(item.incident_id || item.id) === Number(id));

        if (match && match.run_id) {
          // Step 2: Fetch full analysis details to load explanations and description
          const runResponse = await api.get(`/history/${match.run_id}`);
          const runData = runResponse.data;
          if (runData && runData.incident) {
            if (active) {
              setIncident({
                ...runData.incident,
                run_name: runData.run_name
              });
              setLoading(false);
            }
            return;
          }
        }

        // Fallback: Try direct API call
        const directResponse = await getIncident(id);
        if (active) {
          setIncident(directResponse.data || null);
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

    loadIncident();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-panel-bg">
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-panel-primary/10 border border-panel-primary/20">
              <div className="w-5 h-5 rounded-full border-2 border-panel-primary border-t-transparent animate-spin" />
            </div>
            <h1 className="text-base font-medium text-panel-text font-heading">Retrieving incident details</h1>
            <p className="text-xs text-panel-subtext mt-1 font-body">Fetching telemetry correlation details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="rounded-2xl p-5 border border-panel-danger/30 text-panel-danger bg-panel-danger/10">
            <h3 className="font-medium text-sm font-heading">Incident Loading Error</h3>
            <p className="text-xs mt-1 font-body">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!incident) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="rounded-[16px] p-10 border border-panel-border bg-panel-card text-center shadow-sm">
            <h2 className="text-panel-text font-medium text-[16px] font-heading">Incident not found</h2>
            <p className="text-panel-subtext text-sm mt-2 font-body">No security incident matches the provided ID.</p>
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
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-panel-primary/10 via-panel-card to-transparent border-b border-panel-border/30 p-8">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-medium text-panel-text tracking-tight inline-block font-heading">
              Incident Correlation Details
              <div className="w-16 h-1 bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] rounded-full mt-2" />
            </h1>
            <p className="text-panel-subtext text-xs mt-1 font-normal font-body font-semibold">Incident Reference: ID #{id}</p>
          </div>
          <div className="flex items-center gap-3">
            {incident.run_id && (
              <button
                className="px-5 py-2 text-xs font-semibold rounded-[50px] border border-[#a78bfa] bg-transparent text-[#a78bfa] hover:bg-[#a78bfa]/5 hover:shadow-[0_0_16px_rgba(167,139,250,0.2)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer font-body shadow-sm"
                onClick={() => navigate(`/results/${incident.run_id}`)}
              >
                View Telemetry Run #{incident.run_id}
              </button>
            )}
            <button
              className="px-6 py-2.5 text-xs font-semibold rounded-[50px] bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] text-white hover:opacity-95 shadow-md shadow-[#a78bfa]/30 hover:shadow-[0_0_16px_rgba(167,139,250,0.5)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer font-body"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="py-10 px-12 space-y-6 w-full font-body">
        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-[16px] py-6 px-8 border border-panel-border bg-panel-card shadow-2xl shadow-black/60 backdrop-blur-md space-y-1.5 hover:bg-panel-card-hover hover:border-[#a78bfa]/30 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(167,139,250,0.18)] transition-all duration-200">
            <p className="text-panel-subtext text-xs font-normal uppercase tracking-wider">Classification Type</p>
            <p className="text-base font-semibold text-panel-text font-heading">{incident.incident_type || incident.type || "Correlated Incident"}</p>
          </div>

          <div className="rounded-[16px] py-6 px-8 border border-panel-border bg-panel-card shadow-2xl shadow-black/60 backdrop-blur-md space-y-1.5 hover:bg-panel-card-hover hover:border-[#a78bfa]/30 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(167,139,250,0.18)] transition-all duration-200">
            <p className="text-panel-subtext text-xs font-normal uppercase tracking-wider">Severity Classification</p>
            <div className="pt-0.5"><RiskBadge level={level} /></div>
          </div>

          <div className="rounded-[16px] py-6 px-8 border border-panel-border bg-panel-card shadow-2xl shadow-black/60 backdrop-blur-md space-y-1.5 hover:bg-panel-card-hover hover:border-[#a78bfa]/30 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(167,139,250,0.18)] transition-all duration-200">
            <p className="text-panel-subtext text-xs font-normal uppercase tracking-wider">Risk Severity Score</p>
            <p className="text-[32px] font-semibold text-panel-primary font-heading leading-tight font-mono">{Number(score).toFixed(1)}</p>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-[16px] py-6 px-8 border border-panel-border bg-panel-card shadow-2xl shadow-black/60 backdrop-blur-md space-y-3 hover:bg-panel-card-hover hover:border-[#a78bfa]/30 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(167,139,250,0.18)] transition-all duration-200">
          <h2 className="text-[16px] font-medium text-panel-text font-heading">Description</h2>
          <p className="text-sm text-panel-text leading-relaxed font-normal">
            {incident.description || incident.incident_summary || "No description available for this incident."}
          </p>
        </div>

        {/* ML Explanations */}
        <div className="rounded-[16px] py-6 px-8 border border-panel-border bg-panel-card shadow-2xl shadow-black/60 backdrop-blur-md space-y-4 hover:bg-panel-card-hover hover:border-[#a78bfa]/30 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(167,139,250,0.18)] transition-all duration-200">
          <h2 className="text-[16px] font-medium text-panel-text font-heading">Machine Learning Correlation Explanation</h2>

          {mlExplanation.length > 0 ? (
            <div className="space-y-3">
              {mlExplanation.map((ex, idx) => (
                <div key={idx} className="text-xs text-panel-subtext rounded-xl py-4 px-6 border border-panel-border/40 bg-panel-card-hover font-medium leading-relaxed font-body hover:border-[#a78bfa]/40 hover:bg-panel-card-hover hover:translate-x-1 transition-all duration-200">
                  {ex}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-panel-subtext font-semibold">No telemetry correlations logged for this incident.</p>
          )}
        </div>

      </div>
    </MainLayout>
  );
}
