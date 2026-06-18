import MainLayout from "../layouts/MainLayout";

const COLORS = {
  bg: "#08080f",
  card: "#0f0f1a",
  border: "rgba(167, 139, 250, 0.12)",
  accent: "#a78bfa",
  accentDeep: "#7c3aed",
  textPrimary: "#e2e0f0",
  textMuted: "#6b6880",
  textLabel: "#8a85a0",
  green: "#4ade80",
  orange: "#fb923c",
  red: "#f87171",
};

const FONT = "'Outfit', sans-serif";

const STEPS = [
  {
    num: "01",
    title: "Upload Your Logs",
    body: "Drop in authentication logs, API request logs, or system metrics — any combination works. Supported formats are CSV, JSON, and plain log files.",
  },
  {
    num: "02",
    title: "Automatic Correlation",
    body: "The engine cross-references signals across all three log types simultaneously, catching anomalies that only appear when auth, API, and system data are viewed together.",
  },
  {
    num: "03",
    title: "Risk Scoring",
    body: "Each run produces a risk score and severity level — Critical, High, Medium, or Low — so you know exactly where to focus your attention first.",
  },
  {
    num: "04",
    title: "Review & Act",
    body: "Drill into individual incidents, view anomaly breakdowns by source, and track every run in the History page for a full audit trail.",
  },
];

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Auth Anomaly Detection",
    body: "Spots unusual login patterns, brute-force attempts, credential stuffing, and suspicious session activity.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h7"/>
        <circle cx="17" cy="18" r="3"/>
        <path d="m19.5 20.5 1.5 1.5"/>
      </svg>
    ),
    title: "API Traffic Analysis",
    body: "Identifies rate spikes, unusual endpoint access, error bursts, and request patterns that deviate from your baseline.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8l3 3 2-2 3 3"/>
      </svg>
    ),
    title: "System Metrics Monitoring",
    body: "Flags CPU spikes, memory pressure, and latency anomalies that often accompany security incidents.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: "Full Audit History",
    body: "Every analysis run is stored with its full results, so you can compare across time and demonstrate compliance.",
  },
];

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
      color: COLORS.accent, textTransform: "uppercase", margin: "0 0 12px 0",
      fontFamily: FONT,
    }}>
      {children}
    </p>
  );
}

const twoColGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "var(--space-3)",
  width: "100%",
};

export default function AboutPage() {
  return (
    <MainLayout>
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "var(--space-4)",
          fontFamily: FONT,
        }}
      >

        {/* Hero */}
        <div style={{ width: "100%", boxSizing: "border-box", marginBottom: "var(--space-5)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
            <div style={{
              width: "var(--space-5)", height: "var(--space-5)", borderRadius: 14,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDeep})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--shadow-active)", flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 400, color: COLORS.textMuted }}>Cloud Anomaly Detection</p>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: COLORS.textPrimary, lineHeight: 1.2 }}>
                About this platform
              </h1>
            </div>
          </div>
          <p style={{ fontSize: 15, fontWeight: 300, color: COLORS.textMuted, lineHeight: 1.7, margin: 0, width: "100%" }}>
            Cloud Anomaly Detection is a security analytics tool that helps you find threats hiding in your cloud infrastructure logs.
            Instead of manually sifting through thousands of log lines, you upload your data and the system surfaces what actually matters —
            ranked by risk, broken down by source, and stored for future reference.
          </p>
        </div>

        {/* How it works */}
        <div style={{ width: "100%", marginBottom: "var(--space-5)" }}>
          <SectionLabel>How it works</SectionLabel>
          <div style={twoColGrid}>
            {STEPS.map((step) => (
              <div key={step.num} className="interactive-card" style={{
                backgroundColor: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "var(--space-3)",
              }}>
                <p style={{ margin: "0 0 10px 0", fontSize: 28, fontWeight: 700, color: COLORS.accentDeep, lineHeight: 1, opacity: 0.6 }}>
                  {step.num}
                </p>
                <p style={{ margin: "0 0 8px 0", fontSize: 15, fontWeight: 500, color: COLORS.textPrimary }}>{step.title}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: COLORS.textMuted, lineHeight: 1.65 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ width: "100%", marginBottom: "var(--space-5)" }}>
          <SectionLabel>What it detects</SectionLabel>
          <div style={twoColGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className="interactive-card" style={{
                backgroundColor: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 14,
                padding: "var(--space-3)",
                display: "flex", gap: "var(--space-2)", alignItems: "flex-start",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  backgroundColor: "rgba(167,139,250,0.08)",
                  border: `1px solid rgba(167,139,250,0.15)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {f.icon}
                </div>
                <div>
                  <p style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 500, color: COLORS.textPrimary }}>{f.title}</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: COLORS.textMuted, lineHeight: 1.65 }}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk levels */}
        <div style={{ width: "100%", marginBottom: "var(--space-5)" }}>
          <SectionLabel>Risk levels explained</SectionLabel>
          <div className="interactive-card" style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            padding: "var(--space-4)",
            width: "100%",
            boxSizing: "border-box",
            display: "flex", flexDirection: "column", gap: "var(--space-2)",
          }}>
            {[
              { level: "CRITICAL", color: COLORS.red, bg: "rgba(239,68,68,0.12)", desc: "Immediate action required. High-confidence indicators of active compromise or breach." },
              { level: "HIGH", color: COLORS.orange, bg: "rgba(251,146,60,0.12)", desc: "Strong signals that warrant investigation within hours. Could indicate active threat activity." },
              { level: "MEDIUM", color: "#fbbf24", bg: "rgba(250,204,21,0.12)", desc: "Suspicious patterns worth reviewing. May be benign but should not be ignored." },
              { level: "LOW", color: COLORS.green, bg: "rgba(74,222,128,0.12)", desc: "Minor deviations from baseline. Good to be aware of, low urgency." },
            ].map((r) => (
              <div key={r.level} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
                  color: r.color, backgroundColor: r.bg,
                  borderRadius: 999, padding: "4px 12px", flexShrink: 0, marginTop: 1,
                }}>
                  {r.level}
                </span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: COLORS.textMuted, lineHeight: 1.65 }}>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick nav */}
        <div style={{ width: "100%" }}>
          <SectionLabel>Pages at a glance</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)", width: "100%" }}>
            {[
              { name: "Dashboard", desc: "Overview of your latest risk score, anomaly counts, and recent runs." },
              { name: "Run Analysis", desc: "Upload log files and start a new detection run." },
              { name: "History", desc: "Browse all past runs, filter by status, and drill into individual results." },
            ].map((p) => (
              <div key={p.name} className="interactive-card" style={{
                backgroundColor: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: "var(--space-3)",
              }}>
                <p style={{ margin: "0 0 6px 0", fontSize: 14, fontWeight: 500, color: COLORS.accent }}>{p.name}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 300, color: COLORS.textMuted, lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
