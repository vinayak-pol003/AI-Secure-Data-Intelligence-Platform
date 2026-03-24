import { useState } from "react";
import type { CSSProperties } from "react";

const RISK_CONFIG = {
  critical: { color: "#ff2d55", bg: "rgba(255,45,85,0.10)", glow: "rgba(255,45,85,0.2)", icon: "💀", label: "CRITICAL" },
  high:     { color: "#ff6b00", bg: "rgba(255,107,0,0.10)", glow: "rgba(255,107,0,0.2)",  icon: "🔥", label: "HIGH"     },
  medium:   { color: "#ffd60a", bg: "rgba(255,214,10,0.10)",glow: "rgba(255,214,10,0.2)", icon: "⚠️", label: "MEDIUM"   },
  low:      { color: "#30d158", bg: "rgba(48,209,88,0.10)", glow: "rgba(48,209,88,0.2)",  icon: "ℹ️", label: "LOW"      },
  clean:    { color: "#30d158", bg: "rgba(48,209,88,0.10)", glow: "rgba(48,209,88,0.2)",  icon: "✅", label: "CLEAN"    },
};

const TYPE_LABELS = {
  email: "Email Address",
  phone: "Phone Number",
  api_key: "API Key",
  password: "Password",
  token: "Auth Token",
  secret_key: "Secret Key",
  aws_key: "AWS Key",
  private_key: "Private Key",
  jwt_token: "JWT Token",
  ip_address: "IP Address",
  credit_card: "Credit Card",
  ssn: "Social Security Number",
  db_connection: "DB Connection String",
  stack_trace: "Stack Trace",
  debug_mode_leak: "Debug Mode Leak",
  sql_error_leak: "SQL Error Leak",
  hardcoded_credentials: "Hardcoded Credentials",
  path_disclosure: "Path Disclosure",
  brute_force_attempt: "Brute Force Attempt",
  suspicious_ip: "Suspicious IP",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisResult = Record<string, any>;
type RiskLevel = keyof typeof RISK_CONFIG;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Finding = Record<string, any>;

export default function RiskPanel({ result }: { result: AnalysisResult | null }) {
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  if (!result) return null;

  const rc = RISK_CONFIG[result.risk_level as RiskLevel] || RISK_CONFIG.low;
  const findings: Finding[] = result.findings || [];

  // Group findings by risk level
  const grouped = findings.reduce<Record<string, Finding[]>>((acc, f) => {
    acc[f.risk] = acc[f.risk] || [];
    acc[f.risk].push(f);
    return acc;
  }, {});

  const riskOrder: RiskLevel[] = ["critical", "high", "medium", "low"];

  return (
    <div style={styles.wrapper}>
      {/* Risk Score Hero Card */}
      <div style={{ ...styles.heroCard, borderColor: rc.color, boxShadow: `0 0 40px ${rc.glow}` }}>
        <div style={styles.heroLeft}>
          <div style={styles.heroIcon}>{rc.icon}</div>
          <div>
            <div style={{ ...styles.heroLevel, color: rc.color }}>{rc.label}</div>
            <div style={styles.heroSublabel}>RISK LEVEL</div>
          </div>
        </div>

        <div style={styles.heroStats}>
          <div style={styles.statItem}>
            <div style={{ ...styles.statValue, color: rc.color }}>{result.risk_score}</div>
            <div style={styles.statLabel}>SCORE</div>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <div style={styles.statValue}>{findings.length}</div>
            <div style={styles.statLabel}>FINDINGS</div>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <div style={styles.statValue}>{result.line_count || 0}</div>
            <div style={styles.statLabel}>LINES</div>
          </div>
        </div>

        <div style={{ ...styles.actionBadge, color: rc.color, borderColor: rc.color + "44", background: rc.bg }}>
          {result.action?.toUpperCase() || "ANALYZED"}
        </div>
      </div>

      {/* Risk Breakdown Bar */}
      {findings.length > 0 && (
        <div style={styles.breakdownBar}>
          {riskOrder.map((level) => {
            const count = grouped[level]?.length || 0;
            const cfg = RISK_CONFIG[level as RiskLevel];
            return (
              <div key={level} style={styles.breakdownItem}>
                <div style={{ ...styles.breakdownCount, color: count > 0 ? cfg.color : "rgba(255,255,255,0.15)" }}>
                  {count}
                </div>
                <div style={styles.breakdownLabel}>{level.toUpperCase()}</div>
                <div style={{
                  ...styles.breakdownDot,
                  background: count > 0 ? cfg.color : "rgba(255,255,255,0.1)",
                  boxShadow: count > 0 ? `0 0 8px ${cfg.glow}` : "none",
                }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Findings List */}
      {findings.length > 0 && (
        <div style={styles.findingsSection}>
          <div style={styles.sectionTitle}>
            <span>FINDINGS</span>
            <span style={styles.sectionCount}>{findings.length}</span>
          </div>

          <div style={styles.findingsList}>
            {riskOrder.flatMap((level) =>
              (grouped[level] || []).map((f: Finding, i: number) => {
                const cfg = RISK_CONFIG[f.risk as RiskLevel] || RISK_CONFIG.low;
                const key = `${level}-${i}`;
                const isExpanded = expandedFinding === key;

                return (
                  <div
                    key={key}
                    style={{ ...styles.findingCard, borderLeftColor: cfg.color }}
                    onClick={() => setExpandedFinding(isExpanded ? null : key)}
                  >
                    <div style={styles.findingTop}>
                      <span style={{ ...styles.riskPill, color: cfg.color, background: cfg.bg }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <span style={styles.findingTypeName}>
                        {TYPE_LABELS[f.type as keyof typeof TYPE_LABELS] || f.type}
                      </span>
                      {f.line > 0 && (
                        <span style={styles.lineTag}>L{f.line}</span>
                      )}
                      <span style={{ ...styles.expandIcon, transform: isExpanded ? "rotate(180deg)" : "none" }}>
                        ∨
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={styles.findingDetails}>
                        {f.value && (
                          <div style={styles.detailRow}>
                            <span style={styles.detailKey}>VALUE</span>
                            <code style={{ ...styles.detailVal, color: cfg.color }}>{f.value}</code>
                          </div>
                        )}
                        {f.raw_line && (
                          <div style={styles.detailRow}>
                            <span style={styles.detailKey}>LINE</span>
                            <code style={styles.rawLine}>{f.raw_line}</code>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {findings.length === 0 && (
        <div style={styles.cleanState}>
          <div style={styles.cleanIcon}>✅</div>
          <div style={styles.cleanTitle}>No Issues Found</div>
          <div style={styles.cleanSub}>Content appears clean and safe</div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: "16px" },
  heroCard: {
    padding: "20px 24px",
    border: "1px solid",
    borderRadius: "14px",
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap", gap: "16px",
    background: "rgba(10,15,26,0.6)",
    transition: "box-shadow 0.3s",
  },
  heroLeft: { display: "flex", alignItems: "center", gap: "14px" },
  heroIcon: { fontSize: "36px", lineHeight: 1 },
  heroLevel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "22px", fontWeight: 700, letterSpacing: "0.05em",
  },
  heroSublabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px", color: "rgba(255,255,255,0.25)",
    letterSpacing: "0.15em", marginTop: "3px",
  },
  heroStats: { display: "flex", alignItems: "center", gap: "20px" },
  statItem: { textAlign: "center" },
  statValue: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "26px", fontWeight: 700, color: "#fff",
  },
  statLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px", color: "rgba(255,255,255,0.25)",
    letterSpacing: "0.12em", marginTop: "2px",
  },
  statDivider: {
    width: "1px", height: "36px",
    background: "rgba(255,255,255,0.08)",
  },
  actionBadge: {
    padding: "6px 14px",
    border: "1px solid",
    borderRadius: "6px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px", letterSpacing: "0.1em",
  },
  breakdownBar: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    padding: "16px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "10px",
  },
  breakdownItem: { textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" },
  breakdownCount: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "28px", fontWeight: 700,
  },
  breakdownLabel: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px", color: "rgba(255,255,255,0.25)",
    letterSpacing: "0.1em",
  },
  breakdownDot: { width: "6px", height: "6px", borderRadius: "50%", transition: "all 0.3s" },
  findingsSection: { display: "flex", flexDirection: "column", gap: "10px" },
  sectionTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px", color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.15em",
    display: "flex", alignItems: "center", gap: "10px",
  },
  sectionCount: {
    background: "rgba(255,255,255,0.06)",
    padding: "2px 8px", borderRadius: "10px",
    fontSize: "10px", color: "rgba(255,255,255,0.4)",
  },
  findingsList: { display: "flex", flexDirection: "column", gap: "6px" },
  findingCard: {
    padding: "10px 14px",
    background: "rgba(255,255,255,0.02)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderLeft: "3px solid",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  findingTop: {
    display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
  },
  riskPill: {
    padding: "3px 8px", borderRadius: "4px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px", letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
  findingTypeName: {
    fontSize: "13px", color: "rgba(255,255,255,0.7)",
    fontWeight: 500, flex: 1,
  },
  lineTag: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px", color: "rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.05)",
    padding: "2px 6px", borderRadius: "4px",
  },
  expandIcon: {
    fontSize: "12px", color: "rgba(255,255,255,0.2)",
    transition: "transform 0.2s", marginLeft: "auto",
  },
  findingDetails: {
    marginTop: "10px", paddingTop: "10px",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    display: "flex", flexDirection: "column", gap: "8px",
  },
  detailRow: { display: "flex", gap: "12px", alignItems: "flex-start" },
  detailKey: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px", color: "rgba(255,255,255,0.25)",
    letterSpacing: "0.12em", minWidth: "44px",
    paddingTop: "2px",
  },
  detailVal: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px", wordBreak: "break-all",
    background: "rgba(255,255,255,0.04)",
    padding: "3px 8px", borderRadius: "4px",
  },
  rawLine: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "11px", color: "rgba(255,255,255,0.3)",
    wordBreak: "break-all",
  },
  cleanState: {
    textAlign: "center", padding: "40px 20px",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
  },
  cleanIcon: { fontSize: "40px" },
  cleanTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "14px", color: "#30d158", letterSpacing: "0.08em",
  },
  cleanSub: { fontSize: "13px", color: "rgba(255,255,255,0.3)" },
};