import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory, renameAnalysis, deleteAnalysis } from "../services/api";
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
  danger: "var(--danger)",
  success: "var(--success)",
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
    runName: raw.run_name || "",
    date: raw.created_at,
    riskScore: raw.risk_score ?? null,
    riskLevel: (raw.risk_level || "UNKNOWN").toUpperCase(),
    status: (raw.status === "failed" || raw.status === "processing") ? "failed" : "completed",
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

function ActionButton({ onClick, label, isDestructive }) {
  const [hovered, setHovered] = useState(false);
  const baseStyle = isDestructive ? styles.deleteBtn : styles.actionBtn;
  const hoverStyle = isDestructive
    ? { backgroundColor: "rgba(248, 113, 113, 0.15)", borderColor: "var(--danger)" }
    : { backgroundColor: "rgba(167, 139, 250, 0.15)", borderColor: "var(--accent)" };

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...baseStyle,
        ...(hovered ? hoverStyle : {}),
      }}
    >
      {label}
    </button>
  );
}

function RunCard({ run, onClick, onRename, onDelete }) {
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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={styles.riskScore}>{run.riskScore !== null ? run.riskScore.toFixed(2) : "--"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
            <RiskBadge level={run.riskLevel} />
            <StatusChip status={run.status} />
          </div>
        </div>
        <div style={styles.cardActions}>
          <ActionButton onClick={(e) => { e.stopPropagation(); onClick(); }} label="View" />
          <ActionButton onClick={(e) => { e.stopPropagation(); onRename(); }} label="Rename" />
          <ActionButton onClick={(e) => { e.stopPropagation(); onDelete(); }} label="Delete" isDestructive={true} />
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  // Action Modals State
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [activeRunToRename, setActiveRunToRename] = useState(null);
  const [newNameInput, setNewNameInput] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeRunToDelete, setActiveRunToDelete] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const res = await getHistory();
      const data = res.data;
      const list = Array.isArray(data) ? data : data.history || data.runs || [];
      setRuns(list.map(mapRun));
    } catch {
      if (!isSilent) setError("Could not load history. Is the backend running?");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Rename action handler
  const handleRenameSubmit = async (e) => {
    e.preventDefault();
    if (!activeRunToRename || !newNameInput.trim()) return;

    setActionLoading(true);
    setActionError("");
    try {
      const trimmedName = newNameInput.trim();
      await renameAnalysis(activeRunToRename.id, trimmedName);
      
      // Update UI immediately
      setRuns((prev) =>
        prev.map((r) =>
          r.id === activeRunToRename.id ? { ...r, name: trimmedName } : r
        )
      );
      setRenameModalOpen(false);
      
      // Refresh in background
      load(true);
    } catch (err) {
      setActionError(
        err.response?.data?.error || "Failed to rename analysis. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Delete action handler
  const handleDeleteSubmit = async () => {
    if (!activeRunToDelete) return;

    setActionLoading(true);
    setActionError("");
    try {
      await deleteAnalysis(activeRunToDelete.id);
      
      // Update UI immediately
      setRuns((prev) => prev.filter((r) => r.id !== activeRunToDelete.id));
      setDeleteModalOpen(false);
      
      // Refresh in background
      load(true);
    } catch (err) {
      setActionError(
        err.response?.data?.error || "Failed to delete analysis. Please try again."
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Compute stats based on the full loaded list (refreshes reactively)
  const total = runs.length;
  const completed = runs.filter((r) => r.status === "completed").length;
  const failed = runs.filter((r) => r.status === "failed").length;

  // Filter runs based on active filters & search query
  const filteredRuns = runs.filter((run) => {
    // 1. Search filter (against display name, original run name, risk level)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchName = run.name.toLowerCase().includes(query);
      const matchRunName = run.runName.toLowerCase().includes(query);
      const matchRisk = run.riskLevel.toLowerCase().includes(query);
      
      if (!matchName && !matchRunName && !matchRisk) {
        return false;
      }
    }

    // 2. Risk level filter
    if (riskFilter !== "ALL") {
      if (run.riskLevel !== riskFilter) {
        return false;
      }
    }

    // 3. Date timeframe filter using raw timestamp
    if (dateFilter !== "ALL") {
      if (!run.date) return false;
      const runTime = new Date(run.date).getTime();
      const now = new Date().getTime();
      
      if (dateFilter === "7_DAYS") {
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        if (runTime < sevenDaysAgo) return false;
      } else if (dateFilter === "30_DAYS") {
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        if (runTime < thirtyDaysAgo) return false;
      }
    }

    return true;
  });

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

          {/* Search and Filters Section */}
          {!loading && !error && total > 0 && (
            <div style={styles.filterSection}>
              <div style={styles.searchWrapper}>
                <input
                  type="text"
                  placeholder="Search by analysis name, original name, risk level..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              <div style={styles.filtersWrapper}>
                <div style={styles.filterGroup}>
                  <span style={styles.filterLabel}>Risk Level:</span>
                  <div style={styles.filterButtons}>
                    {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setRiskFilter(lvl)}
                        style={{
                          ...styles.filterTab,
                          backgroundColor: riskFilter === lvl ? "var(--accent)" : "transparent",
                          color: riskFilter === lvl ? "#08080f" : "var(--text-secondary)",
                          borderColor: riskFilter === lvl ? "var(--accent)" : "var(--border)",
                        }}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.filterGroup}>
                  <span style={styles.filterLabel}>Timeframe:</span>
                  <div style={styles.filterButtons}>
                    {[
                      { value: "ALL", label: "All Time" },
                      { value: "7_DAYS", label: "Last 7 Days" },
                      { value: "30_DAYS", label: "Last 30 Days" },
                    ].map((tf) => (
                      <button
                        key={tf.value}
                        onClick={() => setDateFilter(tf.value)}
                        style={{
                          ...styles.filterTab,
                          backgroundColor: dateFilter === tf.value ? "var(--accent)" : "transparent",
                          color: dateFilter === tf.value ? "#08080f" : "var(--text-secondary)",
                          borderColor: dateFilter === tf.value ? "var(--accent)" : "var(--border)",
                        }}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
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

          {!loading && !error && total > 0 && filteredRuns.length === 0 && (
            <div style={styles.emptyState}>
              <ClipboardIcon size={48} />
              <p style={styles.emptyTitle}>No matching runs found</p>
              <p style={styles.emptySubtitle}>Try adjusting your search query or filters</p>
            </div>
          )}

          {!loading && !error && filteredRuns.length > 0 && (
            <div>
              {filteredRuns.map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  onClick={() => navigate(`/results/${run.id}`)}
                  onRename={() => {
                    setActiveRunToRename(run);
                    setNewNameInput(run.name);
                    setActionError("");
                    setRenameModalOpen(true);
                  }}
                  onDelete={() => {
                    setActiveRunToDelete(run);
                    setActionError("");
                    setDeleteModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      {renameModalOpen && activeRunToRename && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Rename Analysis</h3>
            <p style={styles.modalSubtitle}>
              Update the display name for this analysis. The original identifier{" "}
              <code style={styles.modalCode}>{activeRunToRename.runName}</code> will be preserved.
            </p>
            {actionError && <p style={styles.modalError}>{actionError}</p>}
            
            <form onSubmit={handleRenameSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <input
                type="text"
                value={newNameInput}
                onChange={(e) => setNewNameInput(e.target.value)}
                placeholder="Enter analysis name"
                style={styles.modalInput}
                disabled={actionLoading}
                autoFocus
              />
              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  style={styles.modalCancelBtn}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.modalConfirmBtn}
                  disabled={actionLoading || !newNameInput.trim()}
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && activeRunToDelete && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ ...styles.modalTitle, color: COLORS.danger }}>Delete Analysis</h3>
            <p style={styles.modalSubtitle}>
              This will permanently delete this analysis and all associated anomaly results and incident records. This action cannot be undone.
            </p>
            <p style={{ ...styles.modalSubtitle, fontSize: 13, opacity: 0.9 }}>
              Analysis to delete: <strong>{activeRunToDelete.name}</strong>
            </p>
            {actionError && <p style={styles.modalError}>{actionError}</p>}
            
            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                style={styles.modalCancelBtn}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                style={styles.modalDeleteConfirmBtn}
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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
  cardRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0, marginLeft: 24 },
  riskScore: { fontSize: 28, fontWeight: 600, color: COLORS.accent, lineHeight: 1 },
  badge: { fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", borderRadius: 999, padding: "4px 10px" },
  
  // Search and filter styles
  filterSection: { display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-3)", padding: "var(--space-3)", backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "var(--shadow-resting)" },
  searchWrapper: { position: "relative", width: "100%" },
  searchInput: { width: "100%", padding: "12px 16px", borderRadius: 10, border: `1px solid var(--border)`, backgroundColor: "var(--input-bg)", color: "var(--text-primary)", fontFamily: FONT, fontSize: 14, boxSizing: "border-box", transition: "border-color 0.2s ease", outline: "none" },
  filtersWrapper: { display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center", marginTop: 4 },
  filterGroup: { display: "flex", alignItems: "center", gap: 12 },
  filterLabel: { fontSize: 13, fontWeight: 400, color: COLORS.textMuted, whiteSpace: "nowrap" },
  filterButtons: { display: "flex", gap: 6, flexWrap: "wrap" },
  filterTab: { padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "1px solid", transition: "all 0.2s ease", fontFamily: FONT, outline: "none" },
  
  // Actions panel on card
  cardActions: { display: "flex", gap: 8, marginTop: 4 },
  actionBtn: { padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "1px solid var(--border)", backgroundColor: "rgba(167, 139, 250, 0.05)", color: "var(--text-primary)", cursor: "pointer", transition: "all 0.2s ease", fontFamily: FONT, outline: "none" },
  deleteBtn: { padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500, border: "1px solid rgba(248, 113, 113, 0.2)", backgroundColor: "rgba(248, 113, 113, 0.05)", color: "var(--danger)", cursor: "pointer", transition: "all 0.2s ease", fontFamily: FONT, outline: "none" },

  // Modal styles
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(8, 8, 15, 0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "var(--space-4)", width: "90%", maxWidth: 480, boxShadow: "var(--shadow-hover)", display: "flex", flexDirection: "column", gap: 16, boxSizing: "border-box" },
  modalTitle: { fontSize: 20, fontWeight: 600, color: COLORS.textPrimary, margin: 0 },
  modalSubtitle: { fontSize: 14, fontWeight: 300, color: COLORS.textMuted, lineHeight: 1.5, margin: 0 },
  modalCode: { backgroundColor: "rgba(167, 139, 250, 0.1)", padding: "2px 6px", borderRadius: 4, color: COLORS.accent, fontFamily: "monospace", fontSize: 12 },
  modalInput: { padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border)", backgroundColor: "var(--input-bg)", color: COLORS.textPrimary, fontSize: 14, fontFamily: FONT, width: "100%", boxSizing: "border-box", outline: "none" },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  modalCancelBtn: { padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid var(--border)", backgroundColor: "transparent", color: COLORS.textMuted, cursor: "pointer", transition: "all 0.2s ease", fontFamily: FONT, outline: "none" },
  modalConfirmBtn: { padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid var(--accent)", backgroundColor: "var(--accent)", color: "#08080f", cursor: "pointer", transition: "all 0.2s ease", fontFamily: FONT, outline: "none" },
  modalDeleteConfirmBtn: { padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid var(--danger)", backgroundColor: "var(--danger)", color: "#08080f", cursor: "pointer", transition: "all 0.2s ease", fontFamily: FONT, outline: "none" },
  modalError: { color: COLORS.danger, fontSize: 13, margin: 0 },
};
