import { useState, useMemo } from "react";
import type { CSSProperties } from "react";

const RISK_COLORS = {
  critical: "#ff2d55",
  high: "#ff6b00",
  medium: "#ffd60a",
  low: "#30d158",
};

const RISK_BG = {
  critical: "rgba(255,45,85,0.08)",
  high: "rgba(255,107,0,0.08)",
  medium: "rgba(255,214,10,0.06)",
  low: "rgba(48,209,88,0.05)",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Finding = Record<string, any>;
type RiskKey = keyof typeof RISK_COLORS;

interface LogViewerProps {
  content: string;
  findings?: Finding[];
  maskedContent?: string;
}

export default function LogViewer({ content, findings = [], maskedContent }: LogViewerProps) {
  const [showMasked, setShowMasked] = useState(false);
  const [filter, setFilter] = useState("all"); // all | risky | errors

  const displayContent = showMasked && maskedContent ? maskedContent : content;

  // Build a map of line number → highest risk finding
  const lineRiskMap = useMemo(() => {
    const map: Record<number, Finding> = {};
    const riskOrder: RiskKey[] = ["critical", "high", "medium", "low"];
    findings.forEach((f) => {
      const line = f.line;
      if (!line || line < 1) return;
      if (!map[line]) {
        map[line] = f;
      } else {
        const existing = riskOrder.indexOf(map[line].risk as RiskKey);
        const incoming = riskOrder.indexOf(f.risk as RiskKey);
        if (incoming < existing) map[line] = f;
      }
    });
    return map;
  }, [findings]);

  const riskyLines = new Set(Object.keys(lineRiskMap).map(Number));
  const lines = (displayContent || "").split("\n");

  const filteredLines = useMemo(() => {
    return lines.map((text, i) => ({ text, num: i + 1 })).filter(({ num, text }) => {
      if (filter === "risky") return riskyLines.has(num);
      if (filter === "errors") return /error|exception|fatal|critical/i.test(text);
      return true;
    });
  }, [lines, filter, riskyLines]);

  if (!content) return null;

  const riskyCount = riskyLines.size;

  return (
    <div style={styles.wrapper}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.toolbarTitle}>LOG VIEWER</span>
          <span style={styles.lineCount}>{lines.length} lines</span>
          {riskyCount > 0 && (
            <span style={styles.riskyCount}>⚠ {riskyCount} flagged</span>
          )}
        </div>
        <div style={styles.toolbarRight}>
          {/* Filter buttons */}
          {["all", "risky", "errors"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
            >
              {f.toUpperCase()}
            </button>
          ))}
          {/* Masked toggle */}
          {maskedContent && (
            <button
              onClick={() => setShowMasked((v) => !v)}
              style={{ ...styles.maskToggle, ...(showMasked ? styles.maskToggleActive : {}) }}
            >
              {showMasked ? "🔓 RAW" : "🔒 MASKED"}
            </button>
          )}
        </div>
      </div>

      {/* Log lines */}
      <div style={styles.logContainer}>
        {filteredLines.length === 0 ? (
          <div style={styles.noLines}>No lines match the current filter.</div>
        ) : (
          filteredLines.map(({ text, num }) => {
            const finding = lineRiskMap[num];
            const risk = finding?.risk as keyof typeof RISK_COLORS | undefined;
            const isRisky = !!finding;

            return (
              <div
                key={num}
                style={{
                  ...styles.logLine,
                  ...(isRisky && risk ? { background: RISK_BG[risk], borderLeft: `2px solid ${RISK_COLORS[risk]}` } : {}),
                }}
                title={isRisky ? `${finding.type} · ${risk?.toUpperCase()}` : ""}
              >
                {/* Line number */}
                <span style={styles.lineNum}>{String(num).padStart(4, "0")}</span>

                {/* Line text */}
                <span style={{
                  ...styles.lineText,
                  ...(isRisky ? { color: "rgba(255,255,255,0.85)" } : {}),
                }}>
                  {text || " "}
                </span>

                {/* Risk badge */}
                {isRisky && risk && (
                  <span style={{ ...styles.riskBadge, color: RISK_COLORS[risk], borderColor: RISK_COLORS[risk] + "44" }}>
                    {risk?.toUpperCase()}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      {riskyCount > 0 && (
        <div style={styles.legend}>
          {Object.entries(RISK_COLORS).map(([level, color]) => (
            <span key={level} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, background: color }} />
              {level}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "flex", flexDirection: "column", gap: "0",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "12px", overflow: "hidden",
    background: "rgba(4,8,16,0.6)",
  },
  toolbar: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.03)",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    flexWrap: "wrap", gap: "8px",
  },
  toolbarLeft: { display: "flex", alignItems: "center", gap: "12px" },
  toolbarTitle: {
    fontFamily: "'Space Mono', monospace", fontSize: "10px",
    color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em",
  },
  lineCount: {
    fontFamily: "'Space Mono', monospace", fontSize: "10px",
    color: "rgba(255,255,255,0.2)",
  },
  riskyCount: {
    fontFamily: "'Space Mono', monospace", fontSize: "10px",
    color: "#ffd60a", padding: "2px 6px",
    background: "rgba(255,214,10,0.08)",
    borderRadius: "4px",
  },
  toolbarRight: { display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" },
  filterBtn: {
    padding: "4px 10px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "4px",
    color: "rgba(255,255,255,0.3)",
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px", letterSpacing: "0.08em",
    cursor: "pointer", transition: "all 0.15s",
  },
  filterBtnActive: {
    background: "rgba(0,245,255,0.1)",
    border: "1px solid rgba(0,245,255,0.25)",
    color: "#00f5ff",
  },
  maskToggle: {
    padding: "4px 10px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "4px",
    color: "rgba(255,255,255,0.3)",
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px", letterSpacing: "0.05em",
    cursor: "pointer", transition: "all 0.15s", marginLeft: "4px",
  },
  maskToggleActive: {
    background: "rgba(48,209,88,0.1)",
    border: "1px solid rgba(48,209,88,0.25)",
    color: "#30d158",
  },
  logContainer: {
    maxHeight: "clamp(200px, 40vh, 340px)", overflowY: "auto",
    fontFamily: "'Space Mono', monospace",
    overflowX: "hidden",
  },
  logLine: {
    display: "flex", alignItems: "flex-start", gap: "0",
    padding: "3px 12px 3px 0",
    borderLeft: "2px solid transparent",
    transition: "background 0.1s",
  },
  lineNum: {
    minWidth: "52px", padding: "0 12px",
    color: "rgba(255,255,255,0.15)",
    fontSize: "11px", lineHeight: "20px",
    userSelect: "none", textAlign: "right",
    borderRight: "1px solid rgba(255,255,255,0.04)",
    marginRight: "12px",
  },
  lineText: {
    fontSize: "11px", color: "rgba(255,255,255,0.45)",
    lineHeight: "20px", flex: 1,
    whiteSpace: "pre-wrap", wordBreak: "break-all",
  },
  riskBadge: {
    alignSelf: "center",
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px", letterSpacing: "0.06em",
    padding: "2px 6px", borderRadius: "3px",
    border: "1px solid", marginLeft: "10px",
    whiteSpace: "nowrap",
  },
  noLines: {
    padding: "32px", textAlign: "center",
    color: "rgba(255,255,255,0.2)", fontSize: "13px",
    fontFamily: "'Space Mono', monospace",
  },
  legend: {
    display: "flex", gap: "16px", padding: "8px 16px",
    borderTop: "1px solid rgba(255,255,255,0.04)",
    background: "rgba(255,255,255,0.01)",
  },
  legendItem: {
    display: "flex", alignItems: "center", gap: "6px",
    fontFamily: "'Space Mono', monospace", fontSize: "9px",
    color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  legendDot: { width: "6px", height: "6px", borderRadius: "50%" },
};