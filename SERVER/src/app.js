const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { config, isOriginAllowed } = require("./config/env");
const { sequelize } = require("./config/database");

const authRoutes = require("./routes/auth.routes");
const codeRoutes = require("./routes/code.routes");
const userRoutes = require("./routes/user.routes");
const roomRoutes = require("./routes/room.routes");
const submissionRoutes = require("./routes/submission.routes");
const battleRoutes = require("./routes/battle.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

// Correct client IPs (for rate limiting) when running behind Render/Railway/nginx/Caddy
app.set("trust proxy", config.trustProxy);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => cb(null, isOriginAllowed(origin)), // not allowed => no CORS headers (browser blocks it)
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/battles", battleRoutes);
app.use("/api/ai", aiRoutes);

app.get("/", (req, res) => res.status(200).json({ success: true, message: "Backend Running..." }));

// Liveness + database check (use as the platform health-check URL)
app.get("/health", async (req, res) => {
  try {
    await sequelize.query("SELECT 1");
    res.status(200).json({ success: true, status: "ok", db: "up" });
  } catch {
    res.status(503).json({ success: false, status: "degraded", db: "down" });
  }
});

app.use((req, res) => res.status(404).json({ success: false, message: "Route Not Found" }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ success: false, message: "Invalid JSON body" });
  if (err.type === "entity.too.large") return res.status(413).json({ success: false, message: "Request body too large" });
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && config.isProd ? "Internal Server Error" : err.message || "Internal Server Error",
  });
});

module.exports = app;
