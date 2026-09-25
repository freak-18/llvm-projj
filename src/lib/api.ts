/**
 * ObfusShield API Client
 *
 * Thin axios wrapper that:
 *  - Reads VITE_API_URL from environment (defaults to http://localhost:4000)
 *  - Attaches the JWT token from localStorage to every request
 *  - Throws normalised { error: string } on non-2xx responses
 */
import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 120_000,
  headers: { "Content-Type": "application/json" },
});

// ── Attach JWT ────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("obfus_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Normalise errors ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("obfus_token");
      localStorage.removeItem("obfus_user");
      window.location.href = "/auth";
    }
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      "Request failed";
    return Promise.reject(new Error(message));
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  plan: string;
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function register(email: string, password: string, fullName?: string): Promise<{ token: string; user: AuthUser }> {
  const { data } = await api.post("/auth/register", { email, password, fullName });
  return data;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await api.get("/auth/me");
  return data;
}

// ── Projects ──────────────────────────────────────────────────────────────
export interface Project {
  _id: string;
  name: string;
  description?: string;
  language: string;
  protectionProfile: string;
  status: string;
  securityScore?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SourceFileInfo {
  _id: string;
  filename: string;
  sizeBytes: number;
  language?: string;
}

export interface SensitiveFunction {
  name: string;
  riskScore: number;
  category: string;
  reason: string;
  recommendedTechniques: string[];
}

export interface AnalysisReport {
  _id: string;
  summary?: string;
  overallRisk?: string;
  sensitiveFunctions: SensitiveFunction[];
  recommendations: string[];
  metrics: {
    complexityIncreasePct?: number;
    entropyIncreasePct?: number;
    reverseEngineeringResistance?: number;
    tamperResistance?: number;
    protectionCoverage?: number;
    securityScore?: number;
    cfgGrowthPct?: number;
  };
  analysisSource: string;
  createdAt: string;
}

export interface ObfuscationJob {
  _id: string;
  status: string;
  protectionProfile: string;
  appliedPasses: string[];
  metrics?: {
    complexityIncrease?: number;
    cfgGrowthPct?: number;
    entropyIncrease?: number;
    stringProtection?: number;
    protectedFunctions?: number;
    securityScore?: number;
  };
  durationMs?: number;
  createdAt: string;
}

export async function createProject(payload: {
  name: string;
  description?: string;
  language: string;
  protectionProfile: string;
  files: { filename: string; content: string }[];
}): Promise<{ id: string; name: string; status: string }> {
  const { data } = await api.post("/project/create", payload);
  return data;
}

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get("/project/list");
  return data;
}

export interface ProjectDetail {
  project: Project;
  files: SourceFileInfo[];
  analyses: AnalysisReport[];
  metrics: Record<string, number> | null;
  jobs: ObfuscationJob[];
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const { data } = await api.get(`/project/${id}`);
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/project/${id}`);
}

// ── Analysis ──────────────────────────────────────────────────────────────
export async function analyzeProject(projectId: string): Promise<AnalysisReport> {
  const { data } = await api.post("/analyze", { projectId });
  return data;
}

// ── Obfuscation ───────────────────────────────────────────────────────────
export async function obfuscateProject(projectId: string): Promise<ObfuscationJob> {
  const { data } = await api.post("/obfuscate", { projectId });
  return data;
}

// ── Metrics ───────────────────────────────────────────────────────────────
export async function getMetrics(projectId: string) {
  const { data } = await api.get(`/metrics/${projectId}`);
  return data;
}

// ── Downloads ─────────────────────────────────────────────────────────────
export function getDownloadUrl(id: string, type: "report" | "binary" = "report"): string {
  const token = localStorage.getItem("obfus_token") || "";
  return `${API_URL}/api/download/${id}?type=${type}&token=${encodeURIComponent(token)}`;
}
