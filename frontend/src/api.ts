import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach the API key to every request.
// Set VITE_API_KEY in frontend/.env at deploy time — never hard-code it here.
api.interceptors.request.use((config) => {
  const key = import.meta.env.VITE_API_KEY || "";
  if (key) config.headers["X-API-Key"] = key;
  return config;
});

interface AnalyzeOptions {
  mask?: boolean;
  block_high_risk?: boolean;
  log_analysis?: boolean;
}

export const analyzeText = async (
  inputType: string,
  content: string,
  options: AnalyzeOptions = {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const { data } = await api.post("/analyze", {
    input_type: inputType,
    content,
    options: {
      mask: true,
      block_high_risk: false,
      log_analysis: true,
      ...options,
    },
  });
  return data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const analyzeFile = async (file: File, mask = true): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post(
    `/analyze/file?mask=${mask}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const healthCheck = async (): Promise<any> => {
  const { data } = await api.get("/health");
  return data;
};

// ── Scan History ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const listScans = async (limit = 20, offset = 0): Promise<any[]> => {
  const { data } = await api.get("/scans", { params: { limit, offset } });
  return data;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getScan = async (scanId: string): Promise<any> => {
  const { data } = await api.get(`/scans/${scanId}`);
  return data;
};

export default api;
