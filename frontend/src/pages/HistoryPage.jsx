import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../services/api";
import MainLayout from "../layouts/MainLayout";
import { getAnomalyCount } from "../utils/anomalyCounts";

const COLORS = {
  bg: "var(--bg-base)",
  card: "var(--bg-card)",
  cardHover: "var(--bg-card-hover)",
  border: "var(--border)",
  borderHover: "var(--border-hover)",
  accent: "var(--accent)",
  textPrimary: "var(--text-primary)",
  textMuted: "var(--text-secondary)",
  pillBg: "var(--bg-base)",
};

const FONT = "'Outfit', sans-serif";

const RISK_STYLES = {
  CRITICAL: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  HIGH: { bg: "rgba(251,146,60,0.15)", color: "#fb923c" },
  MEDIUM: { bg: "rgba(250,204,21,0.15)", color: "#fbbf24" },
  LOW: { bg: "rgba(74,222,128,0.15)", color: "#4ade80" },
  UNKNOWN: { bg: "rgba(167,139,250,0.15)", color: "#a78bfa" },
};

const STATUS_STYLES = {
  completed: { bg: "rgba(74,222,128,0.15)", color: "#4ade80", label: "Completed" },
  failed: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "Failed" },
};

function mapRun(raw) {
  return {
    id: raw.id || raw.run_id,
    name: raw.name || raw.run_name || "Untitled run",
    date: raw.created_at,
    riskScore: raw.risk_score ?? null,
    riskLevel: (raw.risk_level || "UNKNOWN").toUpperCase(),
    status: raw.status === "failed" ? "failed" : "completed",
    authCount: getAnomalyCount(raw, "auth"),
    apiCount: getAnomalyCount(raw, "api"),
    systemCount: getAnomalyCount(raw, "system"),
  };
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  } catch { return iso; }
}

function ClipboardIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="1.4">
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <path d="M9 3.5h6v2.5H9z" />
      <path d="M9 11h6M9 14.5h6" strokeLinecap="round" />
    </svg>
  );
}

function Pill({ label, count }) {
  return (
    <span style={styles.pill}>
      {label} <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}>{count}</span>
    </span>
  );
}

function RiskBadge({ level }) {
  const s = RISK_STYLES[level] || RISK_STYLES.UNKNOWN;
  return <span style={{ ...styles.badge, backgroundColor: s.bg, color: s.color }}>{level}</span>;
}

function StatusChip({ status }) {
  const s = STATUS_STYLES[status];
  return <span style={{ ...styles.badge, backgroundColor: s.bg, color: s.color }}>{s.label}</span>;
}

function RunCard({ run, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
	    <div
	      className="history-run-card"
	      role="button" tabIndex={0}
	      onClick={onClick}
	      onKeyDown={(e) => {
	        if (e.key === "Enter" || e.key === " ") {
	          e.preventDefault();
	          onClick();
	        }
	      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
	      style={{
	        ...styles.runCard,
	        borderColor: hovered ? COLORS.borderHover : COLORS.border,
	        backgroundColor: hovered ? COLORS.cardHover : COLORS.card,
	        boxShadow: hovered ? "var(--shadow-hover)" : "var(--shadow-resting)",
	        transform: hovered ? "translateY(-2px)" : "translateY(0)",
	      }}
	    >
      <div style={styles.cardLeft}>
        <div style={styles.runName}>{run.name}</div>
        <div style={styles.runDate}>{formatDate(run.date)}</div>
        <div style={styles.pillRow}>
          <Pill label="Auth" count={run.authCount} />
          <Pill label="API" count={run.apiCount} />
          <Pill label="System" count={run.systemCount} />
        </div>
      </div>
      <div style={styles.cardRight}>
        <div style={styles.riskScore}>{run.riskScore ?? "—"}</div>
        <RiskBadge level={run.riskLevel} />
        <StatusChip status={run.status} />
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getHistory();
        const data = res.data;
        const list = Array.isArray(data) ? data : data.history || data.runs || [];
        if (!cancelled) setRuns(list.map(mapRun));
      } catch {
        if (!cancelled) setError("Could not load history. Is the backend running?");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const total = runs.length;
  const completed = runs.filter((r) => r.status === "completed").length;
  const failed = runs.filter((r) => r.status === "failed").length;

	  return (
	    <MainLayout>
	      <div className="app-page-shell" style={styles.page}>
	        <div className="app-page-container">
	          <div style={styles.header}>
	            <h1 style={styles.title}>Audit Log History</h1>
	            <p style={styles.subtitle}>All your past anomaly detection runs in one place.</p>
	          </div>

	          {!loading && !error && total > 0 && (
	            <div style={styles.summaryBar}>
	              <div style={styles.summaryStat}>
	                <span style={styles.summaryNumber}>{total}</span>
	                <span style={styles.summaryLabel}>Total Runs</span>
	              </div>
	              <div style={styles.divider} />
	              <div style={styles.summaryStat}>
	                <span style={{ ...styles.summaryNumber, color: "#4ade80" }}>{completed}</span>
	                <span style={styles.summaryLabel}>Completed</span>
	              </div>
	              <div style={styles.divider} />
	              <div style={styles.summaryStat}>
	                <span style={{ ...styles.summaryNumber, color: "#f87171" }}>{failed}</span>
	                <span style={styles.summaryLabel}>Failed</span>
	              </div>
	            </div>
	          )}

	          {loading && <p style={styles.statusText}>Loading history…</p>}
	          {!loading && error && <p style={{ ...styles.statusText, color: "#f87171" }}>{error}</p>}

	          {!loading && !error && total === 0 && (
	            <div style={styles.emptyState}>
	              <ClipboardIcon size={48} />
	              <p style={styles.emptyTitle}>No analysis runs yet</p>
	              <p style={styles.emptySubtitle}>Run your first analysis to see results here</p>
	            </div>
	          )}

	          {!loading && !error && total > 0 && (
	            <div>
	              {runs.map((run) => (
	                <RunCard key={run.id} run={run} onClick={() => navigate(`/results/${run.id}`)} />
	              ))}
	            </div>
	          )}
	        </div>
	      </div>
	    </MainLayout>
	  );
}

const styles = {
  page: { fontFamily: FONT },
  header: { marginBottom: "var(--space-4)" },
  title: { fontSize: 28, fontWeight: 600, color: COLORS.textPrimary, margin: 0 },
  subtitle: { fontSize: 14, fontWeight: 300, color: COLORS.textMuted, marginTop: 6 },
  summaryBar: { display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)", padding: "var(--space-2) var(--space-3)", backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, width: "fit-content", boxShadow: "var(--shadow-resting)" },
  summaryStat: { display: "flex", alignItems: "baseline", gap: 8 },
  summaryNumber: { fontSize: 20, fontWeight: 600, color: COLORS.textPrimary },
  summaryLabel: { fontSize: 13, fontWeight: 300, color: COLORS.textMuted },
  divider: { width: 1, height: 20, backgroundColor: COLORS.border },
  statusText: { fontSize: 14, fontWeight: 300, color: COLORS.textMuted },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "var(--space-6) var(--space-3)", border: `1px solid ${COLORS.border}`, borderRadius: 16, backgroundColor: COLORS.card, boxShadow: "var(--shadow-resting)" },
  emptyTitle: { fontSize: 16, fontWeight: 400, color: COLORS.textMuted, marginTop: 20, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, fontWeight: 300, color: COLORS.textMuted, margin: 0, opacity: 0.8 },
  runCard: { border: "1px solid", borderRadius: 16, padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-2)", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "var(--transition-row)", boxSizing: "border-box" },
  cardLeft: { display: "flex", flexDirection: "column" },
  runName: { fontSize: 18, fontWeight: 500, color: COLORS.textPrimary },
  runDate: { fontSize: 13, fontWeight: 300, color: COLORS.textMuted, marginTop: 4 },
  pillRow: { display: "flex", gap: 8, marginTop: 12 },
  pill: { fontSize: 12, fontWeight: 300, color: COLORS.textMuted, backgroundColor: COLORS.pillBg, border: `1px solid ${COLORS.border}`, borderRadius: 999, padding: "4px 10px" },
  cardRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginLeft: 24 },
  riskScore: { fontSize: 28, fontWeight: 600, color: COLORS.accent, lineHeight: 1 },
  badge: { fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", borderRadius: 999, padding: "4px 10px" },
};
