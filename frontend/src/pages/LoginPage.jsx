import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--bg-card)",
    color: "var(--text-primary)",
    fontSize: "14px",
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 400,
    outline: "none",
    transition: "border-color 0.15s ease",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: "11px",
    fontWeight: 500,
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "8px",
    fontFamily: "'Outfit', sans-serif",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-base)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Subtle glow */}
      <div style={{
        position: "absolute",
        top: "30%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "600px",
        height: "400px",
        background: "radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Link to="/" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "52px", height: "52px", borderRadius: "14px",
            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
            marginBottom: "16px",
            boxShadow: "0 8px 24px rgba(124,58,237,0.25)",
            textDecoration: "none",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </Link>
          <h1 style={{
            fontSize: "22px", fontWeight: 600, color: "var(--text-primary)",
            fontFamily: "'Outfit', sans-serif", display: "block",
          }}>
            Welcome back
          </h1>
          <p style={{
            fontSize: "13px", color: "var(--text-secondary)", marginTop: "6px",
            fontFamily: "'Outfit', sans-serif",
          }}>
            Sign in to Cloud Anomaly Detection
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "var(--shadow-resting)",
          backdropFilter: "var(--blur-layer)",
        }}>

          {error && (
            <div style={{
              padding: "12px 16px", borderRadius: "10px", marginBottom: "20px",
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "var(--danger)", fontSize: "13px",
              fontFamily: "'Outfit', sans-serif",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="analyst@company.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              className="interactive-button"
              style={{
                width: "100%", padding: "13px",
                borderRadius: "10px", border: "none",
                background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg, #a78bfa, #7c3aed)",
                color: "white", fontSize: "14px", fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Outfit', sans-serif",
                boxShadow: loading ? "none" : "var(--shadow-active)",
                transition: "var(--transition-button)",
                filter: btnHover && !loading ? "brightness(1.1)" : "none",
                transform: btnHover && !loading ? "scale(1.02)" : "scale(1)",
                marginTop: "4px",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={{
            textAlign: "center", marginTop: "24px",
            fontSize: "13px", color: "var(--text-secondary)",
            fontFamily: "'Outfit', sans-serif",
          }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>
              Create account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
