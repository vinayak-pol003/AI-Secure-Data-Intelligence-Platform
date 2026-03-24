import { useState, useRef, useCallback } from "react";
import type { CSSProperties } from "react";

const ACCEPTED_TYPES = [".log", ".txt", ".pdf", ".doc", ".docx"];

const TYPE_ICONS = {
  log: "📋",
  txt: "📄",
  pdf: "📕",
  doc: "📘",
  docx: "📘",
};

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  loading: boolean;
}

export default function FileUpload({ onFileSelect, loading }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = (file: File) => {
    setError("");
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!ACCEPTED_TYPES.includes(`.${ext}`)) {
      setError(`Unsupported file type: .${ext}. Accepted: ${ACCEPTED_TYPES.join(", ")}`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSelect(file);
  }, []);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) validateAndSelect(e.target.files[0]); };

  const ext = (selectedFile?.name.split(".").pop() ?? "").toLowerCase();
  const icon = ext ? (TYPE_ICONS[ext as keyof typeof TYPE_ICONS] ?? "📄") : null;

  return (
    <div style={styles.wrapper}>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        style={{ display: "none" }}
        onChange={onInputChange}
      />

      <div
        style={{
          ...styles.dropzone,
          ...(dragging ? styles.dropzoneDragging : {}),
          ...(selectedFile ? styles.dropzoneHasFile : {}),
          ...(loading ? styles.dropzoneLoading : {}),
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !loading && fileRef.current?.click()}
      >
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner}>⟳</div>
            <span style={styles.loadingText}>Analyzing {selectedFile?.name}...</span>
          </div>
        ) : selectedFile ? (
          <div style={styles.fileSelected}>
            <span style={styles.fileIcon}>{icon}</span>
            <div style={styles.fileInfo}>
              <span style={styles.fileName}>{selectedFile.name}</span>
              <span style={styles.fileSize}>
                {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
              </span>
            </div>
            <div style={styles.fileCheck}>✓</div>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.uploadIcon}>
              <span style={styles.uploadArrow}>↑</span>
            </div>
            <div style={styles.uploadTitle}>Drop your file here</div>
            <div style={styles.uploadSub}>or click to browse</div>
            <div style={styles.typePills}>
              {ACCEPTED_TYPES.map((t) => (
                <span key={t} style={styles.typePill}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={styles.errorMsg}>
          <span>⚠</span> {error}
        </div>
      )}

      <div style={styles.hint}>Max file size: 10MB</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: { display: "flex", flexDirection: "column", gap: "8px" },
  dropzone: {
    minHeight: "200px",
    border: "1.5px dashed rgba(0,245,255,0.15)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.25s ease",
    background: "rgba(0,245,255,0.02)",
    position: "relative",
    overflow: "hidden",
  },
  dropzoneDragging: {
    border: "1.5px dashed rgba(0,245,255,0.6)",
    background: "rgba(0,245,255,0.06)",
    transform: "scale(1.01)",
  },
  dropzoneHasFile: {
    border: "1.5px solid rgba(0,245,255,0.2)",
    background: "rgba(0,245,255,0.03)",
    minHeight: "80px",
  },
  dropzoneLoading: {
    cursor: "not-allowed",
    opacity: 0.7,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "32px",
  },
  uploadIcon: {
    width: "52px", height: "52px",
    border: "1.5px solid rgba(0,245,255,0.2)",
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: "4px",
  },
  uploadArrow: { fontSize: "22px", color: "rgba(0,245,255,0.5)" },
  uploadTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "13px", color: "rgba(255,255,255,0.6)",
    letterSpacing: "0.05em",
  },
  uploadSub: { fontSize: "12px", color: "rgba(255,255,255,0.25)" },
  typePills: { display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center", marginTop: "4px" },
  typePill: {
    padding: "3px 8px",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "4px",
    fontFamily: "'Space Mono', monospace",
    fontSize: "10px",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: "0.05em",
  },
  fileSelected: {
    display: "flex", alignItems: "center", gap: "14px",
    padding: "16px 20px", width: "100%",
  },
  fileIcon: { fontSize: "28px" },
  fileInfo: { display: "flex", flexDirection: "column", gap: "3px", flex: 1 },
  fileName: { fontSize: "14px", color: "rgba(255,255,255,0.8)", fontWeight: 500 },
  fileSize: { fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" },
  fileCheck: {
    width: "28px", height: "28px",
    borderRadius: "50%",
    background: "rgba(48,209,88,0.15)",
    border: "1px solid rgba(48,209,88,0.3)",
    color: "#30d158",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "14px",
  },
  loadingState: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
  },
  spinner: {
    fontSize: "28px", color: "#00f5ff",
    animation: "spin 1s linear infinite",
    display: "inline-block",
  },
  loadingText: {
    fontFamily: "'Space Mono', monospace",
    fontSize: "12px", color: "rgba(0,245,255,0.6)", letterSpacing: "0.05em",
  },
  errorMsg: {
    padding: "10px 14px",
    background: "rgba(255,45,85,0.08)",
    border: "1px solid rgba(255,45,85,0.2)",
    borderRadius: "8px",
    color: "#ff2d55", fontSize: "12px",
    display: "flex", gap: "8px", alignItems: "center",
  },
  hint: {
    fontSize: "11px", color: "rgba(255,255,255,0.2)",
    fontFamily: "'Space Mono', monospace", textAlign: "right",
  },
};