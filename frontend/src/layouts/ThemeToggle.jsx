import { useTheme } from "../contexts/ThemeContext";

function SunIcon() {
  return (
    <svg className="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="theme-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9c0-.35-.02-.7-.07-1.04A7.5 7.5 0 0 1 12 3Z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      aria-pressed={isLight}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        width: "100%",
        padding: "8px 12px",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        background: isLight ? "var(--accent-subtle)" : "transparent",
        color: isLight ? "var(--accent)" : "var(--text-secondary)",
        fontSize: "12px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "var(--transition-nav)",
        fontFamily: "'Outfit', sans-serif",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--accent)";
        e.currentTarget.style.borderColor = "var(--accent)";
        e.currentTarget.style.background = "var(--accent-subtle)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = isLight ? "var(--accent)" : "var(--text-secondary)";
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.background = isLight ? "var(--accent-subtle)" : "transparent";
      }}
    >
      {isLight ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
