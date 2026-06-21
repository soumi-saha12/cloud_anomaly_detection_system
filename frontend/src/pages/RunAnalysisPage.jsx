import { useEffect, useRef, useState } from "react";
import { getAnalysisSchema, runAnalysis } from "../services/api";
import MainLayout from "../layouts/MainLayout";
import AnalysisOutput from "../components/AnalysisOutput";

const COLORS = {
  bg: "var(--bg-base)",
  card: "var(--bg-card)",
  border: "var(--border)",
  borderHover: "var(--border-hover)",
  borderActive: "rgba(167, 139, 250, 0.6)",
  accent: "var(--accent)",
  accentDeep: "var(--accent-hover)",
  textPrimary: "var(--text-primary)",
  textMuted: "var(--text-secondary)",
  textLabel: "var(--text-muted)",
  danger: "var(--danger)",
  dangerBg: "rgba(239, 68, 68, 0.12)",
  dangerBorder: "rgba(239, 68, 68, 0.3)",
};

const FONT = "'Outfit', sans-serif";

const LOG_SLOTS = [
  { key: "authLog", title: "Authentication Logs", hint: "Login attempts, session events" },
  { key: "apiLog", title: "API Request Logs", hint: "Request/response telemetry" },
  { key: "systemLog", title: "System Metrics Logs", hint: "CPU, memory, latency data" },
];

const BACKEND_SOURCE_LABELS = {
  auth: "Authentication",
  api: "API",
  system: "System",
};

const BACKEND_SOURCE_ORDER = ["auth", "api", "system"];

function generateDefaultRunName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `Analysis ${year}-${month}-${day} ${hours}:${minutes}`;
}

function UploadIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
  );
}

function FileIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M7 2.5h7l4 4V20a1 1 0 01-1 1H7a1 1 0 01-1-1V3.5a1 1 0 011-1z" />
      <path d="M14 2.5V7h4" />
    </svg>
  );
}

function XIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeColumnName(value) {
  return String(value ?? "").replace(/^\uFEFF/, "").trim();
}

function parseCsvHeader(text) {
  const firstLine = String(text ?? "").replace(/^\uFEFF/, "").split(/\r?\n/)[0] ?? "";
  const headers = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i += 1) {
    const char = firstLine[i];

    if (char === '"') {
      if (inQuotes && firstLine[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      headers.push(normalizeColumnName(current));
      current = "";
      continue;
    }

    current += char;
  }

  headers.push(normalizeColumnName(current));
  return headers.filter((header) => header.length > 0);
}

function findDuplicateColumns(columns) {
  const seen = new Set();
  const duplicates = [];

  columns.forEach((column) => {
    if (seen.has(column) && !duplicates.includes(column)) {
      duplicates.push(column);
    }
    seen.add(column);
  });

  return duplicates;
}

function buildSchemaValidationError(issues) {
  return {
    type: "SCHEMA_VALIDATION",
    title: "Dataset validation failed.",
    issues,
  };
}

function buildSingleSchemaIssue(sourceType, schema, validationMessage, missingColumns = [], duplicateColumns = []) {
  return {
    source_type: sourceType,
    label: schema?.label || `${sourceType} dataset`,
    message: validationMessage,
    missing_columns: missingColumns,
    duplicate_columns: duplicateColumns,
  };
}

async function readCsvHeaders(file) {
  const text = await file.text();
  return parseCsvHeader(text);
}

async function validateFilesAgainstSchemas(files, schemas) {
  const issues = [];

  for (const sourceType of BACKEND_SOURCE_ORDER) {
    const file = files[`${sourceType}Log`];
    const schema = schemas?.[sourceType];

    if (!file) {
      continue;
    }

    if (!schema) {
      issues.push({
        source_type: sourceType,
        label: BACKEND_SOURCE_LABELS[sourceType] || sourceType,
        message: "Schema definition unavailable.",
        missing_columns: [],
        duplicate_columns: [],
      });
      continue;
    }

    const headers = await readCsvHeaders(file);

    if (headers.length === 0) {
      issues.push(buildSingleSchemaIssue(sourceType, schema, "Empty dataset"));
      continue;
    }

    const duplicateColumns = findDuplicateColumns(headers);
    if (duplicateColumns.length > 0) {
      issues.push(buildSingleSchemaIssue(sourceType, schema, "Duplicate column names", [], duplicateColumns));
      continue;
    }

    const missingColumns = schema.required_columns.filter((column) => !headers.includes(column));
    if (missingColumns.length > 0) {
      issues.push(buildSingleSchemaIssue(sourceType, schema, "Missing required columns", missingColumns));
    }
  }

  return issues;
}

function downloadCsvTemplate(schema) {
  const csv = `${schema.required_columns.join(",")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${schema.label.toLowerCase().replace(/\s+/g, "_")}_template.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeSchemaResponse(data) {
  const datasets = data?.datasets || {};
  const ordered = {};

  BACKEND_SOURCE_ORDER.forEach((sourceType) => {
    if (datasets[sourceType]) {
      ordered[sourceType] = datasets[sourceType];
    }
  });

  return ordered;
}

function buildBackendSchemaIssue(data) {
  const schema = {
    label: BACKEND_SOURCE_LABELS[data?.source_type] || "Dataset",
    required_columns: [],
  };

  return buildSingleSchemaIssue(
    data?.source_type || "dataset",
    schema,
    data?.message || "Missing required columns",
    Array.isArray(data?.missing_columns) ? data.missing_columns : [],
    Array.isArray(data?.duplicate_columns) ? data.duplicate_columns : [],
  );
}

function SchemaCard({ schema, onDownload }) {
  const requiredFields = schema.required_columns.join(", ");

  return (
    <div
      style={{
        border: `1px solid ${COLORS.border}`,
        borderRadius: 14,
        backgroundColor: COLORS.bg,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{schema.label}</div>
        <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
          Column order does not matter. Extra columns are ignored.
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.textLabel, marginBottom: 8 }}>
          Required fields
        </div>
        <div
          style={{
            margin: 0,
            color: COLORS.textPrimary,
            lineHeight: 1.7,
            fontSize: 12,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            whiteSpace: "normal",
          }}
        >
          {requiredFields}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDownload(schema)}
        style={{
          border: `1px solid ${COLORS.borderActive}`,
          borderRadius: 10,
          backgroundColor: "transparent",
          color: COLORS.accent,
          padding: "10px 14px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        Download CSV template
      </button>
    </div>
  );
}

function Dropzone({ title, hint, file, onSelect, onRemove }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onSelect(dropped);
  }

  return (
    <div
      className="interactive-card"
      onClick={() => !file && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      style={{
        border: "1.5px dashed",
        borderColor: file ? COLORS.borderActive : dragOver ? COLORS.borderHover : COLORS.border,
        backgroundColor: file ? "rgba(167,139,250,0.04)" : "transparent",
        cursor: file ? "default" : "pointer",
        borderRadius: 14,
        padding: "28px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        minHeight: 160,
        justifyContent: "center",
        transition: "border-color 0.2s, background-color 0.2s",
        boxSizing: "border-box",
        flex: 1,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.json,.log,.txt"
        style={{ display: "none" }}
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) onSelect(selected);
          e.target.value = "";
        }}
      />
      {!file ? (
        <>
          <UploadIcon />
          <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.textPrimary, marginTop: 12 }}>{title}</div>
          <div style={{ fontSize: 12, fontWeight: 300, color: COLORS.textMuted, marginTop: 4 }}>{hint}</div>
          <div style={{ fontSize: 11, fontWeight: 300, color: COLORS.textMuted, marginTop: 10, opacity: 0.7 }}>.csv · .json · .log — up to 10MB</div>
        </>
      ) : (
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", overflow: "hidden" }}>
            <FileIcon />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.textPrimary, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
              <div style={{ fontSize: 11, fontWeight: 300, color: COLORS.textMuted, marginTop: 2 }}>{formatBytes(file.size)}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            style={{ background: "none", border: "none", padding: 4, cursor: "pointer", display: "flex", flexShrink: 0 }}
            aria-label={`Remove ${title}`}
          >
            <XIcon />
          </button>
        </div>
      )}
    </div>
  );
}

export default function RunAnalysisPage() {
  const [runName, setRunName] = useState("");
  const [files, setFiles] = useState({ authLog: null, apiLog: null, systemLog: null });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [schemaDefinitions, setSchemaDefinitions] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(true);

  const hasAllFiles = files.authLog && files.apiLog && files.systemLog;
  const canSubmit = hasAllFiles && !submitting;

  useEffect(() => {
    let active = true;

    async function loadSchemaDefinitions() {
      try {
        const response = await getAnalysisSchema();
        if (active) {
          setSchemaDefinitions(normalizeSchemaResponse(response.data));
        }
      } catch {
        if (active) {
          setSchemaDefinitions(null);
        }
      } finally {
        if (active) {
          setSchemaLoading(false);
        }
      }
    }

    loadSchemaDefinitions();

    return () => {
      active = false;
    };
  }, []);

  function setFile(key, file) {
    setFiles((prev) => ({ ...prev, [key]: file }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!hasAllFiles) {
      setError({
        type: "GENERIC",
        message: "Upload all three log files to begin.",
      });
      return;
    }

    if (!schemaDefinitions) {
      setError({
        type: "GENERIC",
        message: "Required schema information is still loading. Please try again in a moment.",
      });
      return;
    }

    const validationIssues = await validateFilesAgainstSchemas(files, schemaDefinitions);
    if (validationIssues.length > 0) {
      setError(buildSchemaValidationError(validationIssues));
      return;
    }

    setSubmitting(true);
    setAnalysisResult(null);
    try {
      const finalRunName = runName.trim() || generateDefaultRunName();
      const formData = new FormData();
      formData.append("run_name", finalRunName);
      formData.append("auth_file", files.authLog);
      formData.append("api_file", files.apiLog);
      formData.append("system_file", files.systemLog);

      const res = await runAnalysis(formData);
      setAnalysisResult(res.data);
    } catch (err) {
      const responseData = err.response?.data;

      if (responseData?.error_type === "SCHEMA_VALIDATION") {
        if (responseData?.message === "Dataset contains missing values.") {
          setError({
            type: "SCHEMA_VALIDATION",
            title: "Dataset validation failed.",
            isMissingValues: true,
            message: "One or more uploaded datasets contain missing values (NaN). Please clean the dataset or use a preprocessing pipeline before analysis.",
            details: responseData.details || {},
          });
        } else {
          setError(buildSchemaValidationError([buildBackendSchemaIssue(responseData)]));
        }
      } else {
        setError({
          type: "GENERIC",
          message: responseData?.message || responseData?.error || "Analysis failed to start. Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <MainLayout>
      <div style={{ fontFamily: FONT, padding: "40px 48px", maxWidth: "100%", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: COLORS.textPrimary, margin: 0 }}>
            Run New Analysis
          </h1>
          <p style={{ fontSize: 14, fontWeight: 300, color: COLORS.textMuted, marginTop: 8, maxWidth: 560 }}>
            Upload your logs and we'll correlate authentication, API, and system signals automatically.
          </p>
        </div>

        {/* Form card — full width of content area */}
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: "32px 36px",
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          {error && (
            <div style={{
              backgroundColor: COLORS.dangerBg,
              border: `1px solid ${COLORS.dangerBorder}`,
              color: COLORS.danger,
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 400,
              marginBottom: 28,
              lineHeight: 1.6,
            }}>
              {error.type === "SCHEMA_VALIDATION" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontWeight: 600 }}>{error.title}</div>
                  {error.isMissingValues ? (
                    <>
                      <div>{error.message}</div>
                      {error.details && (
                        <div style={{ marginTop: 4 }}>
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {Object.entries(error.details).map(([filename, detail]) => (
                              <li key={filename}>
                                <span style={{ fontWeight: 600 }}>{filename}</span>: {detail.missing_values} missing values
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {error.issues?.map((issue) => (
                        <div key={issue.source_type} style={{ marginTop: 4 }}>
                          <div style={{ fontWeight: 600 }}>{issue.label}</div>
                          <div>{issue.message}</div>
                          {issue.missing_columns?.length > 0 && (
                            <div style={{ marginTop: 4 }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>Missing required columns:</div>
                              <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {issue.missing_columns.map((column) => (
                                  <li key={column}>{column}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {issue.duplicate_columns?.length > 0 && (
                            <div style={{ marginTop: 4 }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>Duplicate columns:</div>
                              <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {issue.duplicate_columns.map((column) => (
                                  <li key={column}>{column}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                      <div>Please upload a dataset matching the supported schema for each source.</div>
                    </>
                  )}
                </div>
              ) : (
                error?.message || error
              )}
            </div>
          )}

          {/* Run name */}
          <label style={{ display: "block", fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", color: COLORS.textLabel, marginBottom: 8 }}>
            RUN NAME
          </label>
          <input
            type="text"
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            placeholder="e.g. Weekly Security Audit"
            style={{
              width: "100%",
              maxWidth: 480,
              boxSizing: "border-box",
              backgroundColor: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 10,
              padding: "13px 16px",
              fontSize: 14,
              fontFamily: FONT,
              fontWeight: 300,
              color: COLORS.textPrimary,
              outline: "none",
              display: "block",
            }}
          />

          {/* Dropzone row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            marginTop: 28,
          }}>
            {LOG_SLOTS.map((slot) => (
              <Dropzone
                key={slot.key}
                title={slot.title}
                hint={slot.hint}
                file={files[slot.key]}
                onSelect={(f) => setFile(slot.key, f)}
                onRemove={() => setFile(slot.key, null)}
              />
            ))}
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: COLORS.textLabel, marginBottom: 12 }}>
              Required CSV Schema
            </div>
            {schemaLoading ? (
              <div style={{ fontSize: 13, color: COLORS.textMuted }}>Loading schema definitions from the backend...</div>
            ) : schemaDefinitions ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
              }}>
                {BACKEND_SOURCE_ORDER.map((sourceType) => schemaDefinitions[sourceType] && (
                  <SchemaCard
                    key={sourceType}
                    schema={schemaDefinitions[sourceType]}
                    onDownload={downloadCsvTemplate}
                  />
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: COLORS.danger }}>
                Unable to load schema definitions right now. Analysis validation will still be enforced by the backend.
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ marginTop: 28 }}>
            <button
              type="submit"
              disabled={!canSubmit}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "14px 36px",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: FONT,
                color: "#ffffff",
                background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDeep})`,
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? "pointer" : "not-allowed",
                filter: btnHover && canSubmit ? "brightness(1.1)" : "none",
                transform: btnHover && canSubmit ? "scale(1.02)" : "scale(1)",
                transition: "filter 0.15s, transform 0.15s, opacity 0.15s",
              }}
            >
              {submitting ? "Running analysis…" : "Start Analysis"}
            </button>
          </div>
        </form>

        {/* Results */}
        {analysisResult && (
          <div style={{ marginTop: 40 }}>
            <AnalysisOutput result={analysisResult} runId={analysisResult.run_id || analysisResult.id} />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
