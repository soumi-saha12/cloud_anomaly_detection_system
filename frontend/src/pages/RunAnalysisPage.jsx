import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { runAnalysis } from "../services/api";

function getErrorMessage(error) {
  return error.response?.data?.message || error.response?.data?.error || "Analysis failed. Please try again.";
}

function FileUploadBox({ label, description, accept, file, onChange }) {
  return (
    <div
      className="rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 hover:border-blue-500/50"
      style={{ borderColor: file ? "#2563eb" : "#1e3a5f", background: file ? "rgba(37,99,235,0.05)" : "rgba(15,22,41,0.5)" }}
      onClick={() => document.getElementById(`file-${label}`).click()}
    >
      <input id={`file-${label}`} type="file" accept={accept} className="hidden" onChange={onChange} />
      {file ? (
        <div>
          <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(37,99,235,0.2)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <p className="text-blue-400 text-sm font-medium">{file.name}</p>
          <p className="text-slate-500 text-xs mt-1">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
      ) : (
        <div>
          <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(30,58,95,0.5)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p className="text-slate-300 text-sm font-medium">{label}</p>
          <p className="text-slate-500 text-xs mt-1">{description}</p>
          <p className="text-slate-600 text-xs mt-2">Click to upload CSV</p>
        </div>
      )}
    </div>
  );
}

export default function RunAnalysisPage() {
  const navigate = useNavigate();
  const [runName, setRunName] = useState("");
  const [files, setFiles] = useState({ auth: null, api: null, system: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (key) => (e) => {
    setError("");
    setFiles({ ...files, [key]: e.target.files[0] || null });
  };

  const handleSubmit = async () => {
    if (!files.auth || !files.api || !files.system) {
      setError("Please upload authentication logs, API logs, and system metrics CSV files.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      if (runName.trim()) {
        formData.append("run_name", runName.trim());
      }
      formData.append("auth_file", files.auth);
      formData.append("api_file", files.api);
      formData.append("system_file", files.system);

      const response = await runAnalysis(formData);
      const runId = response.data?.run_id;

      if (!runId) {
        throw new Error("Analysis response did not include a run_id.");
      }

      navigate(`/results/${runId}`, { state: { result: response.data } });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const allReady = files.auth && files.api && files.system;

  return (
    <MainLayout>
      <div className="p-8 max-w-3xl">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Run Analysis</h1>
          <p className="text-slate-400 text-sm mt-1">Upload telemetry files to detect cloud anomalies</p>
        </div>

        {/* Run Name */}
        <div className="rounded-xl p-6 border border-slate-700/50 mb-6" style={{ background: "rgba(15,22,41,0.8)" }}>
          <label className="block text-sm font-medium text-slate-300 mb-2">Analysis Run Name</label>
          <input
            type="text"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            placeholder="e.g. Production Audit June 2026"
            className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-slate-500 border border-slate-600/50 outline-none focus:border-blue-500 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        </div>

        {/* File Uploads */}
        <div className="rounded-xl p-6 border border-slate-700/50 mb-6" style={{ background: "rgba(15,22,41,0.8)" }}>
          <h2 className="text-sm font-semibold text-white mb-4">Upload Telemetry Files</h2>
          <div className="grid grid-cols-3 gap-4">
            <FileUploadBox
              label="Authentication Logs"
              description="auth_logs.csv"
              accept=".csv"
              file={files.auth}
              onChange={handleFile("auth")}
            />
            <FileUploadBox
              label="API Activity Logs"
              description="api_logs.csv"
              accept=".csv"
              file={files.api}
              onChange={handleFile("api")}
            />
            <FileUploadBox
              label="System Metrics"
              description="system_metrics.csv"
              accept=".csv"
              file={files.system}
              onChange={handleFile("system")}
            />
          </div>
        </div>

        {/* Status */}
        <div className="rounded-xl p-4 border border-slate-700/50 mb-6" style={{ background: "rgba(15,22,41,0.8)" }}>
          <div className="flex items-center gap-6">
            {[
              { label: "Run Name", done: !!runName, optional: true },
              { label: "Auth Logs", done: !!files.auth },
              { label: "API Logs", done: !!files.api },
              { label: "System Metrics", done: !!files.system },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: item.done ? "rgba(34,197,94,0.2)" : "rgba(100,116,139,0.2)" }}>
                  {item.done
                    ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  }
                </div>
                <span className="text-xs" style={{ color: item.done ? "#22c55e" : "#64748b" }}>
                  {item.label}{item.optional && !item.done ? " (optional)" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-300 border border-red-500/30" style={{ background: "rgba(239,68,68,0.1)" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!allReady || loading}
          className="px-8 py-3 rounded-lg font-semibold text-sm text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: allReady && !loading ? "linear-gradient(135deg, #1d4ed8, #2563eb)" : "#1e3a5f" }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Running Analysis...
            </span>
          ) : "Run Analysis"}
        </button>

      </div>
    </MainLayout>
  );
}
