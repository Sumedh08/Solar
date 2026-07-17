/**
 * Single API base for Solar.ai backend (Python FastAPI + LangGraph).
 * Override with VITE_API_URL in .env for production.
 */
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : "https://solar-ai-ml.onrender.com");

export const endpoints = {
  calculate: `${API_BASE}/api/calculator/calculate`,
  predict: `${API_BASE}/api/prediction/generate`,
  predictCustom: `${API_BASE}/api/prediction/custom`,
  detect: `${API_BASE}/api/maintenance/detect`,
  agent: `${API_BASE}/api/agent`,
  chat: `${API_BASE}/api/chat`,
};
