require("dotenv").config();

const bool = (v, d = false) =>
  v === undefined || v === "" ? d : /^(1|true|yes|on)$/i.test(String(v).trim());

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const list = (v) =>
  String(v || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || "development";
const isProd = nodeEnv === "production";

const parseTrustProxy = (v) => {
  if (v === undefined || v === "") return isProd ? 1 : false;
  if (/^(false|0)$/i.test(v)) return false;
  if (/^true$/i.test(v)) return true;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : v;
};

const config = {
  nodeEnv,
  isProd,
  port: int(process.env.PORT, 5000),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),

  // CORS / Socket.IO origins. Comma separated. "*.example.com" wildcards allowed.
  clientUrls: list(process.env.CLIENT_URL || (isProd ? "" : "http://localhost:5173")),

  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",

  db: {
    url: process.env.DATABASE_URL || "",
    host: process.env.DB_HOST || "localhost",
    port: int(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "",
    ssl: bool(process.env.DB_SSL, false),
    sslRejectUnauthorized: bool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
    sslCa: process.env.DB_SSL_CA || "",
    connectRetries: int(process.env.DB_CONNECT_RETRIES, isProd ? 8 : 2),
    poolMax: int(process.env.DB_POOL_MAX, 10),
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: process.env.FIREBASE_PRIVATE_KEY || "",
    serviceAccountB64: process.env.FIREBASE_SERVICE_ACCOUNT_B64 || "",
  },

  ai: {
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    timeoutMs: int(process.env.AI_TIMEOUT_MS, 30000),
  },

  exec: {
    provider: (process.env.EXECUTION_PROVIDER || "docker").toLowerCase(),
    maxConcurrent: int(process.env.EXEC_MAX_CONCURRENT, 3),
    maxQueue: int(process.env.EXEC_MAX_QUEUE, 20),
    queueTimeoutMs: int(process.env.EXEC_QUEUE_TIMEOUT_MS, 20000),
    compileTimeoutSec: int(process.env.EXEC_COMPILE_TIMEOUT_SEC, 15),
    runTimeoutSec: int(process.env.EXEC_RUN_TIMEOUT_SEC, 5),
    memoryMb: int(process.env.EXEC_MEMORY_MB, 256),
    cpus: parseFloat(process.env.EXEC_CPUS || "1") || 1,
    maxOutputBytes: int(process.env.EXEC_MAX_OUTPUT_BYTES, 64 * 1024),
    maxCodeBytes: int(process.env.EXEC_MAX_CODE_BYTES, 64 * 1024),
    maxInputBytes: int(process.env.EXEC_MAX_INPUT_BYTES, 64 * 1024),
    dockerSocketPath: process.env.DOCKER_SOCKET_PATH || "",
    autoPullImages: bool(process.env.EXEC_AUTO_PULL, true),
    judge0Url: (process.env.JUDGE0_URL || "").replace(/\/+$/, ""),
    judge0AuthHeader: process.env.JUDGE0_AUTH_HEADER || "X-Auth-Token",
    judge0AuthToken: process.env.JUDGE0_AUTH_TOKEN || "",
    judge0ExtraHeaders: process.env.JUDGE0_EXTRA_HEADERS || "",
  },

  battleDurationSec: int(process.env.BATTLE_DURATION_SECONDS, 1800),
};

function validate() {
  const errors = [];
  const warnings = [];

  if (!config.jwtSecret) errors.push("JWT_SECRET is required.");
  else if (config.isProd && config.jwtSecret.length < 32)
    errors.push("JWT_SECRET must be at least 32 characters in production.");

  if (!config.db.url && !(config.db.user && config.db.name))
    errors.push("Database not configured: set DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD/DB_NAME.");

  if (config.isProd && !config.db.url && /^(localhost|127\.0\.0\.1)$/.test(config.db.host))
    warnings.push("DB_HOST is localhost while NODE_ENV=production (use your hosted MySQL host).");

  if (config.isProd && config.clientUrls.length === 0)
    errors.push("CLIENT_URL is required in production (your deployed frontend origin).");
  if (config.isProd && config.clientUrls.some((u) => /localhost|127\.0\.0\.1/.test(u)))
    warnings.push("CLIENT_URL contains localhost while NODE_ENV=production.");

  if (!["docker", "judge0"].includes(config.exec.provider))
    errors.push('EXECUTION_PROVIDER must be "docker" or "judge0".');
  if (config.exec.provider === "judge0") {
    if (!config.exec.judge0Url) errors.push("JUDGE0_URL is required when EXECUTION_PROVIDER=judge0.");
    else if (config.isProd && /localhost|127\.0\.0\.1/.test(config.exec.judge0Url))
      errors.push("JUDGE0_URL must not point to localhost in production.");
    if (config.isProd && !config.exec.judge0AuthToken && !config.exec.judge0ExtraHeaders)
      warnings.push("JUDGE0_AUTH_TOKEN is empty: an unauthenticated Judge0 lets anyone run code.");
  }

  if (!config.ai.apiKey) warnings.push("GEMINI_API_KEY not set: AI Review is disabled.");
  const fb = config.firebase;
  if (!fb.serviceAccountB64 && !(fb.projectId && fb.clientEmail && fb.privateKey))
    warnings.push("Firebase Admin not configured: Google sign-in is disabled.");

  return { errors, warnings };
}

// "*.vercel.app" style wildcard support
function isOriginAllowed(origin) {
  if (!origin) return true; // non-browser clients / same-origin
  const clean = origin.replace(/\/+$/, "");
  return config.clientUrls.some((allowed) => {
    if (allowed === "*") return true;
    if (allowed.includes("*")) {
      const re = new RegExp(
        "^" + allowed.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[a-z0-9-]+") + "$",
        "i"
      );
      return re.test(clean);
    }
    return allowed.toLowerCase() === clean.toLowerCase();
  });
}

module.exports = { config, validate, isOriginAllowed };
