/**
 * Backend API manzili.
 *
 * - Bo'sh bo'lsa (local dev yoki backend frontend bilan bitta domenda):
 *   nisbiy `/api/...` ishlatiladi.
 * - Backend alohida serverda (Railway/Render) bo'lsa, Vercel'da
 *   `VITE_API_BASE=https://<app>.up.railway.app` env var'ini o'rnating.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

/** API endpoint uchun to'liq URL qaytaradi. */
export function apiUrl(path) {
  return `${API_BASE}${path}`;
}
