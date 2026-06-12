import { useEffect, useState } from "react";
import { useLocation, useParams, Link } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import api from "../services/api";

const riskColors = {
  CRITICAL: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  HIGH: { bg: "rgba(249,115,22,0.15)", text: "#f97316", border: "rgba(249,115,22,0.3)" },
  MEDIUM: { bg: "rgba(234,179,8,0.15)", text: "#eab308", border: "rgba(234,179,8,0.3)" },
  LOW: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  UNKNOWN: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "rgba(100,116,139,0.3)" },
};

const sourceLabels = {
  auth: "Authentication Anomalies",
  api: "API Anomalies",
  system: "System Anomalies",
};

function getErrorMessage(error) {
  return error.response?.data?.message || error.response?.data?.error || "Unable to load analysis results.";
}

function getRiskLevel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  if (score > 0) return "LOW";
  return "UNKNOWN";
}

function normalizeSourceResults(result) {
  if (Array.isArray(result?.source_results)) {
    return result.source_results;
  }

  return ["auth", "api", "system"].map((sourceType) => ({
    source_type: sourceType,
    total_records: result?.[`${sourceType}_total`] ?? 0,
    anomaly_count: result?.[`${sourceType}_anomalies`] ?? 0,
    anomaly_percentage: 0,
  }));
}

function normalizeIncidents(result) {
  if (Array.isArray(result?.incidents)) {
    return result.incidents;
  }

  if (result?.incident) {
    return [result.incident];
  }

  if (result?.incident_summary || result?.summary) {
    return [{
      id: result.run_id || result.id || "summary",
      risk_level: result.risk_level,
      incident_summary: result.incident_summary || result.summary,
      explanations: result.explanations || [],
    }];
  }

  return [];
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
      <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold mb-1" style={{ color: accent || "#fff" }}>{value}</p>
      {sub && <p className="text-slate-500 text-xs">{sub}</p>}
    </div>
  );
}

function RiskBadge({ level }) {
  const color = riskColors[level] || riskColors.UNKNOWN;

  return (
    <span className="px-2 py-1 rounded text-xs font-medium border" style={{ background: color.bg, color: color.text, borderColor: color.border }}>
      {level}
    </span>
  );
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

    if (runId) {
      loadResults();
    }

    return () => {
      active = false;
    };
  }, [runId]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-full p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(37,99,235,0.15)" }}>
              <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            </div>
            <h1 className="text-lg font-semibold text-white">Loading results</h1>
            <p className="text-sm text-slate-400 mt-2">Fetching analysis run #{runId}...</p>
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

  if (!result) {
    return (
      <MainLayout>
        <div className="p-8">
          <div className="rounded-xl p-8 border border-slate-700/50 text-center" style={{ background: "rgba(15,22,41,0.8)" }}>
            <h1 className="text-white font-semibold">No results found</h1>
            <p className="text-slate-400 text-sm mt-2">This analysis run has no saved output.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const incident = result.incident || {};
  const riskScore = Number(result.risk_score ?? incident.risk_score ?? 0);
  const riskLevel = result.risk_level || incident.risk_level || getRiskLevel(riskScore);
  const summary = result.summary || incident.incident_summary || result.incident_summary || "No summary is available for this analysis.";
  const sourceResults = normalizeSourceResults(result);
  const incidents = normalizeIncidents(result);
  const color = riskColors[riskLevel] || riskColors.UNKNOWN;

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analysis Results</h1>
          <p className="text-slate-400 text-sm mt-1">
            {result.run_name || `Run #${runId}`}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Overall Risk Score" value={riskScore.toFixed(1)} sub="Correlated ML output" accent={color.text} />
          <StatCard label="Risk Level" value={riskLevel} sub="Overall severity" accent={color.text} />
          <StatCard label="Status" value={result.status || "completed"} sub={result.created_at || result.timestamp || "Saved analysis run"} />
        </div>

        <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-semibold text-white">Analysis Summary</h2>
            <RiskBadge level={riskLevel} />
          </div>
          <p className="text-sm text-slate-300 leading-6">{summary}</p>
        </div>

        <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
          <h2 className="text-sm font-semibold text-white mb-4">Correlation Output</h2>
          <div className="grid grid-cols-3 gap-4">
            {sourceResults.map((source) => (
              <div key={source.source_type} className="rounded-lg p-4 border border-slate-700/40" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                  {sourceLabels[source.source_type] || source.source_type}
                </p>
                <p className="text-2xl font-bold text-white">{source.anomaly_count ?? 0}</p>
                <p className="text-xs text-slate-500 mt-1">
                  of {source.total_records ?? 0} records
                  {source.anomaly_percentage !== undefined ? ` (${Number(source.anomaly_percentage).toFixed(2)}%)` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 overflow-hidden" style={{ background: "rgba(15,22,41,0.8)" }}>
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h2 className="text-sm font-semibold text-white">Detected Incidents</h2>
          </div>

          {incidents.length > 0 ? (
            <div className="divide-y divide-slate-700/40">
              {incidents.map((item) => {
                const itemLevel = item.risk_level || item.severity || riskLevel;
                const explanations = Array.isArray(item.explanations) ? item.explanations : [];
                const incidentId = item.id || item.incident_id || item.incidentId;

                const content = (
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <h3 className="text-sm font-semibold text-white">
                        {item.incident_type || "Correlated anomaly"}
                      </h3>
                      <RiskBadge level={itemLevel} />
                    </div>
                    <p className="text-sm text-slate-300 leading-6">
                      {item.description || item.incident_summary || "Incident details are not available."}
                    </p>
                    {explanations.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {explanations.map((explanation) => (
                          <div key={explanation} className="text-sm text-slate-400 rounded-lg px-3 py-2 border border-slate-700/40" style={{ background: "rgba(255,255,255,0.03)" }}>
                            {explanation}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );

                if (incidentId) {
                  return (
                    <Link to={`/incidents/${String(incidentId)}`} key={incidentId} className="block hover:bg-white/5 transition-colors">
                      {content}
                    </Link>
                  );
                }

                return (
                  <div key={item.id || item.incident_summary} className="p-5">
                    {content}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-400">No incidents were detected for this analysis run.</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
