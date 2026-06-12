import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  {
    path: "/",
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
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0e1a" }}>
      
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-slate-700/50" style={{ background: "rgba(10,14,26,0.95)" }}>
        
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/50">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1e3a5f, #2563eb)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">Cloud Anomaly</p>
            <p className="text-slate-500 text-xs">Detection System</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  color: active ? "#60a5fa" : "#94a3b8",
                  background: active ? "rgba(37,99,235,0.15)" : "transparent",
                  borderLeft: active ? "2px solid #2563eb" : "2px solid transparent",
                }}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)" }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.full_name || "User"}</p>
              <p className="text-slate-500 text-xs truncate">{user?.organization || ""}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}