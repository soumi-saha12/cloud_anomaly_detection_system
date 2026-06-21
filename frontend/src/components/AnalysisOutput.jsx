import { Link } from "react-router-dom";

// ─── Risk colour system ────────────────────────────────────────────────────────
// hex values here are intentional — these are semantic status colors,
// not theme colors, so they stay consistent across light/dark.
const RISK = {
  CRITICAL: { hex: "#f87171", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)",  shadow: "rgba(239,68,68,0.20)"  },
  HIGH:     { hex: "#fb923c", bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.35)", shadow: "rgba(251,146,60,0.20)" },
  MEDIUM:   { hex: "#fbbf24", bg: "rgba(250,204,21,0.12)", border: "rgba(250,204,21,0.35)", shadow: "rgba(250,204,21,0.20)" },
  LOW:      { hex: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.35)", shadow: "rgba(74,222,128,0.20)" },
  UNKNOWN:  { hex: "#a78bfa", bg: "rgba(167,139,250,0.12)",border: "rgba(167,139,250,0.35)",shadow: "rgba(167,139,250,0.20)"},
};

const SOURCE_LABELS = { auth: "Authentication", api: "API Activity", system: "System Metrics" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRiskLevel(score) {
  if (score >= 88) return "CRITICAL";
  if (score >= 75) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score > 0)   return "LOW";
  return "UNKNOWN";
}

function normalizeSourceResults(result) {
  if (Array.isArray(result?.source_results) && result.source_results.length > 0)
    return result.source_results;
  return ["auth", "api", "system"].map((t) => ({
    source_type:        t,
    total_records:      Number(result?.source_breakdown?.[t]?.total_records      ?? result?.[`${t}_total`]     ?? 0),
    anomaly_count:      Number(result?.source_breakdown?.[t]?.anomaly_count      ?? result?.[`${t}_anomalies`] ?? 0),
    anomaly_percentage: Number(result?.source_breakdown?.[t]?.anomaly_percentage ?? 0),
  }));
}

function normalizeIncidents(result) {
  if (Array.isArray(result?.incidents)) return result.incidents;
  if (result?.incident) return [result.incident];
  if (result?.incident_summary || result?.summary)
    return [{ id: "summary", risk_level: result.risk_level, incident_summary: result.incident_summary || result.summary, explanations: result.explanations || [] }];
  return [];
}

// ─── Shared card shell ────────────────────────────────────────────────────────
const card = {
  base: {
    borderRadius: 16,
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-resting)",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function RiskBadge({ level }) {
  const c = RISK[level] || RISK.UNKNOWN;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.hex,
      boxShadow: `0 0 10px ${c.shadow}`,
      padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace",
      display: "inline-block",
    }}>
      {level}
    </span>
  );
}

function StatCard({ label, icon, children, sub }) {
  return (
    <div style={{ ...card.base, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10, transition: "all 0.2s" }}
      className="hover:-translate-y-1 hover:border-[rgba(167,139,250,0.3)]">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-secondary)" }}>
          {label}
        </span>
        {icon && <span style={{ color: "var(--border-hover)", display: "flex" }}>{icon}</span>}
      </div>
      <div>{children}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SourceCard({ source }) {
  const count = source.anomaly_count ?? 0;
  const total = source.total_records ?? 0;
  const pct   = Number(source.anomaly_percentage ?? 0);
  const level = getRiskLevel(pct >= 1 ? pct : count > 0 ? 1 : 0);
  const c     = RISK[level] || RISK.UNKNOWN;
  const bar   = Math.min(pct, 100);

  return (
    <div style={{
      borderRadius: 12,
      background: "var(--bg-base)",
      border: "1px solid var(--border)",
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8,
      transition: "all 0.2s",
    }} className="hover:-translate-y-0.5 hover:border-[rgba(167,139,250,0.25)]">
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--text-secondary)" }}>
        {SOURCE_LABELS[source.source_type] || source.source_type}
      </span>
      <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: c.hex, fontFamily: "monospace" }}>
        {count.toLocaleString()}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
        anomalies in {total.toLocaleString()} records
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 99, background: "var(--border)", overflow: "hidden", marginTop: 2 }}>
        <div style={{
          height: "100%", borderRadius: 99, width: `${bar}%`,
          background: c.hex, boxShadow: `0 0 8px ${c.hex}80`,
          transition: "width 0.7s ease",
        }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.hex }}>{pct.toFixed(2)}%</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-muted)", marginBottom: 12 }}>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnalysisOutput({ result, runId, showBackLink = false }) {
  const incident  = result.incident || {};
  const riskScore = Number(incident.risk_score ?? result.risk_score ?? 0);
  const riskLevel = incident.risk_level || result.risk_level || getRiskLevel(riskScore);
  const rc        = RISK[riskLevel] || RISK.UNKNOWN;
  const summary   = result.summary || incident.incident_summary || result.incident_summary || "";
  const sources   = normalizeSourceResults(result);
  const incidents = normalizeIncidents(result);

  const runLabel    = result.run_name || `Run #${runId || result.run_id || result.id || "—"}`;
  const statusLabel = result.status ? (result.status.charAt(0).toUpperCase() + result.status.slice(1).toLowerCase()) : "Completed";
  const dateLabel   = result.created_at
    ? new Date(result.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : result.timestamp
    ? new Date(result.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "Saved Audit";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", fontFamily: "inherit" }}>

      {/* ── Header row ───────────────────────────────────────────────────── */}
      <div style={{
        ...card.base,
        padding: "24px 28px",
        background: `linear-gradient(135deg, var(--accent-subtle) 0%, var(--bg-card) 60%)`,
        borderColor: "var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Analysis Results
            </h2>
            <RiskBadge level={riskLevel} />
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>Telemetry Run: {runLabel}</p>
        </div>
        {showBackLink && (
          <Link to="/history" style={{
            padding: "7px 18px", borderRadius: 99, border: "1px solid var(--border-hover)",
            background: "transparent", color: "var(--accent)", fontSize: 11, fontWeight: 600,
            textDecoration: "none", transition: "all 0.2s",
          }} className="hover:bg-[rgba(167,139,250,0.08)] hover:-translate-y-0.5">
            ← Back to History
          </Link>
        )}
      </div>

      {/* ── 3 stat cards ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}
        className="!grid-cols-1 sm:!grid-cols-3">
        <StatCard
          label="Overall Risk Score"
          sub="Aggregated correlation risk"
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
        >
          <span style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, color: rc.hex, fontFamily: "monospace" }}>
            {riskScore.toFixed(1)}
          </span>
        </StatCard>

        <StatCard
          label="Risk Classification"
          sub="Assessed vulnerability"
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>}
        >
          <div style={{ marginTop: 4 }}><RiskBadge level={riskLevel} /></div>
        </StatCard>

        <StatCard
          label="Status"
          sub={dateLabel}
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
        >
          <span style={{ fontSize: 22, fontWeight: 600, color: "var(--accent)" }}>{statusLabel}</span>
        </StatCard>
      </div>

      {/* ── Source Breakdown ──────────────────────────────────────────────── */}
      <div style={{ ...card.base, padding: "22px 24px" }}>
        <SectionLabel>Source Breakdown</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}
          className="!grid-cols-1 sm:!grid-cols-3">
          {sources.map((s) => <SourceCard key={s.source_type} source={s} />)}
        </div>
      </div>

      {/* ── Incident Summary ──────────────────────────────────────────────── */}
      <div style={{ ...card.base, padding: "22px 24px" }}>
        {/* Sub-header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingBottom: 16, marginBottom: 16,
          borderBottom: "1px solid var(--border)",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Incident Summary</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Risk Level:</span>
            <RiskBadge level={riskLevel} />
          </div>
        </div>

        {summary && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, margin: "0 0 16px" }}>{summary}</p>
        )}

        {incidents.length > 0 ? incidents.map((item) => {
          const explanations = Array.isArray(item.explanations) ? item.explanations : [];
          const description  = item.description || item.incident_summary;
          const showDesc     = description && description !== summary;

          const factors = explanations.length > 0
            ? explanations
            : sources
                .filter((s) => Number(s.anomaly_count ?? 0) > 0)
                .map((s) => `${SOURCE_LABELS[s.source_type] || s.source_type} anomalies detected (${Number(s.anomaly_percentage ?? 0).toFixed(2)}% anomalous activity).`);

          return (
            <div key={item.id || "incident"} style={{
              borderRadius: 12,
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16,
            }}>
              {showDesc && (
                <div>
                  <SectionLabel>Explanation</SectionLabel>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, margin: 0 }}>{description}</p>
                </div>
              )}
              {factors.length > 0 && (
                <div>
                  <SectionLabel>Contributing Factors</SectionLabel>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {factors.map((f, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{
                          marginTop: 6, width: 6, height: 6, borderRadius: "50%",
                          background: rc.hex, boxShadow: `0 0 6px ${rc.hex}`,
                          flexShrink: 0, display: "block",
                        }} />
                        <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.7 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <div style={{
            borderRadius: 12,
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            padding: "32px 20px", textAlign: "center", fontSize: 13, color: "var(--text-muted)",
          }}>
            No incidents were detected for this analysis run.
          </div>
        )}
      </div>

    </div>
  );
}
