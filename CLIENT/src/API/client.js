import axios from "axios";
import { API_URL } from "../config";

// ---- session helpers (same localStorage keys the app always used) ----
export const getToken = () => {
  try { return localStorage.getItem("token"); } catch { return null; }
};

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
};

export const clearSession = () => {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch { /* storage unavailable */ }
};

// Reads the JWT expiry locally (no network). Signature is verified by the server.
export const isTokenValid = (token = getToken()) => {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

// ---- shared axios instance ----
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = String(error.config?.url || "");
    // Expired / invalid session on a protected call -> back to login
    if (error.response?.status === 401 && !url.startsWith("/auth/")) {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

/** Best human-readable message from an axios error. */
export const apiErrorMessage = (error, fallback = "Something went wrong.") =>
  error.response?.data?.message ||
  (error.request && !error.response ? "Cannot reach the server. Check your connection and try again." : fallback);

export default api;
