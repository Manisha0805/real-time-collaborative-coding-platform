const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const codeRoutes = require("./routes/code.routes");
const userRoutes = require("./routes/user.routes");
const roomRoutes = require("./routes/room.routes");
const submissionRoutes = require("./routes/submission.routes");
const battleRoutes = require("./routes/battle.routes");
const aiRoutes = require("./routes/ai.routes");
const app = express();

// =========================
// Middlewares
// =========================

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// =========================
// Routes
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/code", codeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/battles", battleRoutes);
app.use("/api/ai", aiRoutes);
// =========================
// Health Check
// =========================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend Running...",
  });
});

// =========================
// 404 Handler
// =========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

// =========================
// Global Error Handler
// =========================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;