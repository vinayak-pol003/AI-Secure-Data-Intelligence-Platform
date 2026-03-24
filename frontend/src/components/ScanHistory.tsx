import { useState, useEffect, useCallback } from "react";
import type { CSSProperties } from "react";
import { listScans, getScan } from "../api";

interface ScanSummary {
  id: string;
  created_at: string;
  content_type: string;
  filename: string | null;
  risk_score: number;
  risk_level: string;
  action: string;
  summary: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScanDetail = Record<string, any>;

const RISK_COLORS: Record<string, string> = {
  critical: "#ff2d55",
  high: "#ff6b00",
  medium: "#ffd60a",
  low: "#30d158",
  clean: "#00f5ff",
};

function riskColor(level: string) {
  return RISK_COLORS[level] ?? "#aaa";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScanHistory() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ScanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listScans(50, 0);
      setScans(data);
    } catch {
      setError("Failed to load scan history. Is the backend reachable?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openScan = async (id: string) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const detail = await getScan(id);
      setSelected(detail);
    } catch {
      setError("Failed to load scan details.");
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinner}>⟳</div>
        <span style={styles.muted}>Loading scan history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorBox}>
        <span>⚠</span> {error}
        <button onClick={load} style={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div style={styles.centered}>
        <div style={{ fontSize: "36px", color: "rgba(0,245,255,0.15)" }}>⬡</div>
        <span style={styles.muted}>No scans yet. Run your first analysis!</span>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Scan list */}
      <div style={styles.listCol}>
        <div style={styles.listHeader}>
          <span style={styles.listTitle}>RECENT SCANS</span>
          <button onClick={load} style={styles.refreshBtn}>↺ Refresh</button>
        </div>
        <div style={styles.list}>
          {scans.map((s) => (
            <button
              key={s.id}
              onClick={() => openScan(s.id)}
              style={{
                ...styles.scanRow,
                ...(selected?.id === s.id ? styles.scanRowActive : {}),
              }}
            >
              <div style={styles.scanRowTop}>
                <span style={{ ...styles.badge, color: riskColor(s.risk_level), borderColor: riskColor(s.risk_level) + "44" }}>
                  {s.risk_level.toUpperCase()}
                </span>
                <span style={styles.scanType}>{s.content_type}</span>
                <span style={styles.scanDate}>{formatDate(s.created_at)}</span>
              </div>
              <div style={styles.scanSummary}>{s.summary}</div>
              {s.filename && <div style={styles.scanFile}>📄 {s.filename}</div>}
              <div style={styles.scanScore}>
                Risk score: <strong style={{ color: riskColor(s.risk_level) }}>{s.risk_score}</strong>
                &nbsp;·&nbsp;{s.action}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div style={styles.detailCol}>
        {detailLoading && (
          <div style={styles.centered}>
            <div style={styles.spinner}>⟳</div>
            <span style={styles.muted}>Loading details…</span>
          </div>
        )}
        {!detailLoading && !selected && (
          <div style={styles.centered}>
            <div style={{ fontSize: "32px", color: "rgba(255,255,255,0.08)" }}>←</div>
            <span style={styles.muted}>Select a scan to view details</span>
          </div>
        )}
        {!detailLoading && selected && (
          <div style={styles.detail}>
            <div style={styles.detailHeader}>
              <span style={{ ...styles.badge, fontSize: "11px", color: riskColor(selected.risk_level), borderColor: riskColor(selected.risk_level) + "44" }}>
                {selected.risk_level?.toUpperCase()}
              </span>
              <span style={styles.detailType}>{selected.content_type}</span>
              <span style={styles.scanDate}>{formatDate(selected.created_at)}</span>
            </div>

            {selected.filename && (
              <div style={styles.detailMeta}>📄 {selected.filename}</div>
            )}

            <div style={styles.detailSummary}>{selected.summary}</div>

            {/* Score bar */}
            <div style={styles.scoreRow}>
              <span style={styles.muted}>Risk Score</span>
              <span style={{ color: riskColor(selected.risk_level), fontFamily: "'Space Mono', monospace", fontSize: "18px" }}>
                {selected.risk_score}
              </span>
            </div>

            {/* Insights */}
            {selected.insights?.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>AI INSIGHTS</div>
                {selected.insights.map((ins: string, i: number) => (
                  <div key={i} style={styles.insightRow}>
                    <span style={styles.insightDot}>·</span>
                    <span style={styles.insightText}>{ins}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Findings */}
            {selected.findings?.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>FINDINGS ({selected.findings.length})</div>
                <div style={styles.findingsList}>
                  {selected.findings.map((f: Record<string, unknown>, i: number) => (
                    <div key={i} style={styles.findingRow}>
                      <span style={{ ...styles.riskTag, color: riskColor(String(f.risk ?? "low")) }}>
                        {String(f.risk ?? "low").toUpperCase()}
                      </span>
                      <span style={styles.findingType}>{String(f.type ?? "")}</span>
                      <span style={styles.findingLine}>L{String(f.line ?? "?")}</span>
                      <span style={styles.findingVal}>{String(f.value ?? "")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    display: "grid",
    gridTemplateColumns: "340px 1fr",
    gap: "16px",
    minHeight: "400px",
  },
  listCol: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    overflow: "hidden",
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: "8px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  listTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.18em",
    color: "rgba(255,255,255,0.25)",
  },
  refreshBtn: {
    background: "none",
    border: "none",
    color: "rgba(0,245,255,0.5)",
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px",
    cursor: "pointer",
    padding: "2px 6px",
    letterSpacing: "0.05em",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    overflowY: "auto",
    maxHeight: "600px",
  },
  scanRow: {
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "10px",
    padding: "12px 14px",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    transition: "all 0.15s",
    width: "100%",
    color: "inherit",
  },
  scanRowActive: {
    background: "rgba(0,245,255,0.05)",
    border: "1px solid rgba(0,245,255,0.18)",
  },
  scanRowTop: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  badge: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.08em",
    padding: "2px 6px",
    border: "1px solid",
    borderRadius: "4px",
  },
  scanType: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.06em",
  },
  scanDate: {
    marginLeft: "auto",
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px",
    color: "rgba(255,255,255,0.2)",
  },
  scanSummary: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.55)",
    lineHeight: "1.4",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  scanFile: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.25)",
    fontFamily: "'Space Mono', monospace",
  },
  scanScore: {
    fontSize: "10px",
    color: "rgba(255,255,255,0.25)",
  },
  detailCol: {
    borderLeft: "1px solid rgba(255,255,255,0.05)",
    paddingLeft: "16px",
    display: "flex",
    flexDirection: "column",
  },
  detail: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  detailType: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.08em",
  },
  detailMeta: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.3)",
    fontFamily: "'Space Mono', monospace",
  },
  detailSummary: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.7)",
    lineHeight: "1.6",
    padding: "12px 14px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "8px",
  },
  scoreRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px",
    letterSpacing: "0.18em",
    color: "rgba(255,255,255,0.2)",
    paddingBottom: "4px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  insightRow: {
    display: "flex",
    gap: "8px",
    fontSize: "12px",
    color: "rgba(255,255,255,0.55)",
    lineHeight: "1.5",
  },
  insightDot: {
    color: "rgba(0,245,255,0.4)",
    flexShrink: 0,
    marginTop: "1px",
  },
  insightText: {},
  findingsList: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    maxHeight: "220px",
    overflowY: "auto",
  },
  findingRow: {
    display: "grid",
    gridTemplateColumns: "60px 110px 36px 1fr",
    gap: "8px",
    padding: "5px 8px",
    background: "rgba(255,255,255,0.02)",
    borderRadius: "6px",
    alignItems: "center",
    fontSize: "10px",
  },
  riskTag: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "8px",
    letterSpacing: "0.06em",
  },
  findingType: {
    color: "rgba(255,255,255,0.55)",
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  findingLine: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px",
    color: "rgba(255,255,255,0.25)",
  },
  findingVal: {
    color: "rgba(255,255,255,0.35)",
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  centered: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    minHeight: "200px",
  },
  spinner: {
    fontSize: "24px",
    color: "#00f5ff",
    animation: "spin 1s linear infinite",
    display: "inline-block",
  },
  muted: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.25)",
    fontFamily: "'Space Mono', monospace",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 16px",
    background: "rgba(255,45,85,0.08)",
    border: "1px solid rgba(255,45,85,0.2)",
    borderRadius: "8px",
    color: "#ff2d55",
    fontSize: "12px",
  },
  retryBtn: {
    marginLeft: "auto",
    background: "none",
    border: "1px solid rgba(255,45,85,0.3)",
    borderRadius: "6px",
    color: "#ff2d55",
    fontSize: "10px",
    cursor: "pointer",
    padding: "4px 10px",
    fontFamily: "'Space Mono', monospace",
  },
};
