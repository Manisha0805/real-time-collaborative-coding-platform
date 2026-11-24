// Single place where deployment-specific URLs are resolved.
// Set VITE_API_URL (e.g. https://api.example.com/api) and, if the socket server lives
// elsewhere, VITE_SOCKET_URL (e.g. https://api.example.com) at BUILD time.
const strip = (u) => String(u || "").replace(/\/+$/, "");
const env = import.meta.env;

// No hostnames are hard-coded here. Local development values live in CLIENT/.env.development.
export const API_URL = strip(env.VITE_API_URL) || "/api";

export const SOCKET_URL =
  strip(env.VITE_SOCKET_URL) ||
  (env.VITE_API_URL ? strip(env.VITE_API_URL).replace(/\/api$/, "") : window.location.origin);

if (!env.VITE_API_URL && env.PROD) {
  console.warn(
    "VITE_API_URL is not set: API calls go to the same origin under /api. " +
      "Set VITE_API_URL at build time if the backend is deployed elsewhere."
  );
}
