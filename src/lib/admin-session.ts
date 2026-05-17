import { ADMIN_SESSION_KEY } from "./constants";
export type AdminCreds = { username: string; password: string };
export const saveAdmin = (c: AdminCreds) => localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(c));
export const loadAdmin = (): AdminCreds | null => {
  if (typeof window === "undefined") return null;
  try { const s = localStorage.getItem(ADMIN_SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
};
export const clearAdmin = () => localStorage.removeItem(ADMIN_SESSION_KEY);
