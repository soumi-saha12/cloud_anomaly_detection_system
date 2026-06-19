import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import api, { getDashboard, getHistory } from "../services/api";
import { getAnomalyCount } from "../utils/anomalyCounts";

const riskColors = {
  CRITICAL: { bg: "rgba(239,68,68,0.12)", text: "#f87171", border: "rgba(239,68,68,0.25)" },
  HIGH: { bg: "rgba(251,146,60,0.12)", text: "#fb923c", border: "rgba(251,146,60,0.25)" },
  MEDIUM: { bg: "rgba(250,204,21,0.12)", text: "#fbbf24", border: "rgba(250,204,21,0.25)" },
  LOW: { bg: "rgba(74,222,128,0.12)", text: "#4ade80", border: "rgba(74,222,128,0.25)" },
  UNKNOWN: { bg: "rgba(167,139,250,0.12)", text: "#a78bfa", border: "rgba(167,139,250,0.25)" },
};

const riskHex = {
  CRITICAL: "#f87171", HIGH: "#fb923c", MEDIUM: "#fbbf24", LOW: "#4ade80", UNKNOWN: "#a78bfa",
};

function getRiskLevel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  if (score > 0) return "LOW";
  return "UNKNOWN";
}

function RiskBadge({ level }) {
  const c = riskColors[level] || riskColors.UNKNOWN;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "6px",
      fontSize: "11px", fontWeight: 600,
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
      fontFamily: "'Outfit', sans-serif",
      letterSpacing: "0.03em",
    }}>
      {level}
    </span>
  );
}

const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  padding: "24px",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDashboardData() {
      setLoading(true);
      setError("");
      try {
        const dashboardRes = await getDashboard();
        const historyRes = await getHistory();
        if (!active) return;

        const dashData = dashboardRes.data;
        const historyData = historyRes.data?.history || historyRes.data?.runs || historyRes.data || [];

        let sourceAnomaliesData = [];
        const completedRuns = historyData.filter(r => r.status === "completed" || !r.status);
        if (completedRuns.length > 0) {
          const latestRunId = completedRuns[0].run_id || completedRuns[0].id;
          try {
            const latestRunRes = await api.get(`/history/${latestRunId}`);
            const latestRun = latestRunRes.data;
            if (latestRun && active) {
              const srcResults = latestRun.source_results || [];
              if (srcResults.length > 0) {
                sourceAnomaliesData = srcResults.map(res => ({
                  name: res.source_type === "auth" ? "Auth" : res.source_type === "api" ? "API" : "System",
                  Anomalies: res.anomaly_count,
                  Total: res.total_records,
                }));
              } else {
                sourceAnomaliesData = [
                  { name: "Auth", Anomalies: getAnomalyCount(latestRun, "auth"), Total: latestRun.auth_total || 0 },
                  { name: "API", Anomalies: getAnomalyCount(latestRun, "api"), Total: latestRun.api_total || 0 },
                  { name: "System", Anomalies: getAnomalyCount(latestRun, "system"), Total: latestRun.system_total || 0 },
                ];
              }
            }
          } catch { /* ignore */ }
        }

        setDashboard({
          ...dashData,
          recent_runs: historyData.slice(0, 5),
          source_anomalies: sourceAnomaliesData,
        });
      } catch (err) {
        if (active) setError(err.response?.data?.error || "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboardData();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "50%",
              border: "2px solid #a78bfa", borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
            }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div style={{ padding: "40px 48px" }}>
          <div style={{ ...card, borderColor: "rgba(248,113,113,0.25)", color: "#f87171", padding: "20px 24px" }}>
            <p style={{ fontWeight: 500 }}>Dashboard Error</p>
            <p style={{ fontSize: "13px", marginTop: "4px", color: "var(--text-secondary)" }}>{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const recentRuns = dashboard?.recent_runs || [];
  const validScores = recentRuns.filter(r => Number(r.risk_score ?? 0) > 0).map(r => Number(r.risk_score));
  const avgScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
  const riskScore = Number(dashboard?.average_risk_score || avgScore || 0);

  const completedRuns = recentRuns.filter(r => r.status === "completed" || !r.status);
  const latestLevel = completedRuns[0]?.risk_level || getRiskLevel(riskScore);
  const riskLevel = dashboard?.risk_level || latestLevel;

  const riskDist = dashboard?.risk_distribution || {
    CRITICAL: dashboard?.critical_incidents,
    HIGH: dashboard?.high_incidents,
    MEDIUM: dashboard?.medium_incidents,
    LOW: dashboard?.low_incidents,
  };
  const riskDistribution = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(k => ({
    name: k, value: Number(riskDist[k] || 0),
  }));
  const hasDistribution = riskDistribution.some(d => d.value > 0);

  const totalIncidents = dashboard?.total_incidents ?? riskDistribution.reduce((a, d) => a + d.value, 0);

  return (
    <MainLayout>
      <div style={{ padding: "40px 48px", minHeight: "100%", display: "flex", flexDirection: "column", gap: "32px" }}>

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "26px", fontWeight: 600, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>
              Dashboard
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px", fontFamily: "'Outfit', sans-serif" }}>
              Cloud security analytics overview
            </p>
          </div>
          <button
            onClick={() => navigate("/run-analysis")}
            style={{
              padding: "10px 22px", borderRadius: "10px",
              background: "#7c3aed", color: "white", border: "none",
              fontSize: "13px", fontWeight: 500, cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
              transition: "var(--transition-button)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.filter = "brightness(1.1)";
              e.currentTarget.style.boxShadow = "var(--shadow-active)";
              e.currentTarget.style.transform = "scale(1.02)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter = "none";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            + Run Analysis
          </button>
        </div>

        {/* Stat Cards — 4 columns */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {[
            { label: "Risk Score", value: riskScore.toFixed(1), sub: "Current overall risk" },
            { label: "Risk Level", value: riskLevel, sub: "Latest severity", isLevel: true },
            { label: "Total Analyses", value: dashboard?.total_analyses ?? recentRuns.length, sub: "Runs completed" },
            { label: "Active Incidents", value: totalIncidents, sub: "Detected events" },
          ].map((s) => (
            <div key={s.label} style={{
              ...card,
              transition: "var(--transition-card)",
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.35)";
                e.currentTarget.style.boxShadow = "var(--shadow-hover)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.12)";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <p style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'Outfit', sans-serif" }}>
                {s.label}
              </p>
              <div style={{ marginTop: "12px" }}>
                {s.isLevel ? (
                  <RiskBadge level={String(s.value)} />
                ) : (
                  <p style={{ fontSize: "36px", fontWeight: 700, color: "var(--accent)", lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                    {s.value}
                  </p>
                )}
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "10px", fontFamily: "'Outfit', sans-serif" }}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Charts — Line chart (wide) + Pie chart side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "20px" }}>

          {/* Line Chart — Risk Score Trend across recent runs */}
          <div style={{
            ...card, minHeight: "300px", display: "flex", flexDirection: "column",
            transition: "var(--transition-card)",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(167,139,250,0.3)";
              e.currentTarget.style.boxShadow = "var(--shadow-hover)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(167,139,250,0.12)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>Risk Score Trend</h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "3px", fontFamily: "'Outfit', sans-serif" }}>Anomaly counts across recent runs</p>
            </div>
            <div style={{ flex: 1 }}>
              {recentRuns.length > 1 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={[...recentRuns].reverse().map((r, i) => ({
                      name: r.run_name ? r.run_name.slice(0, 10) : `Run ${i + 1}`,
                      Auth: getAnomalyCount(r, "auth"),
                      API: getAnomalyCount(r, "api"),
                      System: getAnomalyCount(r, "system"),
                    }))}
                    margin={{ top: 5, right: 16, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="lineGradAuth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", fontSize: "12px", color: "var(--text-primary)" }}
                      cursor={{ stroke: "rgba(167,139,250,0.15)", strokeWidth: 1 }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)", paddingTop: "12px" }} />
                    <Line type="monotone" dataKey="Auth" stroke="#a78bfa" strokeWidth={2} dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="API" stroke="#67e8f9" strokeWidth={2} dot={{ fill: "#67e8f9", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="System" stroke="#fbbf24" strokeWidth={2} dot={{ fill: "#fbbf24", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : recentRuns.length === 1 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "220px", color: "var(--text-secondary)", fontSize: "13px" }}>
                  Run more analyses to see trend data
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "220px", color: "var(--text-secondary)", fontSize: "13px" }}>
                  No analysis runs yet
                </div>
              )}
            </div>
          </div>

          {/* Pie Chart — Risk Distribution */}
          <div style={{
            ...card, minHeight: "300px", display: "flex", flexDirection: "column",
            transition: "var(--transition-card)",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "rgba(167,139,250,0.3)";
              e.currentTarget.style.boxShadow = "var(--shadow-hover)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "rgba(167,139,250,0.12)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>Risk Distribution</h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "3px", fontFamily: "'Outfit', sans-serif" }}>Incidents by severity</p>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              {hasDistribution ? (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={riskDistribution.filter(d => d.value > 0)}
                        cx="50%" cy="50%"
                        innerRadius={48} outerRadius={72}
                        paddingAngle={4} dataKey="value" strokeWidth={0}
                      >
                        {riskDistribution.filter(d => d.value > 0).map(entry => (
                          <Cell key={entry.name} fill={riskHex[entry.name] || "#a78bfa"} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px", color: "var(--text-primary)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", marginTop: "8px" }}>
                    {riskDistribution.filter(d => d.value > 0).map(item => (
                      <div key={item.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: riskHex[item.name], flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "'Outfit', sans-serif", flex: 1 }}>{item.name}</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontSize: "13px", textAlign: "center" }}>No incidents logged yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Analyses */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>Recent Analyses</h2>
            <button
              onClick={() => navigate("/history")}
              className="interactive-button"
              style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "13px", cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}
            >
              View all →
            </button>
          </div>

          {recentRuns.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {recentRuns.map((run) => {
                const runId = run.run_id || run.id;
                const score = Number(run.risk_score ?? 0);
                const level = run.risk_level || getRiskLevel(score);

                return (
                  <div
                    key={runId}
                    style={{
                      ...card,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "24px",
                      transition: "var(--transition-row)",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "rgba(167,139,250,0.35)";
                      e.currentTarget.style.background = "var(--bg-card-hover)";
                      e.currentTarget.style.boxShadow = "var(--shadow-hover)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "rgba(167,139,250,0.12)";
                      e.currentTarget.style.background = "var(--bg-card)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Left */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {run.run_name || `Run #${runId}`}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "'Outfit', sans-serif" }}>
                        {run.created_at ? new Date(run.created_at).toLocaleString() : "-"}
                      </p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {[
                          { label: "Auth", val: getAnomalyCount(run, "auth"), color: "var(--accent)", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" },
                          { label: "API", val: getAnomalyCount(run, "api"), color: "#67e8f9", bg: "rgba(103,232,249,0.08)", border: "rgba(103,232,249,0.2)" },
                          { label: "System", val: getAnomalyCount(run, "system"), color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" },
                        ].map(p => (
                          <span key={p.label} style={{
                            fontSize: "11px", padding: "2px 8px", borderRadius: "5px",
                            color: p.color, background: p.bg, border: `1px solid ${p.border}`,
                            fontFamily: "'Outfit', sans-serif",
                          }}>
                            {p.label}: {p.val}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right */}
                    <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent)", lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                          {score.toFixed(1)}
                        </p>
                        <div style={{ marginTop: "6px" }}>
                          <RiskBadge level={level} />
                        </div>
                      </div>
                      <span style={{
                        fontSize: "11px", padding: "4px 10px", borderRadius: "20px",
                        fontFamily: "'Outfit', sans-serif",
                        ...(run.status === "failed"
                          ? { color: "var(--danger)", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }
                          : { color: "var(--success)", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)" }
                        ),
                      }}>
                        {run.status === "failed" ? "Failed" : "Completed"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ ...card, textAlign: "center", padding: "48px 24px", color: "var(--text-secondary)", fontSize: "14px" }}>
              No analysis runs yet. <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => navigate("/run-analysis")}>Run your first analysis →</span>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
