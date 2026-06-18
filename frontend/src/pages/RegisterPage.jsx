import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/api";

const COLORS = {
  bg: "#08080f",
  card: "#0f0f1a",
  border: "rgba(167, 139, 250, 0.12)",
  borderFocus: "rgba(167, 139, 250, 0.5)",
  accent: "#a78bfa",
  accentDeep: "#7c3aed",
  textPrimary: "#e2e0f0",
  textMuted: "#6b6880",
  textLabel: "#8a85a0",
  danger: "#f87171",
  dangerBg: "rgba(239, 68, 68, 0.12)",
  dangerBorder: "rgba(239, 68, 68, 0.3)",
};

const FONT = "'Outfit', sans-serif";

function ShieldIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 2.5l7.5 3v6c0 5-3.2 8.7-7.5 10-4.3-1.3-7.5-5-7.5-10v-6l7.5-3z" />
    </svg>
  );
}

function Field({ label, type, value, onChange, placeholder, autoComplete }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...styles.input,
          borderColor: focused ? COLORS.borderFocus : COLORS.border,
        }}
      />
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await register({
        full_name: fullName.trim(),   // ← matches backend data.get("full_name")
        email: email.trim(),
        password,
        organization: "",             // optional field backend accepts
      });

      // Store the token returned on successful registration
      if (res.data?.access_token) {
        localStorage.setItem("access_token", res.data.access_token);
      }

      navigate("/login", { state: { justRegistered: true } });
    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Could not create your account. Please try again."
      );
      setSubmitting(false);
    }
  }

  return (
	    <div style={styles.page}>
	      <style>{`
	        @media (max-width: 480px) {
	          .reg-card { padding: var(--space-4) var(--space-3) !important; }
	        }
	      `}</style>

      <div style={styles.glow} />

      <div style={styles.heroIconWrap}>
        <ShieldIcon size={32} />
      </div>

      <h1 style={styles.title}>Create your account</h1>
      <p style={styles.subtitle}>Sign up for Cloud Anomaly Detection</p>

      <form style={styles.card} className="reg-card" onSubmit={handleSubmit}>
        {error && <div style={styles.errorBanner}>{error}</div>}

        <Field
          label="FULL NAME"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          autoComplete="name"
        />
        <Field
          label="EMAIL ADDRESS"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="analyst@company.com"
          autoComplete="email"
        />
        <Field
          label="PASSWORD"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <Field
          label="CONFIRM PASSWORD"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          autoComplete="new-password"
        />

	        <button
	          type="submit"
	          disabled={submitting}
	          onMouseEnter={() => setBtnHover(true)}
	          onMouseLeave={() => setBtnHover(false)}
	          className="interactive-button"
	          style={{
	            ...styles.submitBtn,
	            opacity: submitting ? 0.7 : 1,
	            cursor: submitting ? "not-allowed" : "pointer",
	            filter: btnHover && !submitting ? "brightness(1.1)" : "none",
	            transform: btnHover && !submitting ? "scale(1.02)" : "scale(1)",
	          }}
	        >
          {submitting ? "Creating account…" : "Create Account"}
        </button>

        <p style={styles.bottomText}>
          Already have an account?{" "}
          <Link to="/login" style={styles.bottomLink}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    width: "100%",
    backgroundColor: COLORS.bg,
    fontFamily: FONT,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
	    padding: "var(--space-5) var(--space-3)",
    boxSizing: "border-box",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 640,
    height: 640,
    transform: "translate(-50%, -50%)",
    background: "radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  heroIconWrap: {
    position: "relative",
    width: 72,
    height: 72,
    borderRadius: 20,
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDeep})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
	    marginBottom: "var(--space-3)",
	    boxShadow: "var(--shadow-active)",
  },
  title: {
    position: "relative",
    fontSize: 28,
    fontWeight: 600,
    color: COLORS.textPrimary,
    margin: 0,
  },
  subtitle: {
    position: "relative",
    fontSize: 14,
    fontWeight: 300,
    color: COLORS.textMuted,
    marginTop: 8,
    marginBottom: 36,
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 440,
    backgroundColor: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: "40px",
    boxSizing: "border-box",
	    boxShadow: "var(--shadow-resting)",
	    backdropFilter: "var(--blur-layer)",
  },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.06em",
    color: COLORS.textLabel,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: COLORS.bg,
    border: "1px solid",
    borderRadius: 10,
    padding: "13px 16px",
    fontSize: 14,
    fontFamily: FONT,
    fontWeight: 300,
    color: COLORS.textPrimary,
    outline: "none",
    transition: "border-color 0.15s ease",
  },
  errorBanner: {
    backgroundColor: COLORS.dangerBg,
    border: `1px solid ${COLORS.dangerBorder}`,
    color: COLORS.danger,
    borderRadius: 10,
    padding: "12px 16px",
    fontSize: 13,
    fontWeight: 400,
    marginBottom: 20,
  },
  submitBtn: {
    width: "100%",
    border: "none",
    borderRadius: 10,
    padding: "14px",
    marginTop: 8,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: FONT,
    color: "#ffffff",
    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDeep})`,
	    transition: "var(--transition-button)",
  },
  bottomText: {
    textAlign: "center",
    marginTop: 24,
    marginBottom: 0,
    fontSize: 13,
    fontWeight: 300,
    color: COLORS.textMuted,
  },
  bottomLink: {
    color: COLORS.accent,
    fontWeight: 500,
    textDecoration: "none",
  },
};
