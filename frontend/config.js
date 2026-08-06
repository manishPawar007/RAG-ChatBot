// ============================================================
// DocuMind AI - Configuration
// Change API_BASE_URL if your FastAPI backend runs elsewhere.
// ============================================================
const CONFIG = {
  API_BASE_URL: "http://127.0.0.1:8000",

  ENDPOINTS: {
    HEALTH: "/health",
    UPLOAD: "/upload",
    CHAT: "/chat",
    DOCUMENTS: "/documents"
  },

  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: ["application/pdf"],
  REQUEST_TIMEOUT: 600000, // 10 min (PDF processing can be slow)
  THEME_KEY: "documind-theme",
  HEALTH_POLL_MS: 15000
};