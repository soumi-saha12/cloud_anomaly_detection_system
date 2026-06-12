import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ full_name: "", organization: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(formData);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-10" style={{ background: "linear-gradient(135deg, #0a0e1a 0%, #0f1629 50%, #0a1628 100%)" }}>
      
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "linear-gradient(#1e3a5f 1px, transparent 1px), linear-gradient(90deg, #1e3a5f 1px, transparent 1px)",
        backgroundSize: "50px 50px"
      }} />

      <div className="relative w-full max-w-md px-6">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ background: "linear-gradient(135deg, #1e3a5f, #2563eb)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
          <p className="text-slate-400 text-sm mt-1">Join the Cloud Anomaly Detection platform</p>
        </div>

        <div className="rounded-2xl p-8 border border-slate-700/50" style={{ background: "rgba(15, 22, 41, 0.8)", backdropFilter: "blur(20px)" }}>
          
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-300 border border-red-500/30" style={{ background: "rgba(239,68,68,0.1)" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                name="full_name"
                required
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 outline-none focus:border-blue-500 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Organization</label>
              <input
                type="text"
                name="organization"
                required
                value={formData.organization}
                onChange={handleChange}
                placeholder="Acme Security Corp"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 outline-none focus:border-blue-500 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="analyst@company.com"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 outline-none focus:border-blue-500 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 outline-none focus:border-blue-500 transition-colors"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50"
              style={{ background: loading ? "#1e3a5f" : "linear-gradient(135deg, #1d4ed8, #2563eb)" }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}