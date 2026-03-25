import { useState } from "react";
import type { CSSProperties } from "react";
import FileUpload from "./components/FileUpload";
import LogViewer from "./components/LogViewer";
import RiskPanel from "./components/RiskPanel";
import InsightsPanel from "./components/InsightsPanel";
import ScanHistory from "./components/ScanHistory";
import { analyzeText, analyzeFile } from "./api.ts";

const TABS = [
  { id: "text", label: "TEXT",  icon: "⌨",  placeholder: "Paste any text to scan for sensitive data, credentials, API keys, PII..." },
  { id: "log",  label: "LOG",   icon: "📋", placeholder: "Paste log file content...\n\n2026-03-10 10:00:01 INFO User login\nemail=admin@company.com\npassword=admin123\napi_key=sk-prod-xyz\nERROR: NullPointerException at service.java:45" },
  { id: "sql",  label: "SQL",   icon: "🗄", placeholder: "Paste SQL queries or database output...\n\nSELECT * FROM users WHERE password='admin123';" },
  { id: "chat", label: "CHAT",  icon: "💬", placeholder: "Paste chat logs or messages to scan..." },
  { id: "file", label: "FILE",  icon: "📁", placeholder: "" },
  { id: "history", label: "HISTORY", icon: "🕑", placeholder: "" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisResult = Record<string, any>;

export default function App() {
  const [activeTab, setActiveTab] = useState("text");
  const [textInput, setTextInput]   = useState("");
  const [maskOption, setMaskOption] = useState(true);
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const currentTab = TABS.find((t) => t.id === activeTab);

  const handleAnalyzeText = async () => {
    if (!textInput.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await analyzeText(activeTab, textInput, { mask: maskOption });
      setResult(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err.response?.data?.detail || err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await analyzeFile(file, maskOption);
      setResult(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err.response?.data?.detail || err.message || "File analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const isLogType = activeTab === "log" || result?.content_type === "log" || result?.content_type === "file";

  return (
    <div style={styles.root}>
      <div style={styles.bg1} />
      <div style={styles.bg2} />
      <div style={styles.bg3} />

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand}>
            <span style={styles.brandHex}>⬡</span>
            <div>
              <div style={styles.brandName}>SENTINEL</div>
              <div style={styles.brandTagline} className="brand-tagline">AI Secure Data Intelligence Platform</div>
            </div>
          </div>
          <div style={styles.statusChip}>
            <span style={styles.statusDot} />
            LIVE
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className={activeTab === "history" ? "app-layout-full" : "app-layout"}>
        {/* LEFT: Input (hidden when history tab active) */}
        {activeTab !== "history" && (
        <div style={styles.leftCol}>
          <div style={styles.card}>
            <div style={styles.cardLabel}><span style={styles.cardNum}>01</span> INPUT</div>

            <div style={styles.tabBar}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setActiveTab(t.id); setResult(null); setError(""); }}
                  style={{ ...styles.tabBtn, ...(activeTab === t.id ? styles.tabBtnActive : {}) }}
                >
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
            </div>

            {activeTab === "file" ? (
              <FileUpload onFileSelect={handleFileSelect} loading={loading} />
            ) : (
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={currentTab?.placeholder}
                style={styles.textarea}
                spellCheck={false}
              />
            )}

            <div style={styles.optionsRow}>
              <label style={styles.checkLabel}>
                <input type="checkbox" checked={maskOption} onChange={(e) => setMaskOption(e.target.checked)} style={{ accentColor: "#00f5ff" }} />
                <span>Mask sensitive values</span>
              </label>
              {textInput.length > 0 && activeTab !== "file" && (
                <span style={styles.charCount}>{textInput.length} chars</span>
              )}
            </div>

            {activeTab !== "file" && (
              <button
                onClick={handleAnalyzeText}
                disabled={loading || !textInput.trim()}
                style={{ ...styles.analyzeBtn, ...(loading || !textInput.trim() ? styles.analyzeBtnDisabled : {}) }}
              >
                {loading ? "⟳ ANALYZING..." : "⬡ RUN ANALYSIS"}
              </button>
            )}

            {error && <div style={styles.errorBox}>⚠ {error}</div>}
          </div>

          {/* Log Viewer */}
          {result && isLogType && (
            <div style={styles.card}>
              <div style={styles.cardLabel}><span style={styles.cardNum}>03</span> LOG VIEWER</div>
              <LogViewer
                content={textInput || result.masked_content}
                findings={result.findings || []}
                maskedContent={result.masked_content}
              />
            </div>
          )}
        </div>
        )}

        {/* HISTORY: full-width panel */}
        {activeTab === "history" && (
          <div style={styles.card}>
            <div style={styles.cardLabel}>
              <span style={styles.cardNum}>05</span> SCAN HISTORY
              <div style={styles.tabBar}>
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTab(t.id); setResult(null); setError(""); }}
                    style={{ ...styles.tabBtn, ...(activeTab === t.id ? styles.tabBtnActive : {}) }}
                  >
                    <span>{t.icon}</span><span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <ScanHistory />
          </div>
        )}

        {/* RIGHT: Results */}
        {activeTab !== "history" && (
        <div className="right-col">
          {!result && !loading && (
            <div style={styles.emptyCard}>
              <div style={styles.emptyHex}>⬡</div>
              <div style={styles.emptyTitle}>Awaiting Analysis</div>
              <div style={styles.emptySub}>Submit content to begin security scanning</div>
              <div style={styles.emptyHints}>
                {["Detects 13+ sensitive data types", "AI-powered risk insights", "Log file analysis", "Masks sensitive values"].map((h) => (
                  <div key={h} style={styles.emptyHint}><span style={styles.emptyHintDot}>·</span> {h}</div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div style={styles.emptyCard}>
              <div style={{ ...styles.emptyHex, animation: "spin 1.2s linear infinite" }}>⟳</div>
              <div style={styles.emptyTitle}>Scanning Content</div>
              <div style={styles.emptySub}>Detecting patterns · Scoring risks · Generating AI insights</div>
            </div>
          )}

          {result && !loading && (
            <>
              <div style={styles.card}>
                <div style={styles.cardLabel}><span style={styles.cardNum}>02</span> RISK ANALYSIS</div>
                <RiskPanel result={result} />
              </div>
              <div style={styles.card}>
                <div style={styles.cardLabel}><span style={styles.cardNum}>04</span> AI INSIGHTS</div>
                <InsightsPanel summary={result.summary} insights={result.insights || []} loading={loading} />
              </div>
            </>
          )}
        </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #040810; overflow-x: hidden; }
        textarea::placeholder { color: rgba(255,255,255,0.18); }
        ::-webkit-scrollbar { width: 3px; height: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

        /* ── Responsive layout ── */
        .app-layout {
          width: 100%; padding: 28px 32px;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 20px; position: relative; z-index: 1; align-items: start;
        }
        .app-layout-full {
          width: 100%; padding: 28px 32px;
          display: block; position: relative; z-index: 1;
        }
        .right-col {
          display: flex; flex-direction: column; gap: 20px;
          position: sticky; top: 80px;
        }
        .tab-bar {
          display: flex; gap: 4px;
          background: rgba(255,255,255,0.02);
          padding: 4px; border-radius: 10px;
          flex-wrap: wrap;
        }
        .brand-tagline { display: block; }
        @media (max-width: 768px) {
          .app-layout {
            grid-template-columns: 1fr;
            padding: 16px;
            gap: 14px;
          }
          .app-layout-full { padding: 16px; }
          .right-col { position: static; }
          .brand-tagline { display: none; }
          .scan-history-root { grid-template-columns: 1fr !important; }
          .scan-history-root > *:last-child {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid rgba(255,255,255,0.05);
            padding-top: 16px;
          }
        }
        @media (max-width: 480px) {
          .app-layout { padding: 10px; gap: 10px; }
          .app-layout-full { padding: 10px; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: { minHeight: "100vh", background: "#040810", color: "#e2e8f0", fontFamily: "'Syne', sans-serif", position: "relative" },
  bg1: { position: "fixed", top: "-300px", left: "-300px", width: "700px", height: "700px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,245,255,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 },
  bg2: { position: "fixed", bottom: "-200px", right: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,45,85,0.04) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 },
  bg3: { position: "fixed", top: "40%", left: "40%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,0,0.02) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 },
  header: { position: "sticky", top: 0, zIndex: 100, background: "rgba(4,8,16,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  headerInner: { width: "100%", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" },
  brand: { display: "flex", alignItems: "center", gap: "14px" },
  brandHex: { fontSize: "26px", color: "#00f5ff" },
  brandName: { fontFamily: "'Space Mono', monospace", fontSize: "18px", fontWeight: 700, color: "#fff", letterSpacing: "0.18em" },
  brandTagline: { fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", marginTop: "2px" },
  statusChip: { fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#00f5ff", letterSpacing: "0.1em", padding: "5px 12px", border: "1px solid rgba(0,245,255,0.2)", borderRadius: "4px", background: "rgba(0,245,255,0.05)", display: "flex", alignItems: "center", gap: "7px" },
  statusDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#00f5ff", animation: "pulse 2s ease-in-out infinite" },
  layout: { width: "100%", padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", position: "relative", zIndex: 1, alignItems: "start" },
  layoutFull: { width: "100%", padding: "28px 32px", display: "block", position: "relative", zIndex: 1 },
  leftCol: { display: "flex", flexDirection: "column", gap: "20px" },
  rightCol: { display: "flex", flexDirection: "column", gap: "20px", position: "sticky", top: "80px" },
  card: { background: "rgba(10,15,26,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "clamp(14px, 3vw, 24px)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", gap: "16px" },
  cardLabel: { fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", gap: "10px" },
  cardNum: { color: "rgba(0,245,255,0.4)" },
  tabBar: { display: "flex", gap: "4px", background: "rgba(255,255,255,0.02)", padding: "4px", borderRadius: "10px" },
  tabBtn: { flex: "1 1 auto", minWidth: "44px", padding: "8px 4px", border: "1px solid transparent", borderRadius: "7px", background: "transparent", color: "rgba(255,255,255,0.35)", fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.06em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", transition: "all 0.2s" },
  tabBtnActive: { background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)", color: "#00f5ff" },
  textarea: { width: "100%", minHeight: "200px", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", color: "#c8d3e0", fontFamily: "'Space Mono', monospace", fontSize: "12px", lineHeight: "1.75", resize: "vertical", outline: "none", transition: "border-color 0.2s" },
  optionsRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  checkLabel: { display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "rgba(255,255,255,0.35)", cursor: "pointer" },
  charCount: { fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "rgba(255,255,255,0.2)" },
  analyzeBtn: { width: "100%", padding: "13px", background: "rgba(0,245,255,0.07)", border: "1px solid rgba(0,245,255,0.25)", borderRadius: "10px", color: "#00f5ff", fontFamily: "'Space Mono', monospace", fontSize: "12px", letterSpacing: "0.12em", cursor: "pointer", transition: "all 0.2s" },
  analyzeBtnDisabled: { opacity: 0.28, cursor: "not-allowed", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.2)" },
  errorBox: { padding: "10px 14px", background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.2)", borderRadius: "8px", color: "#ff2d55", fontSize: "12px", display: "flex", gap: "8px" },
  emptyCard: { background: "rgba(10,15,26,0.85)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" },
  emptyHex: { fontSize: "48px", color: "rgba(0,245,255,0.2)", lineHeight: 1 },
  emptyTitle: { fontFamily: "'Space Mono', monospace", fontSize: "14px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginTop: "8px" },
  emptySub: { fontSize: "13px", color: "rgba(255,255,255,0.2)", maxWidth: "280px", lineHeight: "1.5" },
  emptyHints: { marginTop: "16px", display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-start" },
  emptyHint: { fontSize: "12px", color: "rgba(255,255,255,0.2)", display: "flex", gap: "8px" },
  emptyHintDot: { color: "rgba(0,245,255,0.3)" },
};