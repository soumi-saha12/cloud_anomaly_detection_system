import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    path: "/run-analysis",
    label: "Run Analysis",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
    ),
  },
  {
    path: "/history",
    label: "History",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    path: "/about",
    label: "About",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    ),
  },
];

export default function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-theme" style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-base)" }}>

      {/* Sidebar — fixed 220px, no flex shrink */}
      <aside style={{
        width: "220px",
        minWidth: "220px",
        maxWidth: "220px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-card)",
        borderRight: "1px solid var(--border)",
        zIndex: 10,
      }}>

        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "20px 16px",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--accent)",
            lineHeight: 1.3,
            fontFamily: "'Outfit', sans-serif",
          }}>
            Cloud Anomaly<br/>Detection
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path ||
              (item.path === "/dashboard" && location.pathname.startsWith("/results"));
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--accent)" : "var(--text-secondary)",
                  background: active ? "var(--accent-subtle)" : "transparent",
                  borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  textDecoration: "none",
                  transition: "var(--transition-nav)",
                  fontFamily: "'Outfit', sans-serif",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--accent-subtle)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span style={{ color: active ? "var(--accent)" : "var(--text-secondary)", flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: "16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", fontWeight: 600, color: "white",
              flexShrink: 0,
            }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: "13px", fontWeight: 500, color: "var(--text-primary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontFamily: "'Outfit', sans-serif",
              }}>
                {user?.full_name || "Analyst"}
              </p>
              <p style={{
                fontSize: "11px", color: "var(--text-secondary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                fontFamily: "'Outfit', sans-serif",
              }}>
                {user?.organization || "SOC Operations"}
              </p>
            </div>
          </div>

          <ThemeToggle />

          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "8px", padding: "8px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: "12px", fontWeight: 400,
              cursor: "pointer",
                  transition: "var(--transition-button)",
              fontFamily: "'Outfit', sans-serif",
              width: "100%",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "#f87171";
              e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)";
              e.currentTarget.style.background = "rgba(248,113,113,0.05)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content — takes all remaining space */}
      <main style={{
        flex: 1,
        minWidth: 0,
        width: "100%",
        overflowY: "auto",
        background: "var(--bg-base)",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ width: "100%", flex: 1 }}>{children}</div>
	        <footer style={{
	          padding: "var(--space-2) var(--page-padding-inline)",
	          borderTop: "1px solid var(--border)",
	        }}>
	          <div className="app-page-container" style={{
	            display: "flex",
	            alignItems: "center",
	            justifyContent: "space-between",
	            flexWrap: "wrap",
	            gap: "var(--space-1)",
	          }}>
	            <span style={{ fontSize: 12, fontWeight: 300, color: "var(--text-secondary)", fontFamily: "'Outfit', sans-serif" }}>
	              © 2026 Cloud Anomaly Detection. All rights reserved.
	            </span>
	            <span style={{ fontSize: 12, fontWeight: 300, color: "var(--text-secondary)", fontFamily: "'Outfit', sans-serif" }}>
	              Built for cloud security teams.
	            </span>
	          </div>
	        </footer>
      </main>
    </div>
  );
}
