/**
 * Auth state helpers — wraps the JWT-based Node.js auth flow.
 * Stores token + user in localStorage so the session persists across refreshes.
 */
import { login as apiLogin, register as apiRegister, getMe, type AuthUser } from "./api";

const TOKEN_KEY = "obfus_token";
const USER_KEY = "obfus_user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const { token, user } = await apiLogin(email, password);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function signUp(email: string, password: string, fullName?: string): Promise<AuthUser> {
  const { token, user } = await apiRegister(email, password, fullName);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function refreshUser(): Promise<AuthUser | null> {
  if (!getStoredToken()) return null;
  try {
    const user = await getMe();
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    clearAuth();
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}
