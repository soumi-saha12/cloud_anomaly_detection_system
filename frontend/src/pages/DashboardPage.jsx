import { useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getDashboard } from "../services/api";

const riskColors = {
  CRITICAL: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", border: "rgba(239,68,68,0.3)" },
  HIGH: { bg: "rgba(249,115,22,0.15)", text: "#f97316", border: "rgba(249,115,22,0.3)" },
  MEDIUM: { bg: "rgba(234,179,8,0.15)", text: "#eab308", border: "rgba(234,179,8,0.3)" },
  LOW: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "rgba(34,197,94,0.3)" },
  UNKNOWN: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "rgba(100,116,139,0.3)" },
};

const distributionMeta = [
  { key: "critical_incidents", name: "Critical", color: "#ef4444" },
  { key: "high_incidents", name: "High", color: "#f97316" },
  { key: "medium_incidents", name: "Medium", color: "#eab308" },
  { key: "low_incidents", name: "Low", color: "#22c55e" },
];

function getRiskLevel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  if (score > 0) return "LOW";
  return "UNKNOWN";
}

function getErrorMessage(error) {
  return error.response?.data?.message || error.response?.data?.error || "Unable to load dashboard data.";
}

function getRecentRuns(data) {
  return data?.recent_runs || data?.recent_analyses || data?.history || data?.runs || [];
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

function CenterState({ title, message }) {
  return (
    <MainLayout>
      <div className="min-h-full p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(37,99,235,0.15)" }}>
            <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          </div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
          {message && <p className="text-sm text-slate-400 mt-2">{message}</p>}
        </div>
      </div>
    </MainLayout>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const response = await getDashboard();

        if (active) {
          setDashboard(response.data);
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

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <CenterState title="Loading dashboard" message="Fetching latest cloud risk metrics..." />;
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

  const recentRuns = getRecentRuns(dashboard);
  const riskScore = Number(dashboard?.cloud_risk_score ?? dashboard?.risk_score ?? dashboard?.average_risk_score ?? 0);
  const riskLevel = dashboard?.risk_level || getRiskLevel(riskScore);
  const summary = dashboard?.summary || dashboard?.incident_summary || "No dashboard summary is available yet.";
  const totalAnalyses = dashboard?.total_analyses ?? recentRuns.length;
  const totalIncidents = dashboard?.total_incidents ?? 0;
  const color = riskColors[riskLevel] || riskColors.UNKNOWN;
  const riskDistribution = distributionMeta.map((item) => ({
    ...item,
    value: dashboard?.[item.key] ?? 0,
  }));
  const hasDistribution = riskDistribution.some((item) => item.value > 0);
  const hasData = Boolean(dashboard && (totalAnalyses > 0 || totalIncidents > 0 || riskScore > 0 || recentRuns.length > 0));

  if (!hasData) {
    return (
      <MainLayout>
        <div className="p-8 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Cloud security analytics overview</p>
          </div>
          <div className="rounded-xl p-8 border border-slate-700/50 text-center" style={{ background: "rgba(15,22,41,0.8)" }}>
            <h2 className="text-white font-semibold">No dashboard data yet</h2>
            <p className="text-slate-400 text-sm mt-2">Run an analysis to generate cloud risk metrics and incidents.</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Cloud security analytics overview</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Cloud Risk Score" value={riskScore.toFixed(1)} sub="Current overall risk" accent={color.text} />
          <StatCard label="Risk Level" value={riskLevel} sub="Latest calculated severity" accent={color.text} />
          <StatCard label="Total Analyses" value={totalAnalyses} sub="Runs linked to this account" />
          <StatCard label="Total Incidents" value={totalIncidents} sub="Detected correlated events" accent="#60a5fa" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
            <h2 className="text-sm font-semibold text-white mb-3">Summary</h2>
            <div className="inline-flex px-2 py-1 rounded text-xs font-medium border mb-4" style={{ background: color.bg, color: color.text, borderColor: color.border }}>
              {riskLevel}
            </div>
            <p className="text-sm text-slate-300 leading-6">{summary}</p>
          </div>

          <div className="rounded-xl p-5 border border-slate-700/50" style={{ background: "rgba(15,22,41,0.8)" }}>
            <h2 className="text-sm font-semibold text-white mb-4">Risk Distribution</h2>
            {hasDistribution ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={0}>
                      {riskDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0f1629", border: "1px solid #1e3a5f", borderRadius: 8, color: "#e2e8f0" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {riskDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-slate-400 text-xs">{item.name}</span>
                      <span className="text-white text-xs font-medium ml-auto pl-4">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No incident distribution is available yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 overflow-hidden" style={{ background: "rgba(15,22,41,0.8)" }}>
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h2 className="text-sm font-semibold text-white">Recent Analyses</h2>
          </div>
          {recentRuns.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Run Name</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Risk Level</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Risk Score</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => {
                  const level = run.risk_level || getRiskLevel(Number(run.risk_score ?? 0));
                  const runColor = riskColors[level] || riskColors.UNKNOWN;

                  return (
                    <tr key={run.run_id || run.id} className="border-b border-slate-700/20 hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3 text-sm text-white">{run.run_name || `Run #${run.run_id || run.id}`}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium border" style={{ background: runColor.bg, color: runColor.text, borderColor: runColor.border }}>
                          {level}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-mono" style={{ color: runColor.text }}>
                        {Number(run.risk_score ?? 0).toFixed(1)}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-400">{run.created_at || run.timestamp || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-8 text-sm text-slate-400">No recent analysis runs are available.</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
