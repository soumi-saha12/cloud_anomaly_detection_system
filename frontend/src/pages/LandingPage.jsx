import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * LandingPage
 * -----------
 * Self-contained: all colors, spacing, and typography live in this file
 * as inline style objects. This means the global `index.css` rules
 * (the `* { font-weight: 300 }` / `* { color: ... }` resets that caused
 * problems before) cannot override anything here.
 *
 * If your project does NOT use react-router-dom, swap the <Link> tags
 * below for plain <a href="..."> tags.
 */

const COLORS = {
  bg: "var(--bg-base)",
  card: "var(--bg-card)",
  cardHover: "var(--bg-card-hover)",
  borderSubtle: "var(--border)",
  borderHover: "var(--border-hover)",
  accent: "var(--accent)",
  accentHover: "#b9a3fc",
  textPrimary: "var(--text-primary)",
  textMuted: "var(--text-secondary)",
};

const FONT = "'Outfit', sans-serif";

function ShieldIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 2.5l7.5 3v6c0 5-3.2 8.7-7.5 10-4.3-1.3-7.5-5-7.5-10v-6l7.5-3z" />
    </svg>
  );
}

function CubeIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" />
      <path d="M12 11v9M12 11l8-4.5M12 11l-8-4.5" />
    </svg>
  );
}

function DollarIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 2v20" />
      <path d="M16.5 6.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />
    </svg>
  );
}

function PauseIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.6">
      <rect x="6" y="4" width="4" height="16" rx="1.5" />
      <rect x="14" y="4" width="4" height="16" rx="1.5" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: CubeIcon,
    title: "ML-Powered Detection",
    description:
      "Unsupervised machine learning pipelines parse logs to automatically tag outlier sessions and resource spikes.",
  },
  {
    icon: DollarIcon,
    title: "Real-time Risk Scoring",
    description:
      "Translate telemetry indicators into an actionable overall security score using dynamic risk coefficient metrics.",
  },
  {
    icon: PauseIcon,
    title: "Correlated Threat Intel",
    description:
      "Map authentication logs, API requests, and metrics into unified multi-vector security incidents automatically.",
  },
];

export default function LandingPage() {
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <div style={styles.page}>
      {/* Only used for the one responsive breakpoint — everything else is inline */}
      <style>{`
        @media (max-width: 860px) {
          .la-features { grid-template-columns: 1fr !important; }
          .la-hero-title { font-size: 34px !important; }
          .la-nav { padding: 16px 20px !important; }
          .la-hero { padding: 64px 20px 48px !important; }
        }
      `}</style>

      <nav style={styles.nav} className="la-nav">
        <div style={styles.brand}>
          <div style={styles.brandIcon}>
            <ShieldIcon size={20} />
          </div>
          <span style={styles.brandText}>Cloud Anomaly Detection</span>
        </div>

        <div style={styles.navRight}>
          <Link to="/login" style={styles.signInLink}>
            Sign In
          </Link>
          <Link
            to="/register"
            style={{
              ...styles.getStartedBtn,
              ...(hoveredBtn === "nav" ? { backgroundColor: COLORS.accentHover } : {}),
            }}
            onMouseEnter={() => setHoveredBtn("nav")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main style={styles.hero} className="la-hero">
        <div style={styles.heroIconWrap}>
          <ShieldIcon size={40} />
        </div>

        <h1 style={styles.heroTitle} className="la-hero-title">
          Cloud Anomaly
          <br />
          <span style={{ color: COLORS.accent }}>Detection System</span>
        </h1>

        <p style={styles.heroSubtitle}>
          AI-powered cloud security analytics. Instantly correlate authentication
          activity, API request telemetry, and system performance metrics to
          isolate threats.
        </p>

        <div style={styles.heroActions}>
          <Link
            to="/register"
            style={{
              ...styles.primaryBtn,
              ...(hoveredBtn === "hero-primary" ? { backgroundColor: COLORS.accentHover } : {}),
            }}
            onMouseEnter={() => setHoveredBtn("hero-primary")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            Get Started Free
          </Link>
          <Link
            to="/login"
            style={{
              ...styles.secondaryBtn,
              ...(hoveredBtn === "hero-secondary" ? { backgroundColor: "rgba(167,139,250,0.08)" } : {}),
            }}
            onMouseEnter={() => setHoveredBtn("hero-secondary")}
            onMouseLeave={() => setHoveredBtn(null)}
          >
            Sign In to Dashboard
          </Link>
        </div>
      </main>

      <section style={styles.features} className="la-features">
        {FEATURES.map((feature, i) => {
          const Icon = feature.icon;
          const hovered = hoveredCard === i;
          return (
            <div
              key={feature.title}
              style={{
                ...styles.featureCard,
                ...(hovered
                  ? { borderColor: COLORS.borderHover, backgroundColor: COLORS.cardHover }
                  : {}),
              }}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div style={styles.featureIconWrap}>
                <Icon size={20} />
              </div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDescription}>{feature.description}</p>
            </div>
          );
        })}
      </section>

      <footer style={styles.footer}>
        © 2026 Cloud Security Analytics Platform. All rights reserved.
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    backgroundColor: COLORS.bg,
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 48px",
    borderBottom: `1px solid ${COLORS.borderSubtle}`,
    flexWrap: "wrap",
    gap: 12,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `1px solid ${COLORS.borderSubtle}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandText: {
    fontSize: 18,
    fontWeight: 500,
    color: COLORS.textPrimary,
    whiteSpace: "nowrap",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: 24,
  },
  signInLink: {
    fontSize: 14,
    fontWeight: 400,
    color: COLORS.textPrimary,
    textDecoration: "none",
  },
  getStartedBtn: {
    padding: "10px 20px",
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    color: "#0a0a12",
    fontWeight: 600,
    fontSize: 14,
    textDecoration: "none",
    transition: "background-color 0.15s ease",
  },
  hero: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "96px 24px 64px",
    boxSizing: "border-box",
  },
  heroIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 20,
    border: `1px solid ${COLORS.borderSubtle}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    flexShrink: 0,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 1.15,
    color: COLORS.textPrimary,
    margin: 0,
  },
  heroSubtitle: {
    maxWidth: 640,
    marginTop: 24,
    fontSize: 17,
    fontWeight: 300,
    lineHeight: 1.6,
    color: COLORS.textMuted,
  },
  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginTop: 36,
  },
  primaryBtn: {
    padding: "14px 28px",
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    color: "#0a0a12",
    fontWeight: 600,
    fontSize: 15,
    textDecoration: "none",
    transition: "background-color 0.15s ease",
  },
  secondaryBtn: {
    padding: "14px 28px",
    borderRadius: 10,
    backgroundColor: "transparent",
    border: `1px solid ${COLORS.accent}`,
    color: COLORS.accent,
    fontWeight: 500,
    fontSize: 15,
    textDecoration: "none",
    transition: "background-color 0.15s ease",
  },
  features: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 20,
    padding: "32px 48px 64px",
    maxWidth: 1280,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  featureCard: {
    backgroundColor: COLORS.card,
    border: `1px solid ${COLORS.borderSubtle}`,
    borderRadius: 16,
    padding: "28px",
    transition: "border-color 0.15s ease, background-color 0.15s ease",
    boxSizing: "border-box",
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: `1px solid ${COLORS.borderSubtle}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: 500,
    color: COLORS.textPrimary,
    margin: "0 0 8px",
  },
  featureDescription: {
    fontSize: 14,
    fontWeight: 300,
    lineHeight: 1.6,
    color: COLORS.textMuted,
    margin: 0,
  },
  footer: {
    marginTop: "auto",
    textAlign: "center",
    padding: "24px",
    fontSize: 13,
    fontWeight: 300,
    color: COLORS.textMuted,
    borderTop: `1px solid ${COLORS.borderSubtle}`,
  },
};
